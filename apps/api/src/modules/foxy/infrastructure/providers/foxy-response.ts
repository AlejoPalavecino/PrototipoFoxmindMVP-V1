import type { GenerateContentResponse } from '@google/genai';
import { strictObject, type FoxyTextInput, type FoxyTextResponse } from '../../../../../../../src/core/domain/index.ts';
import { AiError } from '../../../../platform/ai/errors.ts';

function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.trim()) || [...value].length > max
    || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value)) throw new Error();
  return value;
}
function list<T>(value: unknown, max: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) throw new Error();
  return value.map(parse);
}
function reference(value: unknown, input: FoxyTextInput): FoxyTextResponse['references'][number] {
  const v = strictObject(value, ['sourceKey', 'documentKey', 'page']);
  const source = input.sources.find(item => item.sourceKey === v.sourceKey);
  if (!source || typeof v.sourceKey !== 'string') throw new Error();
  if (v.documentKey === null) {
    if (v.page !== null) throw new Error();
    return { sourceKey: v.sourceKey, documentKey: null, page: null };
  }
  if (typeof v.documentKey !== 'string' || !source.documentKeys.includes(v.documentKey)) throw new Error();
  const doc = input.documents.find(item => item.documentKey === v.documentKey && item.sourceKeys.includes(v.sourceKey as string));
  if (!doc || (v.page !== null && (typeof v.page !== 'number' || !Number.isSafeInteger(v.page)
    || doc.pageCount === null || v.page < 1 || v.page > doc.pageCount))) throw new Error();
  return { sourceKey: v.sourceKey, documentKey: v.documentKey, page: v.page as number | null };
}
function parse(value: unknown, input: FoxyTextInput): FoxyTextResponse {
  const v = strictObject(value, ['schemaVersion', 'status', 'title', 'markdown', 'references', 'warnings', 'missingInformation']);
  if (v.schemaVersion !== 'foxy-text-response-v1' || (v.status !== 'READY' && v.status !== 'INSUFFICIENT_CONTENT')) throw new Error();
  const title = text(v.title, 200), markdown = text(v.markdown, 50000, v.status === 'INSUFFICIENT_CONTENT');
  const references = list(v.references, 100, item => reference(item, input));
  const warnings = list(v.warnings, 10, item => text(item, 500)), missingInformation = list(v.missingInformation, 10, item => text(item, 500));
  if (v.status === 'READY' ? missingInformation.length !== 0 : markdown !== '' || references.length !== 0 || !missingInformation.length) throw new Error();
  return { schemaVersion: v.schemaVersion, status: v.status, title, markdown, references, warnings, missingInformation };
}
const usage = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
export function foxyResponse(response: GenerateContentResponse, input: FoxyTextInput) {
  if (response.promptFeedback?.blockReason || response.candidates?.length !== 1 || response.candidates[0]?.finishReason !== 'STOP'
    || typeof response.text !== 'string' || Buffer.byteLength(response.text) > 262144) throw new AiError('INVALID_AI_OUTPUT');
  let json: FoxyTextResponse;
  try { json = parse(JSON.parse(response.text), input); } catch { throw new AiError('INVALID_AI_OUTPUT'); }
  const output = usage(response.usageMetadata?.candidatesTokenCount);
  const thoughts = response.usageMetadata?.thoughtsTokenCount === undefined ? 0 : usage(response.usageMetadata.thoughtsTokenCount);
  return { json, inputTokens: usage(response.usageMetadata?.promptTokenCount),
    outputTokens: output === null || thoughts === null ? null : usage(output + thoughts) };
}
