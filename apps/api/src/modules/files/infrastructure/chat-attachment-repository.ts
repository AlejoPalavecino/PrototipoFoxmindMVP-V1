import { createHash } from 'node:crypto';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { ChatAttachmentScope } from '../../../../../../src/core/contracts/chat-attachments.ts';
import type { ChatAttachmentSource } from '../../../../../../src/core/domain/foxy/grounding.ts';
import { parseActivityDocument } from './activity-document.ts';
import { attachmentError } from './chat-attachment-policy.ts';
import type { ObjectStorage } from './storage.ts';

export type AttachmentRow = {
  id: string; owner_id: string; folder_id: string | null; conversation_id: string;
  name: string; extension: 'pdf' | 'docx'; size_bytes: number; digest: string; save_to_folder: boolean;
  ready_at: Date | null; removed_at: Date | null; cleaned_at: Date | null; created_at: Date;
};
export const attachmentKey = (id: string) => `p4/${id}/chat-attachment`;
export const attachmentDigest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export const publicAttachment = (row: AttachmentRow) => ({
  id: row.id, name: row.name, sizeBytes: row.size_bytes, savedToFolder: row.save_to_folder,
});

export function readyAttachments(tx: SqlTransaction, scope: ChatAttachmentScope) {
  return tx.query<AttachmentRow>(`SELECT * FROM chat_attachments
    WHERE owner_id=$1::uuid AND conversation_id=$2::uuid AND folder_id IS NOT DISTINCT FROM $3::uuid
      AND ready_at IS NOT NULL AND removed_at IS NULL ORDER BY created_at,id`,
  scope.ownerId, scope.conversationId, scope.folderId ?? null);
}

export async function attachmentSources(tx: SqlTransaction, scope: ChatAttachmentScope): Promise<ChatAttachmentSource[]> {
  return (await readyAttachments(tx, scope)).map(row => ({
    fileId: row.id, title: row.name, extension: row.extension, sizeBytes: row.size_bytes, digest: row.digest,
  }));
}

export async function parseAttachment(bytes: Buffer, extension: ChatAttachmentSource['extension'], signal: AbortSignal) {
  const parsed = await parseActivityDocument(bytes, extension, signal);
  if (parsed.document.kind === 'text' && !parsed.document.text.trim()) attachmentError('FILE_NOT_READY');
  return parsed;
}

export async function readAttachment(storage: ObjectStorage, source: ChatAttachmentSource, signal: AbortSignal) {
  signal.throwIfAborted();
  const bytes = await storage.get(attachmentKey(source.fileId), source.sizeBytes);
  if (bytes.length !== source.sizeBytes || attachmentDigest(bytes) !== source.digest) attachmentError('FILE_NOT_READY');
  return { fileId: source.fileId, digest: source.digest, ...await parseAttachment(bytes, source.extension, signal) };
}
