import type { AiTextPreview, AiTextProfile, AiTextRequest, AiTextResult, AiTextTransport, AiTextUsage } from './text-contract.ts';
import { executionFailure, validateTextProfile } from './text-profiles.ts';
import { snapshotTextRequest } from './text-request.ts';

export interface AiTextMetric {
  task: AiTextProfile['task']; provider: AiTextProfile['provider']; stage: 'count' | 'generate';
  durationMs: number; outcome: 'success' | 'failure'; code: string;
}
interface Options {
  profile: AiTextProfile; transport: AiTextTransport; request: AiTextRequest; signal?: AbortSignal;
  authorize?: () => Promise<void>; reserve?: (tokens: number) => Promise<void>; onDispatch?: () => void;
  preview?: () => AiTextPreview | undefined;
  /** Interruptible caller pause; unlike a real SQL reservation, no commit needs draining here. */
  preflight?: (tokens: number) => Promise<void>;
  record?: (event: AiTextMetric) => void; now?: () => number;
}
const preserved = new Set(['AI_UNAVAILABLE', 'AI_INPUT_LIMIT', 'AI_RATE_LIMITED', 'INVALID_AI_OUTPUT',
  'FORBIDDEN', 'AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'SOURCE_UNAVAILABLE', 'CONFLICT', 'QUOTA_EXCEEDED',
  'AI_BUDGET_EXCEEDED', 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED', 'AI_MONTHLY_BUDGET_EXCEEDED']);
const countValid = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

export async function executeAiText(options: Options): Promise<AiTextResult> {
  validateTextProfile(options.profile);
  const profile = { ...options.profile, capabilities: [...options.profile.capabilities] };
  if (options.transport.provider !== profile.provider) throw executionFailure();
  const request = snapshotTextRequest(options.request, profile);
  const now = options.now ?? performance.now.bind(performance), started = now(), deadline = started + profile.deadlineMs;
  const signal = AbortSignal.any([...(options.signal ? [options.signal] : []), AbortSignal.timeout(profile.deadlineMs)]);
  let dispatched = false, usage: AiTextUsage | undefined;
  const check = () => {
    if (signal.aborted || !Number.isFinite(now()) || now() >= deadline) throw executionFailure(dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_TIMEOUT');
  };
  const bounded = async <T>(operation: () => Promise<T>, keepProcessAlive = true): Promise<T> => {
    check();
    let abort: (() => void) | undefined;
    const interrupted = new Promise<never>((_, reject) => {
      abort = () => reject(executionFailure(dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_TIMEOUT'));
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
    const keepAlive = keepProcessAlive ? setTimeout(() => {}, Math.max(1, deadline - now())) : undefined;
    try { const result = await Promise.race([operation(), interrupted]); check(); return result; }
    finally { if (keepAlive) clearTimeout(keepAlive); if (abort) signal.removeEventListener('abort', abort); }
  };
  const normalize = (error: unknown) => {
    const value = error as { code?: unknown; status?: unknown } | null;
    const code = typeof value?.code === 'string' ? value.code : '';
    if (preserved.has(code) || code === 'AI_TIMEOUT' || code === 'PROVIDER_OUTCOME_UNKNOWN') return code;
    if (value?.status === 429) return 'AI_RATE_LIMITED';
    return dispatched && typeof value?.status !== 'number' ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_UNAVAILABLE';
  };
  const measure = async <T>(stage: AiTextMetric['stage'], operation: () => Promise<T>) => {
    const start = now(); let code = 'COMPLETED', outcome: AiTextMetric['outcome'] = 'success';
    try { return await bounded(operation); }
    catch (error) { code = normalize(error); outcome = 'failure'; throw error; }
    finally { try { options.record?.({ task: profile.task, provider: profile.provider, stage,
      durationMs: Math.max(0, now() - start), outcome, code }); } catch { /* Metrics never affect execution. */ } }
  };
  const input = () => ({ ...snapshotTextRequest(request, profile), model: profile.model, maxOutputTokens: profile.maxOutputTokens, signal });
  try {
    await bounded(async () => { await options.authorize?.(); });
    const count = await measure('count', () => options.transport.count(input()));
    if (!countValid(count) || count < 1) throw executionFailure();
    if (count > profile.maxInputTokens) throw executionFailure('AI_INPUT_LIMIT');
    if (options.preflight) await bounded(() => options.preflight!(count), false);
    // A reservation can commit after its Promise has lost a cancellation race.
    // Drain this bounded database hook before the caller settles/releases it.
    check(); await options.reserve?.(count); check();
    await bounded(async () => { await options.authorize?.(); });
    check(); options.onDispatch?.(); dispatched = true;
    return await measure('generate', async () => {
      const preview = profile.task === 'foxy' && profile.provider === 'gemini' ? options.preview?.() : undefined;
      const result = preview && options.transport.stream
        ? await options.transport.stream(input(), text => { check(); preview(text); })
        : await options.transport.generate(input());
      usage = result?.usage;
      if (!result || result.finish !== 'stop' || typeof result.text !== 'string' || !result.text.trim()
        || Buffer.byteLength(result.text) > 1_000_000 || !usage
        || [usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.cachedInputTokens].some(value => value !== null && !countValid(value)))
        throw executionFailure('INVALID_AI_OUTPUT');
      if (request.schema) { try { JSON.parse(result.text); } catch { throw executionFailure('INVALID_AI_OUTPUT'); } }
      await bounded(async () => { await options.authorize?.(); });
      return result;
    });
  } catch (error) {
    const code = normalize(error);
    const quota = code === 'AI_MONTHLY_BUDGET_EXCEEDED' && error instanceof Error && 'quota' in error ? error.quota : undefined;
    throw Object.assign(executionFailure(code), { dispatched, ...(usage ? { usage } : {}), ...(quota ? { quota } : {}) });
  }
}
