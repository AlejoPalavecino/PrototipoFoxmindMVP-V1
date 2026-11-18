import type { SqlTransaction } from '../../../../../src/core/contracts/sql.ts';
import type { AiMonthlyQuotaRejection, AiQuotaSnapshot } from '../../../../../src/core/contracts/ai-quota.ts';

export interface MonthlyBudgetJob {
  namespace: string;
  jobId: string;
  ownerId: string;
}

export interface MonthlyBudgetMetadata {
  capability: string;
  provider: string;
  model: string;
  pricing: {
    inputUsdPerMillion: number;
    outputUsdPerMillion: number;
    textOutputUsdPerMillion?: number;
    imageOutputUsdPerMillion?: number;
    profileVersion?: string;
  };
}

export type MonthlyBudgetSnapshot = Omit<AiQuotaSnapshot, 'subjectId'>;

const zone = "'America/Argentina/Buenos_Aires'";
const active = "('RESERVED', 'PENDING')";
const actorLock = '78123003,hashtext(($1::uuid)::text)';

/** Serializes budget changes for one actor with no dependence on the AI queue locks. */
async function lockActor(tx: SqlTransaction, ownerId: string) {
  await tx.query(`SELECT 1 FROM pg_advisory_xact_lock(${actorLock})`, ownerId);
}

async function accountPeriod(tx: SqlTransaction, ownerId: string) {
  const [account] = await tx.query<{ month: string; starts_at: Date; ends_at: Date; observed_at: Date; budget: number }>(
    `WITH observed AS (SELECT statement_timestamp() AS observed_at),
     period AS (SELECT observed_at, date_trunc('month', observed_at AT TIME ZONE ${zone}) AS start FROM observed)
     SELECT start::date::text AS month, start AT TIME ZONE ${zone} AS starts_at,
       (start + interval '1 month') AT TIME ZONE ${zone} AS ends_at, observed_at,
       CASE account_role WHEN 'teacher' THEN 5000000 WHEN 'student' THEN 3000000 END AS budget
     FROM period, users WHERE users.id=$1::uuid`, ownerId);
  if (!account?.budget) throw Object.assign(new Error('ACCOUNT_NOT_FOUND'), { code: 'ACCOUNT_NOT_FOUND' });
  return account;
}

async function expireLockedActorReservations(tx: SqlTransaction, ownerId: string) {
  await tx.query(`WITH expired AS (
      UPDATE ai_monthly_reservations SET status='EXPIRED', platform_microusd=reserved_microusd
      WHERE owner_id=$1::uuid AND status IN ${active} AND expires_at<=statement_timestamp()
      RETURNING namespace,job_id,owner_id,reserved_microusd
    )
    INSERT INTO ai_monthly_budget_movements(namespace,job_id,owner_id,event,
      reserved_delta_microusd,actor_delta_microusd,platform_delta_microusd)
    SELECT namespace,job_id,owner_id,'EXPIRED',-reserved_microusd,0,reserved_microusd FROM expired
    RETURNING id`, ownerId);
}

interface ExpiryCursor { expires_at: string; namespace: string; job_id: string }

/** Move past busy accounts so that other accounts still expire during the same pass. */
export async function sweepAiMonthlyBudget(tx: SqlTransaction, after: ExpiryCursor | null, limit = 100): Promise<ExpiryCursor | null> {
  const [{ locked }] = await tx.query<{ locked: boolean }>('SELECT pg_try_advisory_xact_lock(78123005) AS locked');
  if (!locked) return after;
  const due = await tx.query<ExpiryCursor & { owner_id: string }>(`SELECT expires_at::text AS expires_at,namespace,job_id,owner_id
    FROM ai_monthly_reservations WHERE status IN ${active} AND expires_at<=statement_timestamp()
      AND (expires_at,namespace,job_id)>($1::timestamptz,$2::text,$3::uuid)
    ORDER BY ai_monthly_reservations.expires_at,namespace,job_id LIMIT $4::int`,
  after?.expires_at ?? '-infinity', after?.namespace ?? '', after?.job_id ?? '00000000-0000-0000-0000-000000000000', limit);
  for (const owner of new Set(due.map(row => row.owner_id))) {
    const [{ locked }] = await tx.query<{ locked: boolean }>(`SELECT pg_try_advisory_xact_lock(${actorLock}) AS locked`, owner);
    if (locked) await expireLockedActorReservations(tx, owner);
  }
  return due.length === limit ? due.at(-1)! : null;
}

