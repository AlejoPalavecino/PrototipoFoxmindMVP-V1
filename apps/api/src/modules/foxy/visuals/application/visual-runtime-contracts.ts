import type { VisualProfile } from '../../domain/visual-profile.ts';
import type { VisualOptions } from './visual-worker-contracts.ts';
export type VisualConfiguration = { enabled: { IMAGE: boolean; DIAGRAM: boolean }; profiles: { IMAGE: VisualProfile | null; DIAGRAM: VisualProfile | null }; privateQuotaBytes: bigint; maxConcurrency: number; maxJobAgeMs: number; deadlineMs: number };
export type VisualProviders = { IMAGE: VisualOptions['providers']['IMAGE'] | null; DIAGRAM: VisualOptions['providers']['DIAGRAM'] | null };
export type VisualBudgetLimits = { dailyBudgetUsd: number; dailyActorRequests: number; dailyGlobalRequests: number };
