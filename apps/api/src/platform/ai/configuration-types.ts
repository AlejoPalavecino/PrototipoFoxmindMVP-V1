import type { AiExecutionSettings } from '../../../../../src/core/contracts/ai-execution.ts';

export interface AiConfiguration extends AiExecutionSettings {
  backend: 'gemini-developer'; model: string; apiKey: string;
  dailyActorRequests: number; dailyGlobalRequests: number; maxInputTokens: number; maxOutputTokens: number;
  dailyBudgetUsd: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
  deadlineMs: number; maxConcurrency: number; maxDispatches: number; maxJobAgeMs: number;
  anthropicApiKey?: string;
}