async function toolTotals(tx: SqlTransaction, ownerId: string, month: string) {
  return tx.query<{ capability: string; consumed: bigint; reserved: bigint; charged_operations: bigint; reserved_operations: bigint }>(
    `SELECT capability, sum(actor_microusd)::bigint AS consumed,
      coalesce(sum(reserved_microusd) FILTER (WHERE status IN ${active}),0)::bigint AS reserved,
      count(*) FILTER (WHERE actor_microusd>0) AS charged_operations,
      count(*) FILTER (WHERE status IN ${active}) AS reserved_operations
    FROM ai_monthly_reservations WHERE owner_id=$1::uuid AND period_start=$2::date
    GROUP BY capability HAVING sum(actor_microusd)>0 OR count(*) FILTER (WHERE status IN ${active})>0
    ORDER BY capability`, ownerId, month);
}

type SnapshotIdentity = Pick<MonthlyBudgetSnapshot, 'periodStart' | 'version'>;
export function readAiMonthlyBudget(tx: SqlTransaction, ownerId: string): Promise<MonthlyBudgetSnapshot>;
export function readAiMonthlyBudget(tx: SqlTransaction, ownerId: string, previous: SnapshotIdentity): Promise<MonthlyBudgetSnapshot | null>;
export async function readAiMonthlyBudget(tx: SqlTransaction, ownerId: string, previous?: SnapshotIdentity): Promise<MonthlyBudgetSnapshot | null> {
  if (previous) {
    const [probe] = await tx.query<{ starts_at: Date; version: bigint; due: boolean }>(`SELECT
      date_trunc('month',statement_timestamp() AT TIME ZONE ${zone}) AT TIME ZONE ${zone} AS starts_at,
      coalesce((SELECT id FROM ai_monthly_budget_movements WHERE owner_id=$1::uuid ORDER BY id DESC LIMIT 1),0) AS version,
      EXISTS(SELECT 1 FROM ai_monthly_reservations WHERE owner_id=$1::uuid AND status IN ${active}
        AND expires_at<=statement_timestamp()) AS due`, ownerId);
    if (!probe.due && probe.starts_at.toISOString() === previous.periodStart && Number(probe.version) === previous.version) return null;
  }
  await lockActor(tx, ownerId);
  await expireLockedActorReservations(tx, ownerId);
  const account = await accountPeriod(tx, ownerId);
  const rows = await toolTotals(tx, ownerId, account.month);
  const tools = rows.map(row => ({
    capability: row.capability, consumedMicrousd: Number(row.consumed), reservedMicrousd: Number(row.reserved),
    chargedOperations: Number(row.charged_operations), reservedOperations: Number(row.reserved_operations),
  }));
  const { consumedMicrousd, reservedMicrousd } = tools.reduce((total, item) => ({
    consumedMicrousd: total.consumedMicrousd + item.consumedMicrousd,
    reservedMicrousd: total.reservedMicrousd + item.reservedMicrousd,
  }), { consumedMicrousd: 0, reservedMicrousd: 0 });
  const [movement] = await tx.query<{ id: bigint }>(
    'SELECT id FROM ai_monthly_budget_movements WHERE owner_id=$1::uuid ORDER BY id DESC LIMIT 1', ownerId);
  return {
    limitMicrousd: account.budget, consumedMicrousd, reservedMicrousd, remainingMicrousd: account.budget - consumedMicrousd - reservedMicrousd,
    periodStart: account.starts_at.toISOString(), renewsAt: account.ends_at.toISOString(), version: Number(movement?.id ?? 0),
    tools,
  };
}

