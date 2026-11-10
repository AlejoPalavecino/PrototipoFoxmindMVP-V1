import { fail } from '../../../classrooms/public.ts';
import { draft, owner } from './database.ts';
import { fenced } from './queue.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import type { ClassroomAiOptions, JobRow, PlanGrant } from './contracts.ts';

export async function businessSource(tx: Transaction, row: JobRow): Promise<boolean> {
  try {
    await owner(tx, row.owner_id);
    const current = await draft(tx, row.owner_id, row.draft_id);
    return !current.published_classroom_id && current.payload.planFileId === row.file_id;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'FORBIDDEN') return false;
    throw error;
  }
}
export async function checkSource(tx: Transaction, options: ClassroomAiOptions, row: JobRow,
  grant: PlanGrant, signal: AbortSignal): Promise<boolean> {
  if (!await businessSource(tx, row)) return false;
  try {
    const source = options.reader.snapshotWorker
      ? await options.reader.snapshotWorker(tx, grant, signal)
      : await options.reader.snapshot(tx, grant, row.draft_id, row.file_id);
    return source.fileId === row.file_id && source.digest === row.source_digest;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error
      && ['FORBIDDEN', 'CONFLICT', 'FILE_NOT_READY'].includes(String(error.code))) return false;
    throw error;
  }
}
export async function requireGrant(tx: Transaction, options: ClassroomAiOptions, row: JobRow | undefined, signal: AbortSignal): Promise<void> {
  if (signal.aborted || !row || !await businessSource(tx, row)) return fail('FORBIDDEN');
  const current = await fenced(tx, row, options.configuration.maxJobAgeMs, false);
  if (!current || current.expired) return fail('FORBIDDEN');
}
