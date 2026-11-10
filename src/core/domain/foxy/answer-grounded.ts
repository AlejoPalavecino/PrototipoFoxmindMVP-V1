import { invalidInput, strictObject } from '../curriculum/plan.ts';
import { activityUuid } from '../activities/activity-generation-values.ts';

export interface FoxyAnswerReferenceMap {
  sources: { sourceKey: string; sourceId: string; documentKeys: string[] }[];
  documents: { documentKey: string; pageCount: number | null }[];
}
export interface GroundedFoxyReference { sourceId: string; documentKey: string | null; page: number | null }
export interface GroundedFoxyAnswer {
  schemaVersion: 'foxy-answer-v1'; title: string; markdown: string; references: GroundedFoxyReference[];
  warnings: string[]; missingInformation: string[];
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || [...value].length > max
    || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value)) return invalidInput();
  return value;
}
function list<T>(value: unknown, max: number, parse: (value: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) return invalidInput();
  return value.map(parse);
}
function index(mapping: FoxyAnswerReferenceMap) {
  if (!mapping || !Array.isArray(mapping.sources) || !Array.isArray(mapping.documents)) return invalidInput();
  const sources = new Map<string, FoxyAnswerReferenceMap['sources'][number]>();
  const documents = new Map<string, FoxyAnswerReferenceMap['documents'][number]>();
  for (const doc of mapping.documents) {
    if (!doc || !/^d[1-9]\d*$/u.test(doc.documentKey) || documents.has(doc.documentKey)
      || (doc.pageCount !== null && (!Number.isSafeInteger(doc.pageCount) || doc.pageCount < 1))) return invalidInput();
    documents.set(doc.documentKey, doc);
  }
  for (const source of mapping.sources) {
    if (!source || !/^s[1-9]\d*$/u.test(source.sourceKey) || sources.has(source.sourceKey)
      || typeof source.sourceId !== 'string' || !/^(plan|material|activity):/u.test(source.sourceId)
      || !Array.isArray(source.documentKeys)) return invalidInput();
    activityUuid(source.sourceId.slice(source.sourceId.indexOf(':') + 1));
    if (new Set(source.documentKeys).size !== source.documentKeys.length
      || source.documentKeys.some(key => !documents.has(key))) return invalidInput();
    sources.set(source.sourceKey, source);
  }
  return { sources, documents };
}
function reference(value: unknown, map: ReturnType<typeof index>): GroundedFoxyReference {
  const v = strictObject(value, ['sourceKey', 'documentKey', 'page']);
  if (typeof v.sourceKey !== 'string') return invalidInput();
  const source = map.sources.get(v.sourceKey);
  if (!source) return invalidInput();
  if (v.documentKey === null) {
    if (v.page !== null) return invalidInput();
    return { sourceId: source.sourceId, documentKey: null, page: null };
  }
  if (typeof v.documentKey !== 'string' || !source.documentKeys.includes(v.documentKey)) return invalidInput();
  const document = map.documents.get(v.documentKey);
  if (!document || (v.page !== null && (typeof v.page !== 'number' || !Number.isSafeInteger(v.page)
    || document.pageCount === null || v.page < 1 || v.page > document.pageCount))) return invalidInput();
  return { sourceId: source.sourceId, documentKey: v.documentKey, page: v.page as number | null };
}
export function parseGroundedFoxyAnswer(value: unknown, mapping: FoxyAnswerReferenceMap): GroundedFoxyAnswer {
  const v = strictObject(value, ['schemaVersion', 'title', 'markdown', 'references', 'warnings', 'missingInformation']);
  if (v.schemaVersion !== 'foxy-answer-v1') return invalidInput();
  const map = index(mapping);
  return { schemaVersion: v.schemaVersion, title: text(v.title, 200), markdown: text(v.markdown, 50000),
    references: list(v.references, 100, item => reference(item, map)), warnings: list(v.warnings, 10, item => text(item, 500)),
    missingInformation: list(v.missingInformation, 10, item => text(item, 500)) };
}
