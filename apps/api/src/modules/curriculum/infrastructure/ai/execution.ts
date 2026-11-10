import { parseExtractedCurriculum, type ExtractedCurriculum, type ExtractionError } from '../../../../../../../src/core/domain/index.ts';
import type { ClassroomAiOptions, PlanGrant } from './contracts.ts';

import { bounded } from '../../../../platform/ai/execution.ts';
export { bounded, errorCode } from '../../../../platform/ai/execution.ts';
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
