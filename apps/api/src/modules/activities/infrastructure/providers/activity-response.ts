import type { GenerateContentResponse } from '@google/genai';
import { parseActivityProposal, strictObject, type ActivityGenerationInput } from '../../../../../../../src/core/domain/index.ts';
import { AiError } from '../../../../platform/ai/errors.ts';

const usage = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
export function activityResponse(response: GenerateContentResponse, input: ActivityGenerationInput) {
  const text = response.text;
  if (response.promptFeedback?.blockReason || response.candidates?.length !== 1 || response.candidates[0]?.finishReason !== 'STOP'
    || typeof text !== 'string' || Buffer.byteLength(text) > 262144) throw new AiError('INVALID_AI_OUTPUT');
  let json: unknown;
  try {
    const raw = JSON.parse(text);
    if (raw?.status === 'INSUFFICIENT_CONTENT') {
      const v = strictObject(raw, ['status', 'missingInformation']);
      if (!Array.isArray(v.missingInformation) || v.missingInformation.length < 1 || v.missingInformation.length > 10
        || v.missingInformation.some(s => typeof s !== 'string' || !s.trim() || [...s].length > 500)) throw new Error();
      json = v;
    } else {
      const v = strictObject(raw, ['status', 'proposal']);
      if (v.status !== 'READY') throw new Error();
      json = { status: 'READY', proposal: parseActivityProposal(v.proposal, { type: input.type, counts: input.counts,
        sourceIds: input.sources.map(s => s.sourceId), context: input.context,
        pdfPageCounts: Object.fromEntries(input.sources.filter(s => s.pageCount !== null).map(s => [s.sourceId, s.pageCount!])) }) };
    }
  }
  catch { throw new AiError('INVALID_AI_OUTPUT'); }
  const output = usage(response.usageMetadata?.candidatesTokenCount);
  const thoughts = response.usageMetadata?.thoughtsTokenCount === undefined ? 0 : usage(response.usageMetadata.thoughtsTokenCount);
  return { json, inputTokens: usage(response.usageMetadata?.promptTokenCount),
    outputTokens: output === null || thoughts === null ? null : usage(output + thoughts) };
}