export async function reserveAiMonthlyBudget(tx: SqlTransaction, job: MonthlyBudgetJob, amount: bigint,
  metadata: MonthlyBudgetMetadata): Promise<boolean> {
  if (amount <= 0n) throw new Error('INVALID_MONTHLY_BUDGET_AMOUNT');
  await lockActor(tx, job.ownerId);
  await expireLockedActorReservations(tx, job.ownerId);
  const account = await accountPeriod(tx, job.ownerId);
  const rows = await toolTotals(tx, job.ownerId, account.month);
  const used = rows.reduce((sum, row) => sum + BigInt(row.consumed) + BigInt(row.reserved), 0n);
  const available = BigInt(account.budget) - used;
  if (amount > available) {
    const existing = await tx.query(`SELECT 1 FROM ai_monthly_reservations
      WHERE namespace=$1 AND job_id=$2::uuid AND owner_id=$3::uuid`, job.namespace, job.jobId, job.ownerId);
    if (existing.length) return false;
    const required = Number(amount);
    const quota: AiMonthlyQuotaRejection | undefined = Number.isSafeInteger(required) ? {
      availableMicrousd: Math.max(0, Number(available)), requiredMicrousd: required, renewsAt: account.ends_at.toISOString(),
    } : undefined;
    throw Object.assign(new Error('AI_MONTHLY_BUDGET_EXCEEDED'), { code: 'AI_MONTHLY_BUDGET_EXCEEDED', quota });
  }
  const inserted = await tx.query(`WITH reserved AS (
      INSERT INTO ai_monthly_reservations(namespace,job_id,owner_id,period_start,capability,provider,model,reserved_at,
        expires_at,reserved_microusd,pricing,operational_day,status)
      VALUES($1,$2::uuid,$3::uuid,$4::date,$5,$6,$7,$8::timestamptz,$8::timestamptz + interval '24 hours',$9::bigint,$10::jsonb,
        (transaction_timestamp() AT TIME ZONE 'UTC')::date,'RESERVED')
      ON CONFLICT(namespace,job_id) DO NOTHING RETURNING namespace,job_id,owner_id,reserved_microusd
    )
    INSERT INTO ai_monthly_budget_movements(namespace,job_id,owner_id,event,reserved_delta_microusd,actor_delta_microusd,platform_delta_microusd)
    SELECT namespace,job_id,owner_id,'RESERVED',reserved_microusd,0,0 FROM reserved RETURNING id`,
  job.namespace, job.jobId, job.ownerId, account.month, metadata.capability, metadata.provider, metadata.model, account.observed_at, amount.toString(),
  JSON.stringify(metadata.pricing));
  return inserted.length === 1;
}

/** Null records missing usage. A late known result updates only platform exposure after expiry. */
export async function settleAiMonthlyBudget(tx: SqlTransaction, job: MonthlyBudgetJob, actual: bigint | null): Promise<{
  quote: bigint; reservedAt: Date;
} | null> {
  if (actual !== null && actual < 0n) throw new Error('INVALID_MONTHLY_BUDGET_AMOUNT');
  await lockActor(tx, job.ownerId);
  await expireLockedActorReservations(tx, job.ownerId);
  const [prior] = await tx.query<{ status: string; reserved_microusd: bigint; platform_microusd: bigint; reserved_at: Date }>(
    `SELECT status,reserved_microusd,platform_microusd,reserved_at FROM ai_monthly_reservations
    WHERE namespace=$1 AND job_id=$2::uuid AND owner_id=$3::uuid`, job.namespace, job.jobId, job.ownerId);
  if (!prior || prior.status === 'SETTLED' || prior.status === 'RECONCILED') return null;
  if (actual === null && prior.status !== 'RESERVED') return null;
  const quote = BigInt(prior.reserved_microusd);
  const released = prior.status === 'EXPIRED';
  const event = actual === null ? 'PENDING' : released ? 'RECONCILED' : 'SETTLED';
  const actor = actual === null || released ? 0n : actual < quote ? actual : quote;
  const platform = actual === null ? 0n : actual - actor;
  const reservedDelta = actual === null || released ? 0n : -quote;
  const platformDelta = platform - BigInt(prior.platform_microusd);
  await tx.query(`WITH updated AS (
     UPDATE ai_monthly_reservations SET status=$4,actor_microusd=$5::bigint,platform_microusd=$6::bigint
     WHERE namespace=$1 AND job_id=$2::uuid AND owner_id=$3::uuid RETURNING namespace,job_id,owner_id
   )
   INSERT INTO ai_monthly_budget_movements(namespace,job_id,owner_id,event,reserved_delta_microusd,actor_delta_microusd,platform_delta_microusd)
   SELECT namespace,job_id,owner_id,$4,$7::bigint,$5::bigint,$8::bigint FROM updated RETURNING id`,
  job.namespace, job.jobId, job.ownerId, event, actor.toString(), platform.toString(), reservedDelta.toString(), platformDelta.toString());
  return actual === null ? null : { quote, reservedAt: prior.reserved_at };
}
