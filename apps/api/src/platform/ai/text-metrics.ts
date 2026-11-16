import { aiTasks } from './text-profiles.ts';
import type { AiTextMetric } from './text-execution.ts';

const codes = new Set(['COMPLETED', 'AI_UNAVAILABLE', 'AI_INPUT_LIMIT', 'AI_RATE_LIMITED', 'AI_TIMEOUT',
  'PROVIDER_OUTCOME_UNKNOWN', 'INVALID_AI_OUTPUT', 'FORBIDDEN', 'AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED',
  'SOURCE_UNAVAILABLE', 'CONFLICT', 'QUOTA_EXCEEDED', 'AI_BUDGET_EXCEEDED']);
export function createAiTextMetricSink(write: (line: string) => void,
  options: { maxEvents?: number; windowMs?: number; now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  let start = now(), emitted = 0;
  return (event: AiTextMetric) => {
    try {
      if (!event || !aiTasks.includes(event.task) || !['gemini', 'anthropic'].includes(event.provider)
        || !['count', 'generate'].includes(event.stage) || !codes.has(event.code)
        || !['success', 'failure'].includes(event.outcome) || !Number.isFinite(event.durationMs) || event.durationMs < 0) return;
      const time = now();
      if (time - start >= (options.windowMs ?? 60000)) { start = time; emitted = 0; }
      if (emitted >= (options.maxEvents ?? 100)) return;
      const { task, provider, stage, durationMs, code, outcome } = event;
      write(JSON.stringify({ task, provider, stage, durationMs, code, outcome }) + '\n'); emitted++;
    } catch { /* Best effort, never serialize an SDK error or affect a request. */ }
  };
}
