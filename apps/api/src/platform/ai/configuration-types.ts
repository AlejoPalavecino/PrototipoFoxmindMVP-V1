import type { AiExecutionSettings } from '../../../../../src/core/contracts/ai-execution.ts';

export interface AiConfiguration extends AiExecutionSettings {
  backend: 'gemini-developer'; model: string; apiKey: string;
  dailyActorRequests: number; dailyGlobalRequests: number; maxInputTokens: number; maxOutputTokens: number;
  dailyBudgetUsd: number; /** Optional per-actor daily cap in USD; when absent each actor gets one tenth of the global cap. */ dailyActorBudgetUsd?: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
  deadlineMs: number; maxConcurrency: number; maxDispatches: number; maxJobAgeMs: number;
  anthropicApiKey?: string;
}
