import type { GenerateContentResponse } from '@google/genai';
import type { AiTextResult } from '../../../../../platform/ai/text-contract.ts';
import { sdkTextResult } from '../../../../../platform/ai/sdk-text-compat.ts';
import { parseExtractedCurriculum } from '../../../../../../../../src/core/domain/curriculum/plan.ts';
import { AiError } from '../../../../../platform/ai/errors.ts';
export function extractionResponse(response: GenerateContentResponse | AiTextResult) {
  const result = 'finish' in response ? response : sdkTextResult(response);
  const text = result.text;
  if (result.finish !== 'stop' || typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 262_144) throw new AiError('INVALID_AI_OUTPUT');
  let json: unknown;
  try {
    json = JSON.parse(text);
    const empty = json as { units?: unknown; warnings?: unknown };
    if (Array.isArray(empty?.units) && empty.units.length === 0) {
      parseExtractedCurriculum({ ...empty, units: [{ name: 'validation', topics: [{ name: 'validation' }] }] });
    } else json = parseExtractedCurriculum(json);
  } catch { throw new AiError('INVALID_AI_OUTPUT'); }
  return { json, inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens };
}
