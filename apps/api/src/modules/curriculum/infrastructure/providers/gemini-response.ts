import type { GenerateContentResponse } from '@google/genai';
import { parseExtractedCurriculum } from '../../../../../../../src/core/domain/index.ts';
import { AiError } from '../../../../platform/ai/errors.ts';

function usage(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
function outputUsage(response: GenerateContentResponse): number | null {
  const candidates = usage(response.usageMetadata?.candidatesTokenCount);
  const thoughts = response.usageMetadata?.thoughtsTokenCount === undefined ? 0 : usage(response.usageMetadata.thoughtsTokenCount);
  return candidates === null || thoughts === null ? null : usage(candidates + thoughts);
}
export function extractionResponse(response: GenerateContentResponse) {
  const text = response.text;
  if (response.promptFeedback?.blockReason || response.candidates?.length !== 1
    || response.candidates[0]?.finishReason !== 'STOP' || typeof text !== 'string'
    || Buffer.byteLength(text, 'utf8') > 262_144) throw new AiError('INVALID_AI_OUTPUT');
  let json: unknown;
  try {
    json = JSON.parse(text);
    const empty = json as { units?: unknown; warnings?: unknown };
    if (Array.isArray(empty?.units) && empty.units.length === 0) {
      parseExtractedCurriculum({ ...empty, units: [{ name: 'validation', topics: [{ name: 'validation' }] }] });
    } else json = parseExtractedCurriculum(json);
  } catch { throw new AiError('INVALID_AI_OUTPUT'); }
  return { json, inputTokens: usage(response.usageMetadata?.promptTokenCount),
    outputTokens: outputUsage(response) };
}
