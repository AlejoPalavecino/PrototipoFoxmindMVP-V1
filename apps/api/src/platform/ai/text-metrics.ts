import { aiTasks } from './text-profiles.ts';
import type { AiTextMetric } from './text-execution.ts';

type ChatFlow = 'chat' | 'tool' | 'feedback';
type ChatStage = AiTextMetric['stage'] | 'queue' | 'admission' | 'prepare' | 'persist' | 'first_text';
type ChatMetric = Omit<AiTextMetric, 'task' | 'provider' | 'stage'> & {
  task: 'foxy' | 'study'; flow: ChatFlow; stage: ChatStage; provider?: AiTextMetric['provider'];
};
type Event = AiTextMetric | ChatMetric;
const chatStages = new Set(['queue', 'admission', 'prepare', 'count', 'generate', 'persist', 'first_text']);
const flows = new Set(['chat', 'tool', 'feedback']);
const providers = new Set(['gemini', 'anthropic']);
const codes = new Set(['COMPLETED', 'AI_UNAVAILABLE', 'AI_INPUT_LIMIT', 'AI_RATE_LIMITED', 'AI_TIMEOUT',
  'PROVIDER_OUTCOME_UNKNOWN', 'INVALID_AI_OUTPUT', 'FORBIDDEN', 'AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED',
  'SOURCE_UNAVAILABLE', 'CONFLICT', 'QUOTA_EXCEEDED', 'AI_BUDGET_EXCEEDED', 'AI_BUSY', 'CANCELLED', 'STALE']);
export function createAiTextMetricSink(write: (line: string) => void,
  options: { maxEvents?: number; windowMs?: number; now?: () => number } = {}) {
  const now = options.now ?? Date.now;
  let start = now(), emitted = 0;
  return (event: Event) => {
    try {
      if (!event || !aiTasks.includes(event.task) || !codes.has(event.code)
        || !['success', 'failure'].includes(event.outcome) || !Number.isFinite(event.durationMs) || event.durationMs < 0) return;
      const { task, stage, durationMs, code, outcome } = event;
      let dimensions: { provider: string } | { flow: ChatFlow; provider?: string };
      if ('flow' in event) {
        if ((task !== 'foxy' && task !== 'study') || !flows.has(event.flow) || !chatStages.has(stage)) return;
        if (event.provider !== undefined && !providers.has(event.provider)) return;
        dimensions = { flow: event.flow, ...(event.provider ? { provider: event.provider } : {}) };
      } else {
        if (!providers.has(event.provider) || !['count', 'generate'].includes(stage)) return;
        dimensions = { provider: event.provider };
      }
      const time = now();
      if (time - start >= (options.windowMs ?? 60000)) { start = time; emitted = 0; }
      if (emitted >= (options.maxEvents ?? 100)) return;
      write(JSON.stringify({ task, ...dimensions, stage, durationMs, code, outcome }) + '\n'); emitted++;
    } catch { /* Best effort, never serialize an SDK error or affect a request. */ }
  };
}

export const recordAiTextMetric = createAiTextMetricSink(line => process.stderr.write(line));
export type AiChatTimings = ReturnType<typeof createAiChatTimings>;

export function createAiChatTimings(task: ChatMetric['task'], initialFlow: ChatFlow,
  record: (event: ChatMetric) => void = recordAiTextMetric, now: () => number = () => performance.now()) {
  let flow = initialFlow;
  function recordStage(stage: ChatStage, durationMs: number, failure?: unknown, provider?: AiTextMetric['provider']) {
    try {
      let code = 'COMPLETED';
      if (failure !== undefined) {
        const candidate = (failure as { code?: unknown } | null)?.code;
        code = typeof candidate === 'string' && codes.has(candidate) && candidate !== 'COMPLETED' ? candidate : 'AI_UNAVAILABLE';
      }
      record({ task, flow, stage, durationMs: Math.max(0, durationMs), ...(provider ? { provider } : {}),
        outcome: failure === undefined ? 'success' : 'failure', code });
    } catch { /* A telemetry failure must not affect the operation. */ }
  }
  return {
    setFlow(next: ChatFlow) { flow = next; },
    now,
    stage: recordStage,
    async measure<T>(stage: ChatStage, operation: () => Promise<T>, classify?: (result: T) => unknown): Promise<T> {
      const started = now();
      let result: T;
      try {
        result = await operation();
      } catch (error) {
        recordStage(stage, now() - started, error ?? null);
        throw error;
      }
      try { recordStage(stage, now() - started, classify?.(result)); }
      catch { /* A diagnostic classifier must not affect the operation. */ }
      return result;
    },
  };
}
