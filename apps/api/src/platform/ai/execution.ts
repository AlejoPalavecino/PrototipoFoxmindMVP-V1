import type { ExtractionError } from '../../../../../src/core/domain/curriculum/ai.ts';

/** Preserve metering even when generation succeeded but validation or authorization failed. */
export function usageFromAiFailure(error: unknown) {
  const failure = error as { dispatched?: boolean; usage?: { inputTokens?: unknown; outputTokens?: unknown } } | null;
  const { inputTokens, outputTokens } = failure?.usage ?? {};
  if (typeof inputTokens === 'number' && Number.isSafeInteger(inputTokens) && inputTokens >= 0
    && typeof outputTokens === 'number' && Number.isSafeInteger(outputTokens) && outputTokens >= 0) {
    return { inputTokens, outputTokens };
  }
  if (failure?.dispatched === false) return { inputTokens: 0, outputTokens: 0 };
  return undefined;
}

export function bounded<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(Object.assign(new Error('AI_TIMEOUT'), { code: 'AI_TIMEOUT' }));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    const cleanup = () => signal.removeEventListener('abort', abort);
    try {
      Promise.resolve(operation()).then(
        value => { cleanup(); resolve(value); },
        error => { cleanup(); reject(error); },
      );
    } catch (error) { cleanup(); reject(error); }
  });
}
export function errorCode(error: unknown, dispatched: boolean): ExtractionError {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (dispatched && ['AI_TIMEOUT', 'PROVIDER_OUTCOME_UNKNOWN'].includes(code)) return 'PROVIDER_OUTCOME_UNKNOWN';
  if (['FILE_NOT_READY', 'AI_INPUT_LIMIT', 'NO_STRUCTURE', 'INVALID_AI_OUTPUT', 'AI_UNAVAILABLE',
    'AI_RATE_LIMITED', 'AI_BUDGET_EXCEEDED', 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED', 'AI_MONTHLY_BUDGET_EXCEEDED', 'AI_TIMEOUT', 'PROVIDER_OUTCOME_UNKNOWN'].includes(code)) return code as ExtractionError;
  return dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_UNAVAILABLE';
}
