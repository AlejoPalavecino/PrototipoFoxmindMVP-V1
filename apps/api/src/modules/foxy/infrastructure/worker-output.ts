import { parseFoxyAnswer, strictObject, type FoxyTextResponse } from '../../../../../../src/core/domain/index.ts';
import type { FoxyGrounding } from '../../../../../../src/core/domain/foxy/grounding.ts';

function invalid(): never { throw Object.assign(new Error('INVALID_AI_OUTPUT'), { code: 'INVALID_AI_OUTPUT' }); }
function lines(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 10 || value.some(x => typeof x !== 'string' || !x.trim() || [...x].length > 500)) return invalid();
  return value;
}
export function workerAnswer(value: unknown, grounding: FoxyGrounding) {
  let response: Record<string, unknown>;
  try { response = strictObject(value, ['schemaVersion', 'status', 'title', 'markdown', 'references', 'warnings', 'missingInformation']); }
  catch { return invalid(); }
  if (response.schemaVersion !== 'foxy-text-response-v1' || !['READY', 'INSUFFICIENT_CONTENT'].includes(String(response.status))
    || typeof response.title !== 'string' || !response.title.trim() || [...response.title].length > 200
    || typeof response.markdown !== 'string' || [...response.markdown].length > 50000 || !Array.isArray(response.references)
    || response.references.length > 100) return invalid();
  const warnings = lines(response.warnings), missingInformation = lines(response.missingInformation);
  if (response.status === 'READY' ? !response.markdown.trim() || missingInformation.length > 0
    : response.markdown !== '' || response.references.length > 0 || !missingInformation.length) return invalid();
  const citations = response.references.map((raw: unknown) => {
    let ref: Record<string, unknown>;
    try { ref = strictObject(raw, ['sourceKey', 'documentKey', 'page']); } catch { return invalid(); }
    const mapping = grounding.referenceMap.find(source => source.sourceKey === ref.sourceKey);
    if (!mapping || (ref.documentKey !== null && (typeof ref.documentKey !== 'string' || !mapping.documentKeys.includes(ref.documentKey)))) return invalid();
    const document = ref.documentKey === null ? null : grounding.documents.find(doc => doc.documentKey === ref.documentKey
      && doc.sourceKeys.includes(mapping.sourceKey));
    if (ref.documentKey !== null && !document) return invalid();
    if (ref.page !== null && (typeof ref.page !== 'number' || !Number.isSafeInteger(ref.page) || ref.page < 1
      || !document || document.pageCount === null || ref.page > document.pageCount)) return invalid();
    return { sourceId: mapping.sourceId, documentKey: ref.documentKey as string | null, page: ref.page as number | null };
  });
  const markdown = response.status === 'INSUFFICIENT_CONTENT' ? missingInformation.join('\n') : response.markdown;
  try {
    const references = citations.map(({ sourceId, page }) => ({ sourceId, page }));
    const answer = parseFoxyAnswer({ schemaVersion: 'foxy-answer-v1', title: response.title, markdown, references,
      warnings: [...warnings, ...grounding.warnings], missingInformation });
    return { answer, citations };
  } catch { return invalid(); }
}
export type WorkerResponse = FoxyTextResponse;
