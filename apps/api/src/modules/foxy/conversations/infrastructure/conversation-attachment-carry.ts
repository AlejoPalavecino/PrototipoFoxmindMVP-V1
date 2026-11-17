import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { CarryFoxyAttachments } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';
import { DOCUMENT_MAX_BYTES } from '../../../../../../../src/core/domain/documents/document-formats.ts';

function attachmentError(code: string): never { throw Object.assign(new Error(code), { code }); }

// The caller holds the owner's write lock and creates the destination in this transaction.
export async function carryFoxyAttachments(tx: SqlTransaction, owner: string, destination: string, carry: CarryFoxyAttachments) {
  const [source] = await tx.query<{ revision: bigint }>(`SELECT c.revision FROM foxy_conversations c
    WHERE c.id=$1::uuid AND c.owner_id=$2::uuid AND c.deleted_at IS NULL AND
    (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id
      AND r.teacher_id=c.owner_id AND r.archived_at IS NULL FOR SHARE)) FOR SHARE OF c`, carry.sourceConversationId, owner);
  if (!source) return attachmentError('FORBIDDEN');
  if (String(source.revision) !== carry.sourceRevision) return attachmentError('CONFLICT');
  // Object locks serialize transfer with removal, upload completion and terminal cleanup claims.
  const rows = await tx.query<{ id: string; size_bytes: number }>(`SELECT a.id,a.size_bytes FROM chat_attachments a
    JOIN foxy_chat_attachment_links l ON l.attachment_id=a.id AND l.owner_id=a.owner_id
    WHERE l.conversation_id=$1::uuid AND l.owner_id=$2::uuid AND l.removed_at IS NULL AND a.id=ANY($3::uuid[])
      AND a.folder_id IS NULL AND a.ready_at IS NOT NULL AND a.cleanup_claimed_at IS NULL AND a.cleaned_at IS NULL
    ORDER BY a.id FOR UPDATE OF a`, carry.sourceConversationId, owner, carry.attachmentIds);
  if (rows.length !== carry.attachmentIds.length) return attachmentError('CONFLICT');
  if (rows.reduce((sum, row) => sum + row.size_bytes, 0) > DOCUMENT_MAX_BYTES)
    return attachmentError('QUOTA_EXCEEDED');
  await tx.query(`INSERT INTO foxy_chat_attachment_links(conversation_id,attachment_id,owner_id)
    SELECT $1::uuid,id,$2::uuid FROM unnest($3::uuid[]) AS id RETURNING attachment_id`, destination, owner, carry.attachmentIds);
}
