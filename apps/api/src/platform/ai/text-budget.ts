import type { SqlTransaction } from '../../../../../src/core/contracts/sql.ts';
import type { AiExecutionSettings, AiExecutionTask } from '../../../../../src/core/contracts/ai-execution.ts';
import { parseExecutionSnapshot } from './execution-snapshot.ts';
import { lockAiBudget } from './admission.ts';
import { aiOperationalDaySql } from './operational-day.ts';
import { reserveAiMonthlyBudget, settleAiMonthlyBudget, type MonthlyBudgetJob, type MonthlyBudgetMetadata } from './monthly-budget.ts';

type Transaction = SqlTransaction;
type ClassroomAiConfiguration = AiExecutionSettings & { maxOutputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
  model?: string } & DailyLimits;
type DailyLimits = { dailyBudgetUsd: number; dailyActorBudgetUsd?: number; dailyActorRequests: number; dailyGlobalRequests: number };
type BudgetJob = { id: string; owner_id: string };
export type BudgetTable = 'classroom_curriculum_extractions' | 'activity_ai_generations' | 'student_ai_reports' | 'teacher_writing_reports' | 'grading_ai_jobs' | 'foxy_turns' | 'foxy_visual_jobs' | 'study_ai_dispatches';
const tasks: Partial<Record<BudgetTable, AiExecutionTask>> = { classroom_curriculum_extractions: 'curriculum', activity_ai_generations: 'activities',
  student_ai_reports: 'analysis', teacher_writing_reports: 'analysis', grading_ai_jobs: 'grading', foxy_turns: 'foxy', study_ai_dispatches: 'study' };
function pinnedPrices(config: ClassroomAiConfiguration, table: BudgetTable, snapshot: unknown): ClassroomAiConfiguration {
  const task = tasks[table];
  if (!task) return config; // Visuales mantienen su contrato y snapshot de tarifas independiente.
  const saved = snapshot ?? config.legacyExecutionProfiles?.[task];
  if (saved === undefined || saved === null) return config;
  const profile = parseExecutionSnapshot(saved, task);
  return { ...config, executionProfile: profile, maxOutputTokens: profile.maxOutputTokens,
    inputUsdPerMillion: profile.inputUsdPerMillion, outputUsdPerMillion: profile.outputUsdPerMillion };
}

function decimal(value: number): [bigint, bigint] {
  const [mantissa, exponent = '0'] = String(value).split('e');
  const [whole, fraction = ''] = mantissa!.split('.');
  const scale = fraction.length - Number(exponent);
  return scale >= 0 ? [BigInt(whole! + fraction), 10n ** BigInt(scale)]
    : [BigInt(whole! + fraction) * 10n ** BigInt(-scale), 1n];
}
/** Default per-actor daily cap as a fraction (1/10) of the global cap, with a one-reservation floor, when AI_DAILY_ACTOR_BUDGET_USD is unset. */
export const DEFAULT_ACTOR_SHARE = 10n;
export function tokenCost(tokens: number, rate: number): bigint {
  const [numerator, denominator] = decimal(rate);
  return (BigInt(tokens) * numerator + denominator - 1n) / denominator;
}
/** Every writer locks the shared global row before the owner's row, so concurrent owners never deadlock. */
export async function lockAiDailyLedger(tx: Transaction, day: Date | string, ownerId: string) {
  return tx.query<{ scope: string; reserved_microusd: bigint }>(`SELECT scope,reserved_microusd FROM ai_usage_daily
    WHERE day=$1::date AND scope IN ('global',$2) AND capability='study-plan-v1' ORDER BY (scope='global') DESC FOR UPDATE`, day, ownerId);
}
async function requireDailyBudget(tx: Transaction, ownerId: string, amount: bigint, config: DailyLimits) {
  const [num, den] = decimal(config.dailyBudgetUsd), globalMaximum = num * 1000000n / den;
  // Without a dedicated per-actor cap each owner gets one tenth of the global cap, so a few accounts cannot drain it for everyone.
  // Floor: one reservation of this size, so a large single request (e.g. an image) is never unreachable; the global cap still applies.
  const share = globalMaximum / DEFAULT_ACTOR_SHARE;
  const actorMaximum = config.dailyActorBudgetUsd === undefined ? (amount > share ? amount : share)
    : (([actorNum, actorDen]) => actorNum * 1000000n / actorDen)(decimal(config.dailyActorBudgetUsd));
  for (const scope of ['global', ownerId]) {
    const maximum = scope === 'global' ? globalMaximum : actorMaximum;
    await tx.query(`INSERT INTO ai_usage_daily(day,scope,capability) VALUES(${aiOperationalDaySql},$1,'study-plan-v1')
      ON CONFLICT DO NOTHING RETURNING scope`, scope);
    const [usage] = await tx.query<{ request_count: number; total: string }>(`SELECT request_count,
      (reserved_microusd+consumed_microusd)::text AS total FROM ai_usage_daily
      WHERE day=${aiOperationalDaySql} AND scope=$1 AND capability='study-plan-v1' FOR UPDATE`, scope);
    const cap = scope === 'global' ? config.dailyGlobalRequests : config.dailyActorRequests;
    if (usage!.request_count >= cap || BigInt(usage!.total) + amount > maximum) {
      const code = scope === 'global' ? 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED' : 'AI_BUDGET_EXCEEDED';
      throw Object.assign(new Error(code), { code });
    }
  }
}

