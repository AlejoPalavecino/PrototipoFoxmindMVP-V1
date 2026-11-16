import { activeAiOwnersSql, lockAiAdmission, noAiWorkForOwner } from '../../../../platform/ai/admission.ts';
import { randomUUID } from 'node:crypto';
import { transaction } from './database.ts';
import { recoverGenerationBatch } from './generation-recovery.ts';
import type { ClassroomAiOptions, JobRow } from './contracts.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import { configurationForJob } from '../../../../platform/ai/execution-snapshot.ts';

export function claim(options: ClassroomAiOptions): Promise<JobRow | null> {
  return transaction(options, async tx => {
    await lockAiAdmission(tx);
    await recoverGenerationBatch(tx, options.configuration, 'classroom_curriculum_extractions');
    const [active] = await tx.query<{ count: number }>(`SELECT count(*)::int AS count
      FROM (${activeAiOwnersSql}) running`);
    if (active!.count >= options.configuration.maxConcurrency) return null;
    const [next] = await tx.query<JobRow>(`SELECT q.* FROM classroom_curriculum_extractions q
      WHERE q.state='QUEUED' AND q.next_attempt_at<=clock_timestamp()
      AND ${noAiWorkForOwner('q', 'generation')}
      AND NOT EXISTS(SELECT 1 FROM activity_ai_generations a WHERE a.state='QUEUED' AND a.next_attempt_at<=clock_timestamp()
        AND (a.created_at,a.id)<(q.created_at,q.id)
        AND ${noAiWorkForOwner('a', 'generation-priority')})
      ORDER BY q.created_at,q.id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    if (!next) return null;
    let deadlineMs = options.configuration.deadlineMs;
    try { deadlineMs = configurationForJob(options.configuration, next.execution_profile, 'curriculum').deadlineMs; }
    catch { /* Claim invalid metadata only so the worker can close it without dispatch. */ }
    const [row] = await tx.query<JobRow>(`UPDATE classroom_curriculum_extractions SET state='RUNNING',
      lease_nonce=$2::uuid,lease_until=clock_timestamp()+$3::bigint*interval '1 millisecond',
      updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *`, next.id, randomUUID(),
    deadlineMs + 10000);
    return row!;
  });
}
export async function fenced(tx: Transaction, row: JobRow, maximumAge: number, lock = true): Promise<JobRow | null> {
  const [current] = await tx.query<JobRow>(`SELECT *,
    created_at+$3::bigint*interval '1 millisecond'<=clock_timestamp() AS expired
    FROM classroom_curriculum_extractions WHERE id=$1::uuid AND lease_nonce=$2::uuid
    AND state='RUNNING' AND lease_until>clock_timestamp() ${lock ? 'FOR UPDATE' : ''}`, row.id, row.lease_nonce, maximumAge);
  return current ?? null;
}
