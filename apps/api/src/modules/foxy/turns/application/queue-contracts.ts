import type { AiExecutionSettings } from '../../../../../../../src/core/contracts/ai-execution.ts';
export interface FoxyTurnLease {
  turnId: string; ownerId: string; conversationId: string; leaseNonce: string; deadlineMs?: number;
  queueMs?: number;
}
export type FoxyTextBudgetConfiguration = { maxOutputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
  dailyBudgetUsd: number; dailyActorRequests: number; dailyGlobalRequests: number } & AiExecutionSettings;