export async function reserveAiTextBudget(tx: Transaction, row: BudgetJob, count: number, config: ClassroomAiConfiguration,
  table: BudgetTable = 'classroom_curriculum_extractions', metadata?: Partial<MonthlyBudgetMetadata>): Promise<boolean> {
  await lockAiBudget(tx, row.owner_id);
  const [existing] = await tx.query<{ dispatch_count: number; execution_profile?: unknown }>(`SELECT dispatch_count${tasks[table] ? ',execution_profile' : ''} FROM ${table} WHERE id=$1::uuid FOR UPDATE`, row.id);
  if (!existing || existing.dispatch_count > 0) return false;
  config = pinnedPrices(config, table, existing.execution_profile);
  const amount = tokenCost(count, config.inputUsdPerMillion) + tokenCost(config.maxOutputTokens, config.outputUsdPerMillion);
  await requireDailyBudget(tx, row.owner_id, amount, config);
  if (amount > 0n && !await reserveAiMonthlyBudget(tx, { namespace: table, jobId: row.id, ownerId: row.owner_id }, amount, {
    capability: metadata?.capability ?? tasks[table] ?? table,
    provider: metadata?.provider ?? config.executionProfile?.provider ?? 'gemini',
    model: metadata?.model ?? config.executionProfile?.model ?? config.model ?? 'unknown',
    pricing: metadata?.pricing ?? {
      inputUsdPerMillion: config.inputUsdPerMillion,
      outputUsdPerMillion: config.outputUsdPerMillion,
      profileVersion: config.executionProfile?.profileVersion,
    },
  })) return false;
  await tx.query(`UPDATE ai_usage_daily SET request_count=request_count+1,reserved_microusd=reserved_microusd+$2::bigint
    WHERE day=${aiOperationalDaySql} AND scope IN ('global',$1) AND capability='study-plan-v1' RETURNING scope`, row.owner_id, amount.toString());
  await tx.query(`UPDATE ${table} SET reserved_microusd=$2::bigint,
    usage_day=${aiOperationalDaySql},input_tokens=$3,dispatch_started_at=clock_timestamp(),
    dispatch_count=dispatch_count+1 WHERE id=$1::uuid RETURNING id`, row.id, amount.toString(), count);
  return true;
}
export async function settleAiTextBudget(tx: Transaction, row: BudgetJob, config: ClassroomAiConfiguration,
  usage?: { inputTokens: number | null; outputTokens: number | null }, table: BudgetTable = 'classroom_curriculum_extractions',
  pricedUsage?: bigint | null): Promise<void> {
  const [reservation] = await tx.query<{ amount: string; day: Date; execution_profile?: unknown }>(`SELECT reserved_microusd::text AS amount,
    ${tasks[table] ? 'execution_profile,' : ''}
    usage_day AS day FROM ${table} WHERE id=$1::uuid FOR UPDATE`, row.id);
  if (!reservation) return;
  const valid = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const known = valid(usage?.inputTokens) && valid(usage?.outputTokens);
  if (!known && BigInt(reservation.amount) === 0n) return;
  config = pinnedPrices(config, table, reservation.execution_profile);
  const operationalCharge = pricedUsage ?? (known ? tokenCost(usage!.inputTokens!, config.inputUsdPerMillion)
    + tokenCost(usage!.outputTokens!, config.outputUsdPerMillion) : BigInt(reservation.amount));
  const actual = pricedUsage === undefined ? known ? operationalCharge : null : pricedUsage;
  const job = { namespace: table, jobId: row.id, ownerId: row.owner_id };
  if (BigInt(reservation.amount) === 0n) {
    if (actual !== null) await settleAiMonthlyBudget(tx, job, actual);
    return;
  }
  await lockAiDailyLedger(tx, reservation.day, row.owner_id);
  await tx.query(`UPDATE ai_usage_daily SET reserved_microusd=reserved_microusd-$3::bigint,
    consumed_microusd=consumed_microusd+$4::bigint,input_tokens=input_tokens+$5::bigint,output_tokens=output_tokens+$6::bigint
    WHERE day=$1::date AND scope IN ('global',$2) AND capability='study-plan-v1' RETURNING scope`, reservation.day, row.owner_id,
  reservation.amount, operationalCharge.toString(), known ? usage!.inputTokens : 0, known ? usage!.outputTokens : 0);
  await tx.query(`UPDATE ${table} SET reserved_microusd=0,output_tokens=$2::bigint
    WHERE id=$1::uuid RETURNING id`, row.id, known ? usage!.outputTokens : null);
  await settleAiMonthlyBudget(tx, job, actual);
}

