export interface FoxyTurnLease { turnId: string; ownerId: string; conversationId: string; leaseNonce: string }
export type FoxyTextBudgetConfiguration = { maxOutputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
  dailyBudgetUsd: number; dailyActorRequests: number; dailyGlobalRequests: number };
