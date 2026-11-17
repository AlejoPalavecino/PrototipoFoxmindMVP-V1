import type { Transaction } from '../../../../classrooms/public.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';
import { view } from './database.ts';
import { revalidate } from './source.ts';

export async function currentView(options: ActivityAiOptions, tx: Transaction, request: unknown, row: JobRow) {
  if (row.state === 'APPLIED' || row.state === 'STALE' || await revalidate(options, tx, request, row)) return view(row);
  // A running lease retains settlement ownership; hide stale content while it drains.
  if (row.state === 'RUNNING') return view({ ...row, state: 'STALE' });
  const [stale] = await tx.query<JobRow>(`UPDATE activity_ai_generations SET state='STALE',updated_at=clock_timestamp()
    WHERE id=$1::uuid RETURNING *`, row.id);
  return view(stale!);
}
