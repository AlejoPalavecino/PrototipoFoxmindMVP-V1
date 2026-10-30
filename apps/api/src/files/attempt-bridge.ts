import type { IncomingMessage } from 'node:http';
import { assertAttemptWrite, editorCapability, ClassroomError } from '../classrooms/index.ts';
import type { AttemptWriteAuthorizer } from './access.ts';
import type { FileTransaction, FileTarget } from './contracts.ts';
import { FileError } from './errors.ts';
import type { FileRow } from './store.ts';

export async function attachmentSlots(tx: FileTransaction, attemptId: string, excludeFileId: string | null = null): Promise<number> {
  // Selected references may point to an earlier immutable custody when T5 prefills another attempt.
  // Completed but deliberately unselected files are not active reservations.
  const [row] = await tx.query<{ count: bigint }>(`SELECT (
    (SELECT count(*) FROM attempt_attachments WHERE attempt_id=$1::uuid AND file_id IS DISTINCT FROM $2::uuid)
    +(SELECT count(*) FROM file_custodies c JOIN uploads u ON u.file_id=c.file_id
      WHERE c.target_id=$1::uuid AND c.purpose='attachment' AND c.file_id IS DISTINCT FROM $2::uuid
      AND u.status NOT IN ('COMPLETED','CANCELLED','FAILED') AND u.reservation_released_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM attempt_attachments aa WHERE aa.attempt_id=$1::uuid AND aa.file_id=c.file_id)))::bigint AS count`,
  attemptId, excludeFileId);
  return Number(row.count);
}

async function fileBoundary<T>(run: () => Promise<T>): Promise<T> {
  try { return await run(); }
  catch (error) {
    if (error instanceof ClassroomError) throw new FileError(error.code === 'FORBIDDEN' ? 'FORBIDDEN'
      : error.code === 'INVALID_INPUT' ? 'INVALID_UPLOAD' : error.code === 'CONFLICT' ? 'UPLOAD_CONFLICT' : 'SERVICE_UNAVAILABLE');
    throw error;
  }
}

/** Transaction-only production bridge. No standalone admission, FileService or authoring import. */
export const authorizeAttemptFileWrite: AttemptWriteAuthorizer = (tx, userId, target, request) => fileBoundary(async () => {
  if (target.purpose !== 'attachment' || target.scope.kind !== 'classroom' || !target.targetId) throw new FileError('FORBIDDEN');
  const headers = (request as IncomingMessage).headers;
  const editor = editorCapability(headers?.['x-attempt-editor'], headers?.['x-attempt-epoch']);
  // Revision is intentionally not a file permission: an unrelated confirmed answer/upload must not revoke this editor.
  const context = await assertAttemptWrite(tx, userId, target.scope.id, target.targetId, editor);
  if (context.attempt.activity_type !== 'ASSIGNMENT') throw new FileError('FORBIDDEN');
  if (target.fileId) {
    const [upload] = await tx.query<{ status: string; phase: string }>(`SELECT u.status::text,c.phase FROM uploads u
      JOIN file_custodies c ON c.file_id=u.file_id WHERE u.file_id=$1::uuid FOR UPDATE OF u,c`, target.fileId);
    if (!upload || ['CANCELLED','FAILED'].includes(upload.status) || ['deleting','deleted','rejected'].includes(upload.phase))
      throw new FileError('UPLOAD_CONFLICT');
  }
  if (await attachmentSlots(tx, target.targetId, target.fileId ?? null) >= 5) throw new FileError('UPLOAD_CONFLICT');
});

/** Called only for an actual successful ready transition, in that exact security/scan transaction. */
export async function linkReadyAttemptAttachment(tx: FileTransaction, request: unknown, row: FileRow): Promise<void> {
  if (row.purpose !== 'attachment') return;
  return fileBoundary(async () => {
    const target: FileTarget = { scope: { kind: 'classroom', id: row.classroom_id! }, purpose: 'attachment', targetId: row.target_id, fileId: row.id };
    await authorizeAttemptFileWrite(tx, row.uploaded_by_id, target, request);
    const [attempt] = await tx.query<{ activity_id: string }>('SELECT activity_id FROM attempts WHERE id=$1::uuid FOR UPDATE', row.target_id);
    const added = await tx.query(`INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position)
      SELECT $1::uuid,$2::uuid,$3::uuid,$4::uuid,COALESCE(MAX(position)+1,0) FROM attempt_attachments WHERE attempt_id=$1::uuid
      ON CONFLICT(attempt_id,file_id) DO NOTHING RETURNING file_id`, row.target_id, attempt.activity_id, row.classroom_id, row.id);
    if (added.length) await tx.query(`UPDATE attempts SET revision=revision+1,updated_at=clock_timestamp()
      WHERE id=$1::uuid RETURNING id`, row.target_id);
  });
}
