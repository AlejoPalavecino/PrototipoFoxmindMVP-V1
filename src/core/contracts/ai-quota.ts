export const aiQuotaPath = '/api/v1/ai-quota';
export const aiQuotaEventsPath = `${aiQuotaPath}/events`;

export type AiBudgetRejectionCode = 'AI_MONTHLY_BUDGET_EXCEEDED' | 'AI_BUDGET_EXCEEDED' | 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED';

export interface AiMonthlyQuotaRejection {
  availableMicrousd: number;
  requiredMicrousd: number;
  renewsAt: string;
}

export function isAiBudgetRejectionCode(value: unknown): value is AiBudgetRejectionCode {
  return value === 'AI_MONTHLY_BUDGET_EXCEEDED' || value === 'AI_BUDGET_EXCEEDED' || value === 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED';
}

export function readAiMonthlyQuotaRejection(value: unknown): AiMonthlyQuotaRejection | undefined {
  if (!value || typeof value !== 'object') return;
  const { availableMicrousd, requiredMicrousd, renewsAt } = value as Partial<AiMonthlyQuotaRejection>;
  if (typeof availableMicrousd !== 'number' || !Number.isSafeInteger(availableMicrousd) || availableMicrousd < 0
    || typeof requiredMicrousd !== 'number' || !Number.isSafeInteger(requiredMicrousd) || requiredMicrousd <= availableMicrousd
    || typeof renewsAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(renewsAt) || !Number.isFinite(Date.parse(renewsAt))) return;
  return { availableMicrousd, requiredMicrousd, renewsAt };
}

export interface AiQuotaToolUsage {
  capability: string;
  consumedMicrousd: number;
  reservedMicrousd: number;
  chargedOperations: number;
  reservedOperations: number;
}

export interface AiQuotaSnapshot {
  subjectId: string;
  version: number;
  limitMicrousd: number;
  consumedMicrousd: number;
  reservedMicrousd: number;
  remainingMicrousd: number;
  periodStart: string;
  renewsAt: string;
  tools: AiQuotaToolUsage[];
}
