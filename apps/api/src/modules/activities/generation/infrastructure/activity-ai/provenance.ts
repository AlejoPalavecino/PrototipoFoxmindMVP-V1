import type { Transaction } from '../../../../classrooms/public.ts';
import { fail } from '../../../../classrooms/public.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';
import { revalidate } from './source.ts';

export async function validateActivityGeneration(options: Pick<ActivityAiOptions, 'reader'>, tx: Transaction, request: unknown, activityId: string): Promise<void> {
  const [row] = await tx.query<JobRow>('SELECT * FROM activity_ai_generations WHERE applied_activity_id=$1::uuid FOR UPDATE', activityId);
  if (row && (row.state !== 'APPLIED' || !await revalidate(options, tx, request, row))) return fail('CONFLICT');
}
