import { randomUUID } from 'node:crypto';
import type { Transaction } from '../../../classrooms/public.ts';

export interface SubmittedAttempt { classroomId: string; activityId: string; attemptId: string }
interface EnqueueContext { teacher_id: string; ai_grading_enabled: boolean; ai_grading_rubric: string; ai_grading_epoch: bigint }

/** Invoked within the transaction that transitions the attempt to SUBMITTED. */
export async function enqueueSubmittedAttemptGradingAi(tx: Transaction, input: SubmittedAttempt, available = true): Promise<boolean> {
  if (!available) return false;
  const [context] = await tx.query<EnqueueContext>(`SELECT c.teacher_id,c.ai_grading_enabled,c.ai_grading_epoch,a.ai_grading_rubric
    FROM classrooms c JOIN activities a ON a.classroom_id=c.id
    JOIN attempts t ON t.activity_id=a.id
    WHERE c.id=$1::uuid AND a.id=$2::uuid AND t.id=$3::uuid AND t.status='SUBMITTED'
    FOR SHARE OF c,a,t`, input.classroomId, input.activityId, input.attemptId);
  if (!context?.ai_grading_enabled) return false;
  const inserted = await tx.query<{ id: string }>(`INSERT INTO grading_ai_jobs
    (id,classroom_id,activity_id,attempt_id,owner_id,rubric_snapshot,epoch)
    VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7::bigint)
    ON CONFLICT (attempt_id) WHERE origin='AUTO' DO NOTHING RETURNING id`,
  randomUUID(), input.classroomId, input.activityId, input.attemptId, context.teacher_id,
  context.ai_grading_rubric, context.ai_grading_epoch ?? 0n);
  return inserted.length === 1;
}