/** Uses the same daily operational quota for Study images, whose durable work lives in a domain receipt. */
export async function reserveAiImageBudget(tx: Transaction, job: MonthlyBudgetJob, amount: bigint,
  metadata: MonthlyBudgetMetadata, limits: DailyLimits): Promise<boolean> {
  await lockAiBudget(tx, job.ownerId);
  await requireDailyBudget(tx, job.ownerId, amount, limits);
  if (!await reserveAiMonthlyBudget(tx, job, amount, metadata)) return false;
  // Count the estimate immediately against the operational guard, even if the process dies before returning usage.
  await tx.query(`UPDATE ai_usage_daily SET request_count=request_count+1,consumed_microusd=consumed_microusd+$2::bigint
    WHERE day=${aiOperationalDaySql} AND scope IN ('global',$1) AND capability='study-plan-v1' RETURNING scope`,
  job.ownerId, amount.toString());
  return true;
}

export async function settleAiImageBudget(tx: Transaction, job: MonthlyBudgetJob, actual: bigint | null): Promise<void> {
  if (actual === null) {
    await settleAiMonthlyBudget(tx, job, null);
    return;
  }
  const [reservation] = await tx.query<{ day: string }>(`SELECT operational_day::text AS day
    FROM ai_monthly_reservations WHERE namespace=$1 AND job_id=$2::uuid AND owner_id=$3::uuid`, job.namespace, job.jobId, job.ownerId);
  if (!reservation) return;
  await lockAiDailyLedger(tx, reservation.day, job.ownerId);
  const result = await settleAiMonthlyBudget(tx, job, actual);
  if (!result) return;
  await tx.query(`UPDATE ai_usage_daily SET consumed_microusd=consumed_microusd+$3::bigint
    WHERE day=$1::date AND scope IN ('global',$2) AND capability='study-plan-v1' RETURNING scope`,
  reservation.day, job.ownerId, (actual - result.quote).toString());
}
