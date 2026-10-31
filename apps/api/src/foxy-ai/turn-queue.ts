import { randomUUID } from 'node:crypto';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';

type Configuration = { maxConcurrency: number; deadlineMs: number; maxJobAgeMs: number };
type Options = { database: SqlDatabase; configuration: Configuration };
export interface FoxyTurnLease { turnId: string; ownerId: string; conversationId: string; leaseNonce: string }
type Row = { id: string; owner_id: string; conversation_id: string };
const eligible = `c.owner_id=t.owner_id AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
  AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id AND r.archived_at IS NULL))`;
const running = `SELECT owner_id FROM foxy_turns WHERE state='RUNNING'
  UNION ALL SELECT owner_id FROM classroom_curriculum_extractions WHERE state='RUNNING' AND lease_until>clock_timestamp()
  UNION ALL SELECT owner_id FROM activity_ai_generations WHERE state='RUNNING' AND lease_until>clock_timestamp()
  UNION ALL SELECT owner_id FROM student_ai_reports WHERE state='RUNNING' AND lease_until>clock_timestamp()
  UNION ALL SELECT owner_id FROM grading_ai_jobs WHERE state='RUNNING' AND lease_until>clock_timestamp()`;
async function recover(tx: SqlTransaction, maxJobAgeMs: number): Promise<number> {
  const leases = await tx.query<{ id: string; dispatch_started_at: Date | null }>(`SELECT id,dispatch_started_at FROM foxy_turns
    WHERE state='RUNNING' AND lease_until<=clock_timestamp() ORDER BY lease_until,id LIMIT 50 FOR UPDATE SKIP LOCKED`);
  for (const row of leases) await tx.query(`UPDATE foxy_turns SET state=$2,error_code=$3,lease_nonce=NULL,lease_until=NULL,
    updated_at=clock_timestamp() WHERE id=$1::uuid`, row.id, row.dispatch_started_at ? 'FAILED' : 'QUEUED',
  row.dispatch_started_at ? 'PROVIDER_OUTCOME_UNKNOWN' : null);
  const queued = await tx.query<{ id: string }>(`SELECT id FROM foxy_turns WHERE state='QUEUED'
    AND created_at+$1::bigint*interval '1 millisecond'<=clock_timestamp()
    ORDER BY created_at,id LIMIT 50 FOR UPDATE SKIP LOCKED`, maxJobAgeMs);
  for (const row of queued) await tx.query(`UPDATE foxy_turns SET state='FAILED',error_code='AI_TIMEOUT',
    updated_at=clock_timestamp() WHERE id=$1::uuid`, row.id);
  return leases.length + queued.length;
}
export function createFoxyTurnQueue(options: Options) {
  const transact = <T>(fn: (tx: SqlTransaction) => Promise<T>): Promise<T> => options.database.$transaction(
    raw => fn({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 6000 });
  async function claim(): Promise<FoxyTurnLease | null> {
    return transact(async tx => {
      await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123002)');
      await recover(tx, options.configuration.maxJobAgeMs);
      const [active] = await tx.query<{ count: number }>(`SELECT count(*)::int AS count FROM (${running}) jobs`);
      if (!active || active.count >= options.configuration.maxConcurrency) return null;
      const [row] = await tx.query<Row>(`SELECT t.id,t.owner_id,t.conversation_id FROM foxy_turns t
        JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id JOIN users u ON u.id=t.owner_id
        WHERE t.state='QUEUED' AND ${eligible}
        AND t.created_at+$1::bigint*interval '1 millisecond'>clock_timestamp()
        AND NOT EXISTS (SELECT 1 FROM (${running}) jobs WHERE jobs.owner_id=t.owner_id)
        ORDER BY t.created_at,t.id LIMIT 1 FOR UPDATE OF t SKIP LOCKED`, options.configuration.maxJobAgeMs);
      if (!row) return null;
      const nonce = randomUUID();
      const [updated] = await tx.query<Row>(`UPDATE foxy_turns SET state='RUNNING',lease_nonce=$2::uuid,
        lease_until=clock_timestamp()+$3::bigint*interval '1 millisecond',updated_at=clock_timestamp()
        WHERE id=$1::uuid AND state='QUEUED' RETURNING id,owner_id,conversation_id`, row.id, nonce, options.configuration.deadlineMs + 10000);
      return updated ? { turnId: updated.id, ownerId: updated.owner_id, conversationId: updated.conversation_id, leaseNonce: nonce } : null;
    });
  }
  async function current(lease: FoxyTurnLease): Promise<boolean> {
    return transact(async tx => {
      const rows = await tx.query(`SELECT t.id FROM foxy_turns t JOIN foxy_conversations c ON c.id=t.conversation_id
        JOIN users u ON u.id=t.owner_id WHERE t.id=$1::uuid AND t.owner_id=$2::uuid AND t.conversation_id=$3::uuid
        AND t.lease_nonce=$4::uuid AND t.state='RUNNING' AND t.lease_until>clock_timestamp() AND ${eligible}`,
      lease.turnId, lease.ownerId, lease.conversationId, lease.leaseNonce);
      return rows.length === 1;
    });
  }
  async function recoverExpired(): Promise<number> {
    return transact(async tx => {
      await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123002)');
      return recover(tx, options.configuration.maxJobAgeMs);
    });
  }
  return { claim, current, recoverExpired };
}
