import { AiError } from './errors.ts';

export interface AiConfiguration {
  backend: 'gemini-developer'; model: string; apiKey: string;
  dailyActorRequests: number; dailyGlobalRequests: number; maxInputTokens: number; maxOutputTokens: number;
  dailyBudgetUsd: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
  deadlineMs: number; maxConcurrency: number; maxDispatches: number; maxJobAgeMs: number;
}
function text(env: Record<string, string | undefined>, key: string): string {
  const value = env[key];
  if (!value || !value.trim() || /[\u0000-\u001f\u007f]/u.test(value)) throw new AiError('AI_UNAVAILABLE');
  return value.trim();
}
function positive(env: Record<string, string | undefined>, key: string, integer = true): number {
  const raw = text(env, key);
  if (!/^\d+(?:\.\d+)?$/u.test(raw)) throw new AiError('AI_UNAVAILABLE');
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0 || (integer && !Number.isSafeInteger(value))) throw new AiError('AI_UNAVAILABLE');
  return value;
}
export function readAiConfiguration(env: Record<string, string | undefined>): AiConfiguration | null {
  if (env.AI_ENABLED === undefined || env.AI_ENABLED === 'false') return null;
  if (env.AI_ENABLED !== 'true' || env.AI_BACKEND !== 'gemini-developer') throw new AiError('AI_UNAVAILABLE');
  return {
    backend: 'gemini-developer', model: text(env, 'AI_MODEL'), apiKey: text(env, 'AI_API_KEY'),
    dailyActorRequests: positive(env, 'AI_DAILY_ACTOR_REQUESTS'), dailyGlobalRequests: positive(env, 'AI_DAILY_GLOBAL_REQUESTS'),
    maxInputTokens: positive(env, 'AI_MAX_INPUT_TOKENS'), maxOutputTokens: positive(env, 'AI_MAX_OUTPUT_TOKENS'),
    dailyBudgetUsd: positive(env, 'AI_DAILY_BUDGET_USD', false),
    inputUsdPerMillion: positive(env, 'AI_INPUT_USD_PER_MILLION', false), outputUsdPerMillion: positive(env, 'AI_OUTPUT_USD_PER_MILLION', false),
    deadlineMs: positive(env, 'AI_DEADLINE_MS'), maxConcurrency: positive(env, 'AI_MAX_CONCURRENCY'),
    maxDispatches: positive(env, 'AI_MAX_DISPATCHES'), maxJobAgeMs: positive(env, 'AI_MAX_JOB_AGE_MS'),
  };
}
