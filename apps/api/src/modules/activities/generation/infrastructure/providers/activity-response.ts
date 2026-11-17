import type { AiTextResult } from '../../../../../platform/ai/text-contract.ts';
import { sdkTextResult } from '../../../../../platform/ai/sdk-text-compat.ts';
import type { GenerateContentResponse } from '@google/genai';
import { parseActivityProposal } from '../../../../../../../../src/core/domain/activities/activity-proposal.ts';
import { strictObject } from '../../../../../../../../src/core/domain/curriculum/plan.ts';
import { type ActivityGenerationInput } from '../../../../../../../../src/core/domain/activities/activity-generation.ts';
import { AiError } from '../../../../../platform/ai/errors.ts';

const usage = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
export function activityResponse(response: GenerateContentResponse | AiTextResult, input: ActivityGenerationInput) {
  const result = 'finish' in response ? response : sdkTextResult(response);
  const text = result.text;
  if (result.finish !== 'stop'
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
        sourceIds: input.sources.map(s => s.sourceId),
        context: input.context.trim() ? input.context : input.teacherBrief ?? '',
        pdfPageCounts: Object.fromEntries(input.sources.filter(s => s.pageCount !== null).map(s => [s.sourceId, s.pageCount!])) }) };
    }
  }
  catch { throw new AiError('INVALID_AI_OUTPUT'); }
  const output = result.usage.outputTokens;
  const thoughts = 0;
  return { json, inputTokens: result.usage.inputTokens,
    outputTokens: output === null || thoughts === null ? null : usage(output + thoughts) };
}
