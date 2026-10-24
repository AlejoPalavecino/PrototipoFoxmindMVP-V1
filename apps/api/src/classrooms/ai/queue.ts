import { randomUUID } from 'node:crypto';
import { transaction } from './database.ts';
import { settle } from './budget.ts';
import type { ClassroomAiOptions, JobRow } from './contracts.ts';
import type { Transaction } from '../contracts.ts';

async function recover(tx: Transaction, options: ClassroomAiOptions): Promise<void> {
  const rows = await tx.query<JobRow>(`SELECT * FROM classroom_curriculum_extractions WHERE state='RUNNING'
    AND lease_until<=clock_timestamp() FOR UPDATE SKIP LOCKED`);
  for (const row of rows) {
    await settle(tx, row, options.configuration);
    await tx.query(`UPDATE classroom_curriculum_extractions SET state=$2,error_code=$3,lease_nonce=NULL,
      lease_until=NULL,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, row.id,
    row.dispatch_started_at ? 'FAILED' : 'QUEUED', row.dispatch_started_at ? 'PROVIDER_OUTCOME_UNKNOWN' : null);
  }
}
export function claim(options: ClassroomAiOptions): Promise<JobRow | null> {
  return transaction(options, async tx => {
    await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123002)');
    await recover(tx, options);
    const [active] = await tx.query<{ count: number }>(`SELECT count(*)::int AS count
      FROM classroom_curriculum_extractions WHERE state='RUNNING' AND lease_until>clock_timestamp()`);
    if (active!.count >= options.configuration.maxConcurrency) return null;
    const [next] = await tx.query<JobRow>(`SELECT q.* FROM classroom_curriculum_extractions q
      WHERE q.state='QUEUED' AND q.next_attempt_at<=clock_timestamp()
      AND NOT EXISTS(SELECT 1 FROM classroom_curriculum_extractions r WHERE r.owner_id=q.owner_id AND r.state='RUNNING')
      ORDER BY q.created_at,q.id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    if (!next) return null;
    const [row] = await tx.query<JobRow>(`UPDATE classroom_curriculum_extractions SET state='RUNNING',
      lease_nonce=$2::uuid,lease_until=clock_timestamp()+$3::bigint*interval '1 millisecond',
      updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *`, next.id, randomUUID(),
    options.configuration.deadlineMs + 10000);
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
