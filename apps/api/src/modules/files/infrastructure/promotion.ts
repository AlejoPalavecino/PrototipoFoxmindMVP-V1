import { FileError } from '../domain/errors.ts';
import { uuid, type FileStore } from './store.ts';
import { requireReady } from '../domain/readiness.ts';
import type { FileTransaction } from '../application/contracts.ts';

/** Domain publication calls this inside its own transaction after setting published_classroom_id.
 * Lock order: verified user -> destination classroom -> source draft -> file/custody. */
export async function promoteDraftPlan(store: FileStore, tx: FileTransaction, request: unknown, id: string, classroomId: string): Promise<void> {
  if (!uuid(id) || !uuid(classroomId)) throw new FileError('INVALID_UPLOAD');
  const destination = { kind: 'classroom' as const, id: classroomId };
  const { userId, quota } = await store.authorize(tx, request, { scope: destination, purpose: 'plan', targetId: null }, 'upload');
  const row = await store.load(tx, id);
  if (row.uploaded_by_id !== userId || row.purpose !== 'plan' || row.target_id !== null) throw new FileError('FORBIDDEN');
  requireReady(row);
  if (row.classroom_id === classroomId && row.classroom_draft_id === null) return;
  if (row.classroom_id !== null || !row.classroom_draft_id) throw new FileError('FORBIDDEN');
  const draftId = row.classroom_draft_id;
  const source = await store.lockScope(tx, { kind: 'draft', id: draftId });
  const [draft] = await tx.query<{ published_classroom_id: string | null }>(
    'SELECT published_classroom_id FROM classroom_drafts WHERE id=$1::uuid', draftId);
  if (source.owner !== userId || draft?.published_classroom_id !== classroomId) throw new FileError('FORBIDDEN');
  const current = await store.load(tx, id);
  requireReady(current);
  if (current.classroom_draft_id !== draftId || current.classroom_id !== null) throw new FileError('UPLOAD_CONFLICT');
  if (await store.usage(tx, destination) + current.size_bytes > quota) throw new FileError('QUOTA_EXCEEDED');
  await tx.query(`UPDATE files SET classroom_id=$2::uuid,classroom_draft_id=NULL,updated_at=clock_timestamp()
    WHERE id=$1::uuid RETURNING id`, id, classroomId);
}
