import type { SqlTransaction } from '../../../../src/core/domain/index.ts';

type Transaction = SqlTransaction;
type ClassroomAiConfiguration = { maxOutputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
  dailyBudgetUsd: number; dailyActorRequests: number; dailyGlobalRequests: number };
type BudgetJob = { id: string; owner_id: string };
export type BudgetTable = 'classroom_curriculum_extractions' | 'activity_ai_generations' | 'student_ai_reports' | 'grading_ai_jobs' | 'foxy_turns';

function decimal(value: number): [bigint, bigint] {
  const [mantissa, exponent = '0'] = String(value).split('e');
  const [whole, fraction = ''] = mantissa!.split('.');
  const scale = fraction.length - Number(exponent);
  return scale >= 0 ? [BigInt(whole! + fraction), 10n ** BigInt(scale)]
    : [BigInt(whole! + fraction) * 10n ** BigInt(-scale), 1n];
}
export function tokenCost(tokens: number, rate: number): bigint {
  const [numerator, denominator] = decimal(rate);
  return (BigInt(tokens) * numerator + denominator - 1n) / denominator;
}
export async function reserveAiTextBudget(tx: Transaction, row: BudgetJob, count: number, config: ClassroomAiConfiguration, table: BudgetTable = 'classroom_curriculum_extractions'): Promise<boolean> {
  await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)');
  const [existing] = await tx.query<{ dispatch_count: number }>(`SELECT dispatch_count FROM ${table} WHERE id=$1::uuid FOR UPDATE`, row.id);
  if (!existing || existing.dispatch_count > 0) return false;
  const amount = tokenCost(count, config.inputUsdPerMillion) + tokenCost(config.maxOutputTokens, config.outputUsdPerMillion);
  const [num, den] = decimal(config.dailyBudgetUsd), maximum = num * 1000000n / den;
  for (const scope of ['global', row.owner_id]) {
    await tx.query(`INSERT INTO ai_usage_daily(day,scope,capability) VALUES((transaction_timestamp() AT TIME ZONE 'UTC')::date,$1,'study-plan-v1')
      ON CONFLICT DO NOTHING RETURNING scope`, scope);
    const [usage] = await tx.query<{ request_count: number; total: string }>(`SELECT request_count,
      (reserved_microusd+consumed_microusd)::text AS total FROM ai_usage_daily
      WHERE day=(transaction_timestamp() AT TIME ZONE 'UTC')::date AND scope=$1 AND capability='study-plan-v1' FOR UPDATE`, scope);
    const cap = scope === 'global' ? config.dailyGlobalRequests : config.dailyActorRequests;
    if (usage!.request_count >= cap || BigInt(usage!.total) + amount > maximum) return false;
  }
  await tx.query(`UPDATE ai_usage_daily SET request_count=request_count+1,reserved_microusd=reserved_microusd+$2::bigint
    WHERE day=(transaction_timestamp() AT TIME ZONE 'UTC')::date AND scope IN ('global',$1) AND capability='study-plan-v1' RETURNING scope`, row.owner_id, amount.toString());
  await tx.query(`UPDATE ${table} SET reserved_microusd=$2::bigint,
    usage_day=(transaction_timestamp() AT TIME ZONE 'UTC')::date,input_tokens=$3,dispatch_started_at=clock_timestamp(),
    dispatch_count=dispatch_count+1 WHERE id=$1::uuid RETURNING id`, row.id, amount.toString(), count);
  return true;
}
export async function settleAiTextBudget(tx: Transaction, row: BudgetJob, config: ClassroomAiConfiguration,
  usage?: { inputTokens: number | null; outputTokens: number | null }, table: BudgetTable = 'classroom_curriculum_extractions'): Promise<void> {
  const [reservation] = await tx.query<{ amount: string; day: Date }>(`SELECT reserved_microusd::text AS amount,
    usage_day AS day FROM ${table} WHERE id=$1::uuid FOR UPDATE`, row.id);
  if (!reservation || BigInt(reservation.amount) === 0n) return;
  const valid = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  const known = valid(usage?.inputTokens) && valid(usage?.outputTokens);
  const actual = known ? tokenCost(usage!.inputTokens!, config.inputUsdPerMillion)
    + tokenCost(usage!.outputTokens!, config.outputUsdPerMillion) : BigInt(reservation.amount);
  await tx.query(`UPDATE ai_usage_daily SET reserved_microusd=reserved_microusd-$3::bigint,
    consumed_microusd=consumed_microusd+$4::bigint,input_tokens=input_tokens+$5::bigint,output_tokens=output_tokens+$6::bigint
    WHERE day=$1::date AND scope IN ('global',$2) AND capability='study-plan-v1' RETURNING scope`, reservation.day, row.owner_id,
  reservation.amount, actual.toString(), known ? usage!.inputTokens : 0, known ? usage!.outputTokens : 0);
  await tx.query(`UPDATE ${table} SET reserved_microusd=0,output_tokens=$2::bigint
    WHERE id=$1::uuid RETURNING id`, row.id, known ? usage!.outputTokens : null);
}
