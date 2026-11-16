import { isDeepStrictEqual } from 'node:util';
import { parseSendFoxyMessage } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { ChatAttachmentSource, FoxyGroundingSnapshot } from '../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import { rebuildGrounding, snapshotSelection } from './grounding-rebuild.ts';

type Row = { snapshot: FoxyGroundingSnapshot; context_kind: string; classroom_id: string | null };
export function forbidden(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
export async function refreshFoxyAttachmentSnapshot(tx: SqlTransaction, owner: string, conversation: string,
  snapshot: FoxyGroundingSnapshot, current: FoxyGroundingSnapshot) {
  if (!snapshot.attachments?.length) return;
  const ids = snapshot.attachments.map(source => source.fileId);
  current.attachments = await tx.query<ChatAttachmentSource>(`SELECT a.id AS "fileId",a.name AS title,a.extension,
    a.size_bytes AS "sizeBytes",a.digest FROM chat_attachments a JOIN foxy_chat_attachment_links l
      ON l.attachment_id=a.id AND l.owner_id=a.owner_id
    WHERE l.owner_id=$1::uuid AND l.conversation_id=$2::uuid AND l.removed_at IS NULL AND a.id=ANY($3::uuid[])
      AND a.folder_id IS NULL AND a.ready_at IS NOT NULL AND a.cleanup_claimed_at IS NULL AND a.cleaned_at IS NULL
    ORDER BY a.created_at,a.id`, owner, conversation, ids);
}
export async function checkClaimStatus(tx: SqlTransaction, lease: FoxyTurnLease, maxJobAgeMs: number) {
  const [row] = await tx.query<Row>(`SELECT t.snapshot,c.context_kind,c.classroom_id FROM foxy_turns t
    JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id JOIN users u ON u.id=t.owner_id
    WHERE t.id=$1::uuid AND t.owner_id=$2::uuid AND t.conversation_id=$3::uuid AND t.lease_nonce=$4::uuid
      AND t.state='RUNNING' AND t.lease_until>clock_timestamp() AND t.created_at+$5::bigint*interval '1 millisecond'>clock_timestamp()
      AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL`,
  lease.turnId, lease.ownerId, lease.conversationId, lease.leaseNonce, maxJobAgeMs);
  if (!row || !row.snapshot || !Array.isArray(row.snapshot.sources)) return forbidden();
  const expected = row.context_kind === 'GENERAL' && row.classroom_id === null ? { kind: 'GENERAL' as const }
    : row.context_kind === 'CLASSROOM' && row.classroom_id ? { kind: 'CLASSROOM' as const, classroomId: row.classroom_id } : forbidden();
  if (!isDeepStrictEqual(row.snapshot.context, expected)) return forbidden();
  if (expected.kind === 'CLASSROOM') {
    const [room] = await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL', expected.classroomId, lease.ownerId);
    if (!room) return forbidden();
  }
  try {
    const selection = snapshotSelection(row.snapshot);
    const checked = parseSendFoxyMessage({ requestId: '00000000-0000-0000-0000-000000000000', revision: '0',
      purpose: 'CHAT', text: 'context', selection }, expected).selection;
    const current = await rebuildGrounding(tx, expected, checked);
    await refreshFoxyAttachmentSnapshot(tx,lease.ownerId,lease.conversationId,row.snapshot,current);
    return { snapshot: row.snapshot, fresh: isDeepStrictEqual(current, row.snapshot) };
  } catch (error) {
    if (['INVALID_INPUT', 'FORBIDDEN', 'FILE_NOT_READY', 'AI_INPUT_LIMIT', 'CONFLICT', 'EMPTY_CONTENT']
      .includes(String((error as { code?: unknown })?.code))) return { snapshot: row.snapshot, fresh: false };
    throw error;
  }
}
export async function checkClaim(tx: SqlTransaction, lease: FoxyTurnLease, maxJobAgeMs: number): Promise<FoxyGroundingSnapshot> {
  const result = await checkClaimStatus(tx, lease, maxJobAgeMs);
  if (!result.fresh) return forbidden();
  return result.snapshot;
}
