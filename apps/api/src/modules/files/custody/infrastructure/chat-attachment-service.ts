import type { SqlDatabase, SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { ChatAttachmentScope } from '../../../../../../../src/core/contracts/chat-attachments.ts';
import { CHAT_ATTACHMENT_BYTES, CHAT_ATTACHMENT_COUNT, attachmentError, type parseChatAttachmentIntent } from '../../chat-attachments/public.ts';
import { legacyOffice } from './legacy-office.ts';
import { attachmentDigest, attachmentKey, parseAttachment, publicAttachment, readyAttachments, type AttachmentRow } from './chat-attachment-repository.ts';
import type { ObjectStorage } from './storage.ts';
import { STUDY_MATERIAL_LIMIT } from '../../../../../../../src/core/domain/study/folders.ts';

type Target = Omit<ChatAttachmentScope, 'ownerId'>;
type Authenticate = (tx: SqlTransaction, request: unknown, write: boolean) => Promise<string>;
type Options = {
  database: SqlDatabase; storage: ObjectStorage;
  teacher: Authenticate; student: Authenticate; folderQuota?: bigint;
  inspect: (bytes: Buffer, extension: string) => Promise<string>; scan: (bytes: Buffer) => Promise<unknown>;
};
type Intent = ReturnType<typeof parseChatAttachmentIntent>;
const quota = 250_000_000n;

async function checkScope(tx: SqlTransaction, scope: ChatAttachmentScope, write: boolean) {
  if (scope.folderId) {
    const [folder] = await tx.query<{ status: string }>(`SELECT status FROM study_folders f
      WHERE id=$1::uuid AND owner_id=$2::uuid AND status<>'DELETED'
      AND EXISTS (SELECT 1 FROM jsonb_array_elements(f.state->'conversations') c WHERE c->>'id'=$3)
      ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, scope.folderId, scope.ownerId, scope.conversationId);
    if (!folder || write && folder.status !== 'ACTIVE') attachmentError('FORBIDDEN');
    return;
  }
  const [chat] = await tx.query(`SELECT c.id FROM foxy_conversations c WHERE c.id=$1::uuid AND c.owner_id=$2::uuid
    AND c.deleted_at IS NULL AND (c.context_kind='GENERAL' OR EXISTS (
      SELECT 1 FROM classrooms a WHERE a.id=c.classroom_id AND a.teacher_id=c.owner_id
      AND (NOT $3::boolean OR a.archived_at IS NULL) FOR SHARE))
    FOR SHARE OF c`, scope.conversationId, scope.ownerId, write);
  if (!chat) attachmentError('FORBIDDEN');
}

async function checkCopyCapacity(tx: SqlTransaction, ownerId: string, folderId: string, bytes: number, limit: bigint) {
  const [capacity] = await tx.query<{ used: bigint; count: number }>(`SELECT
    (SELECT COALESCE(sum(size_bytes),0)::bigint FROM study_folder_uploads WHERE owner_id=$1::uuid) AS used,
    jsonb_array_length(state->'materials') AS count FROM study_folders WHERE id=$2::uuid AND owner_id=$1::uuid`, ownerId, folderId);
  if (!capacity || capacity.count >= STUDY_MATERIAL_LIMIT || capacity.used + BigInt(bytes) > limit) attachmentError('QUOTA_EXCEEDED');
}

async function copyIntoFolder(tx: SqlTransaction, row: AttachmentRow, mime: string, limit: bigint) {
  await checkCopyCapacity(tx, row.owner_id, row.folder_id!, row.size_bytes, limit);
  await tx.query(`INSERT INTO study_folder_uploads (id,folder_id,owner_id,purpose,original_name,extension,
    size_bytes,storage_key,phase,mime,digest,validated_digest,scanned_digest)
    VALUES($1::uuid,$2::uuid,$3::uuid,'material',$4,$5,$6,$7,'READY',$8,$9,$9,$9) RETURNING id`,
  row.id, row.folder_id, row.owner_id, row.name, row.extension, row.size_bytes, attachmentKey(row.id), mime, row.digest);
  const material = JSON.stringify([{ id: row.id, fileId: row.id, title: row.name, topicIds: [] }]);
  const [updated] = await tx.query(`UPDATE study_folders SET
    state=jsonb_set(state,'{materials}',(state->'materials') || $3::jsonb),revision=revision+1,updated_at=clock_timestamp()
    WHERE id=$1::uuid AND owner_id=$2::uuid AND jsonb_array_length(state->'materials')<$4
    AND octet_length(jsonb_set(state,'{materials}',(state->'materials') || $3::jsonb)::text)<=3000000 RETURNING id`,
  row.folder_id, row.owner_id, material, STUDY_MATERIAL_LIMIT);
  if (!updated) attachmentError('QUOTA_EXCEEDED');
}

export function createChatAttachmentService(options: Options) {
  const transaction = <T>(fn: (tx: SqlTransaction) => Promise<T>, timeout = 6000) => options.database.$transaction(
    raw => fn({ query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) }), { maxWait: 2000, timeout });
  async function scoped<T>(request: unknown, target: Target, write: boolean,
    fn: (tx: SqlTransaction, scope: ChatAttachmentScope) => Promise<T>, timeout?: number) {
    return transaction(async tx => {
      const authenticate = target.folderId ? options.student : options.teacher;
      const ownerId = await authenticate(tx, request, write);
      const [owner] = await tx.query(`SELECT id FROM users WHERE id=$1::uuid AND email_verified_at IS NOT NULL
        AND account_role=$2 ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, ownerId, target.folderId ? 'student' : 'teacher');
      if (!owner || await authenticate(tx, request, write) !== ownerId) attachmentError('FORBIDDEN');
      const scope = { ...target, ownerId };
      await checkScope(tx, scope, write);
      const result = await fn(tx, scope);
      if (await authenticate(tx, request, write) !== ownerId) attachmentError('FORBIDDEN');
      return result;
    }, timeout);
  }
  async function lookup(tx: SqlTransaction, id: string, scope: ChatAttachmentScope, lock = false) {
    if (!scope.folderId) {
      const [row] = await tx.query<AttachmentRow>(`SELECT a.*,l.removed_at FROM chat_attachments a
        JOIN foxy_chat_attachment_links l ON l.attachment_id=a.id AND l.owner_id=a.owner_id
        WHERE a.id=$1::uuid AND a.owner_id=$2::uuid AND l.conversation_id=$3::uuid AND a.folder_id IS NULL
        ${lock ? 'FOR UPDATE OF a' : ''}`, id, scope.ownerId, scope.conversationId);
      return row;
    }
    const [row] = await tx.query<AttachmentRow>(`SELECT * FROM chat_attachments WHERE id=$1::uuid
      AND owner_id=$2::uuid AND conversation_id=$3::uuid AND folder_id IS NOT DISTINCT FROM $4::uuid
      ${lock ? 'FOR UPDATE' : ''}`,
    id, scope.ownerId, scope.conversationId, scope.folderId ?? null);
    return row;
  }

  return {
    authorize: (request: unknown, target: Target, write: boolean) => scoped(request, target, write, async () => {}),
    list: (request: unknown, target: Target) => scoped(request, target, false, async (tx, scope) =>
      (await readyAttachments(tx, scope)).map(publicAttachment)),
    async read(request: unknown, target: Target, id: string) {
      const resolve = () => scoped(request, target, false, async (tx, scope) => {
        const row = await lookup(tx, id, scope);
        if (!row?.ready_at || row.removed_at || row.cleanup_claimed_at || row.cleaned_at) return attachmentError('FORBIDDEN');
        return row;
      });
      const before = await resolve();
      const bytes = await options.storage.get(attachmentKey(id), before.size_bytes);
      if (bytes.length !== before.size_bytes || attachmentDigest(bytes) !== before.digest) return attachmentError('FILE_NOT_READY');
      const after = await resolve();
      if (before.digest !== after.digest || before.size_bytes !== after.size_bytes) return attachmentError('FILE_NOT_READY');
      return { bytes, name: after.name, extension: after.extension };
    },
    async upload(request: unknown, target: Target, id: string, intent: Intent, bytes: Buffer) {
      if (!bytes.length || bytes.length > CHAT_ATTACHMENT_BYTES || intent.copy && !target.folderId) attachmentError('INVALID_UPLOAD');
      const digest = attachmentDigest(bytes);
      const verifyRetry = (prior: AttachmentRow) => {
        if (prior.removed_at || prior.cleanup_claimed_at || prior.cleaned_at || prior.digest !== digest || prior.name !== intent.name || prior.save_to_folder !== intent.copy)
          return attachmentError('CONFLICT');
        return prior;
      };
      const existing = await scoped(request, target, true, (tx, scope) => lookup(tx, id, scope));
      if (existing && verifyRetry(existing).ready_at) return publicAttachment(existing);
      const mime = await options.inspect(bytes, intent.extension);
      await options.scan(bytes);
      await parseAttachment(bytes, intent.extension, AbortSignal.timeout(legacyOffice(intent.extension) ? 18_000 : 5000));
      const reserved = await scoped(request, target, true, async (tx, scope) => {
        const prior = await lookup(tx, id, scope);
        if (prior) return verifyRetry(prior);
        if (intent.copy) await checkCopyCapacity(tx, scope.ownerId, scope.folderId!, bytes.length, options.folderQuota ?? quota);
        const [usage] = await tx.query<{ total: bigint; count: number; chat: bigint }>(scope.folderId ? `SELECT
          COALESCE(sum(size_bytes),0)::bigint AS total,
          count(*) FILTER (WHERE conversation_id=$2::uuid AND folder_id IS NOT DISTINCT FROM $3::uuid AND removed_at IS NULL)::int AS count,
          COALESCE(sum(size_bytes) FILTER (WHERE conversation_id=$2::uuid AND folder_id IS NOT DISTINCT FROM $3::uuid AND removed_at IS NULL),0)::bigint AS chat
          FROM chat_attachments WHERE owner_id=$1::uuid AND cleaned_at IS NULL` : `SELECT
          (SELECT COALESCE(sum(size_bytes),0)::bigint FROM chat_attachments WHERE owner_id=$1::uuid AND cleaned_at IS NULL) AS total,
          count(*)::int AS count,COALESCE(sum(a.size_bytes),0)::bigint AS chat
          FROM foxy_chat_attachment_links l JOIN chat_attachments a ON a.id=l.attachment_id AND a.owner_id=l.owner_id
          WHERE l.owner_id=$1::uuid AND l.conversation_id=$2::uuid AND l.removed_at IS NULL
            AND a.cleaned_at IS NULL AND a.cleanup_claimed_at IS NULL AND a.folder_id IS NOT DISTINCT FROM $3::uuid`, scope.ownerId, scope.conversationId, scope.folderId ?? null);
        if (usage.total + BigInt(bytes.length) > quota || usage.count >= CHAT_ATTACHMENT_COUNT
          || usage.chat + BigInt(bytes.length) > BigInt(CHAT_ATTACHMENT_BYTES)) attachmentError('QUOTA_EXCEEDED');
        const [row] = await tx.query<AttachmentRow>(`INSERT INTO chat_attachments
          (id,owner_id,conversation_id,folder_id,name,extension,size_bytes,digest,save_to_folder)
          VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9) ON CONFLICT(id) DO NOTHING RETURNING *`,
        id, scope.ownerId, scope.conversationId, scope.folderId ?? null, intent.name, intent.extension, bytes.length, digest, intent.copy);
        if (!row) return attachmentError('CONFLICT');
        if (!scope.folderId) await tx.query(`INSERT INTO foxy_chat_attachment_links(conversation_id,attachment_id,owner_id)
          VALUES($1::uuid,$2::uuid,$3::uuid) RETURNING attachment_id`, scope.conversationId, id, scope.ownerId);
        return row;
      });
      if (reserved.ready_at) return publicAttachment(reserved);
      // The write runs outside any transaction: a slow object store must not hold a pooled
      // connection or the owner's row lock. The object stays unreachable until READY below.
      const key = attachmentKey(id);
      try { await options.storage.put(key, bytes); }
      catch (error) {
        if ((error as { code?: string }).code !== 'UPLOAD_CONFLICT') throw error;
        const stored = await options.storage.get(key, bytes.length);
        if (attachmentDigest(stored) !== digest) attachmentError('CONFLICT');
      }
      let orphaned = false;
      try { return await scoped(request, target, true, async (tx, scope) => {
        // Serialize the READY transition against revocation and the sweeper.
        const row = await lookup(tx, id, scope, true);
        // A revoked or swept reservation never becomes READY, so nothing else can reference
        // these bytes; the sweeper may have removed the key before this write landed.
        orphaned = Boolean(row && !row.ready_at && (row.removed_at || row.cleanup_claimed_at || row.cleaned_at));
        if (!row || row.removed_at || row.cleanup_claimed_at || row.cleaned_at || row.digest !== digest) return attachmentError('CONFLICT');
        if (row.ready_at) return publicAttachment(row);
        if (intent.copy) await copyIntoFolder(tx, row, mime, options.folderQuota ?? quota);
        await tx.query('UPDATE chat_attachments SET ready_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', id);
        return publicAttachment(row);
      }); } catch (error) {
        if (orphaned) await options.storage.remove(key).catch(() => undefined);
        if ((error as { code?: string }).code === 'QUOTA_EXCEEDED') {
          await scoped(request, target, true, async (tx, scope) => {
            const row = await lookup(tx, id, scope, true);
            if (row && !row.ready_at && !row.removed_at) await tx.query(
              'UPDATE chat_attachments SET removed_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', id);
          }).catch(() => undefined);
        }
        throw error;
      }
    },
    async remove(request: unknown, target: Target, id: string) {
      await scoped(request, target, true, async (tx, scope) => {
        const row = await lookup(tx, id, scope, true);
        if (!row || !row.ready_at) return attachmentError('FORBIDDEN');
        if (scope.folderId) await tx.query('UPDATE chat_attachments SET removed_at=COALESCE(removed_at,clock_timestamp()) WHERE id=$1::uuid RETURNING id', id);
        else await tx.query(`UPDATE foxy_chat_attachment_links SET removed_at=COALESCE(removed_at,clock_timestamp())
          WHERE attachment_id=$1::uuid AND conversation_id=$2::uuid AND owner_id=$3::uuid RETURNING attachment_id`, id, scope.conversationId, scope.ownerId);
      });
    },
    async cleanup() {
      const eligible = `a.cleaned_at IS NULL AND (a.cleanup_claimed_at IS NOT NULL OR
          (a.folder_id IS NOT NULL AND a.removed_at IS NOT NULL AND (a.ready_at IS NOT NULL OR a.removed_at<clock_timestamp()-interval '1 minute'))
          OR (a.ready_at IS NULL AND a.created_at<clock_timestamp()-interval '24 hours')
          OR (a.ready_at IS NOT NULL AND a.folder_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM study_folders f WHERE f.id=a.folder_id AND f.status='DELETED'))
          OR (a.ready_at IS NOT NULL AND a.folder_id IS NULL AND NOT EXISTS (
            SELECT 1 FROM foxy_chat_attachment_links l JOIN foxy_conversations c ON c.id=l.conversation_id AND c.owner_id=l.owner_id
            WHERE l.attachment_id=a.id AND l.owner_id=a.owner_id AND l.removed_at IS NULL AND c.deleted_at IS NULL)))`;
      const rows = await transaction(async tx => {
        const candidates = await tx.query<{ id: string }>(`SELECT a.id FROM chat_attachments a WHERE ${eligible}
          ORDER BY a.created_at LIMIT 10 FOR UPDATE OF a SKIP LOCKED`);
        if (!candidates.length) return [];
        // Recheck using a fresh READ COMMITTED snapshot after acquiring object locks: a carry
        // may have committed after the first SELECT's snapshot and before its row lock.
        return tx.query<{ id: string; copied: boolean }>(`UPDATE chat_attachments a
          SET cleanup_claimed_at=COALESCE(a.cleanup_claimed_at,clock_timestamp())
          WHERE a.id=ANY($1::uuid[]) AND ${eligible}
          RETURNING a.id,EXISTS(SELECT 1 FROM study_folder_uploads u WHERE u.id=a.id) AS copied`, candidates.map(row => row.id));
      });
      for (const row of rows) {
        try {
          if (!row.copied) await options.storage.remove(attachmentKey(row.id));
          await transaction(tx => tx.query('UPDATE chat_attachments SET cleaned_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', row.id));
        } catch { /* The tombstone remains eligible for the next sweep. */ }
      }
    },
  };
}
