import { parseExtractedCurriculum, type ExtractedCurriculum, type ExtractionError } from '../../../../../src/core/domain/index.ts';
import type { ClassroomAiOptions, PlanGrant } from './contracts.ts';

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
export function proposal(value: unknown): ExtractedCurriculum {
  if (value && typeof value === 'object' && 'units' in value && Array.isArray(value.units) && !value.units.length)
    throw Object.assign(new Error('NO_STRUCTURE'), { code: 'NO_STRUCTURE' });
  try { return parseExtractedCurriculum(value); }
  catch { throw Object.assign(new Error('INVALID_AI_OUTPUT'), { code: 'INVALID_AI_OUTPUT' }); }
}
export async function prepare(options: ClassroomAiOptions, grant: PlanGrant, signal: AbortSignal) {
  const document = await bounded(() => options.reader.read(grant, signal), signal);
  const input = { document, schemaVersion: 'study-plan-v1' as const, signal };
  const count = await bounded(() => options.provider.countStudyPlanTokens(input), signal);
  if (!Number.isSafeInteger(count) || count <= 0 || count > options.configuration.maxInputTokens)
    throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' });
  return { count, input };
}
