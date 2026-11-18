import type { SqlTransaction } from '../../../../../src/core/contracts/sql.ts';
import { settleAiMonthlyBudget, type MonthlyBudgetJob, type MonthlyBudgetMetadata } from './monthly-budget.ts';
import { tokenCost } from './text-budget.ts';

/** Record a trusted worker's receipt independently of its permission to publish a late answer. */
export async function recordObservedCost(tx: SqlTransaction, job: MonthlyBudgetJob,
  usage?: { inputTokens: number | null; outputTokens: number | null } | null,
  quote?: (pricing: MonthlyBudgetMetadata['pricing']) => bigint | null) {
  if (!usage || usage.inputTokens === null || usage.outputTokens === null
    || !Number.isSafeInteger(usage.inputTokens) || usage.inputTokens < 0
    || !Number.isSafeInteger(usage.outputTokens) || usage.outputTokens < 0) return;
  const [reservation] = await tx.query<{ pricing: MonthlyBudgetMetadata['pricing'] }>(`SELECT pricing
    FROM ai_monthly_reservations WHERE namespace=$1 AND job_id=$2::uuid AND owner_id=$3::uuid`, job.namespace, job.jobId, job.ownerId);
  if (!reservation) return;
  const prices = reservation.pricing;
  const actual = quote ? quote(prices)
    : tokenCost(usage.inputTokens, prices.inputUsdPerMillion) + tokenCost(usage.outputTokens, prices.outputUsdPerMillion);
  if (actual !== null) await settleAiMonthlyBudget(tx, job, actual);
}
