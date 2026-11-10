import { fail } from '../../../classrooms/public.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import type { ClassroomAiOptions, DraftRow, JobRow } from './contracts.ts';
import type { ExtractionView } from '../../../../../../../src/core/domain/index.ts';
import { settle } from './budget.ts';

export async function snapshot(options: ClassroomAiOptions, tx: Transaction, request: unknown,
  current: DraftRow, fileId: string) {
  if (current.published_classroom_id || current.payload.planFileId !== fileId) return fail('CONFLICT');
  return options.reader.snapshot(tx, request, current.id, fileId);
}
export async function revalidate(options: ClassroomAiOptions, tx: Transaction, request: unknown,
  current: DraftRow, row: JobRow): Promise<JobRow> {
  let valid = !current.published_classroom_id && current.payload.planFileId === row.file_id;
  if (valid) {
    try { valid = (await options.reader.snapshot(tx, request, current.id, row.file_id)).digest === row.source_digest; }
    catch (error) {
      if (!error || typeof error !== 'object' || !('code' in error)
        || !['FILE_NOT_READY', 'FORBIDDEN', 'CONFLICT'].includes(String(error.code))) throw error;
      valid = false;
    }
  }
  const [locked] = await tx.query<JobRow>('SELECT * FROM classroom_curriculum_extractions WHERE id=$1::uuid FOR UPDATE', row.id);
  if (valid || locked!.state === 'STALE') return locked!;
  await settle(tx, locked!, options.configuration);
  const [stale] = await tx.query<JobRow>(`UPDATE classroom_curriculum_extractions SET state='STALE',
    lease_nonce=NULL,lease_until=NULL,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *`, row.id);
  return stale!;
}
export function view(row: JobRow): ExtractionView {
  return { id: row.id, draftId: row.draft_id, planFileId: row.file_id, baseRevision: String(row.base_revision),
    state: row.state, proposal: row.state === 'READY' || row.state === 'APPLIED' ? row.proposal : null,
    error: row.error_code, retryable: row.state === 'FAILED' && ['AI_UNAVAILABLE', 'AI_RATE_LIMITED',
      'AI_TIMEOUT', 'PROVIDER_OUTCOME_UNKNOWN', 'AI_BUDGET_EXCEEDED'].includes(row.error_code ?? '') };
}
