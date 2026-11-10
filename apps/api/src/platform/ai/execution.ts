import type { ExtractionError } from '../../../../../src/core/domain/index.ts';

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
    'AI_RATE_LIMITED', 'AI_BUDGET_EXCEEDED', 'AI_TIMEOUT', 'PROVIDER_OUTCOME_UNKNOWN'].includes(code)) return code as ExtractionError;
  return dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_UNAVAILABLE';
}
