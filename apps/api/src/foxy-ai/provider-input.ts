import type { FoxyPurpose } from '../../../../src/core/domain/index.ts';
import type { FoxyGrounding } from '../../../../src/core/domain/foxy-ai-grounding.ts';

type Topic = { id: string; name: string; status: 'PENDING' | 'NEXT' | 'TAUGHT' };
type Unit = { name: string; topics: Topic[] };
type Source = FoxyGrounding['sources'][number];
type HistoryPair = { user: string; assistant: { title: string; markdown: string } };
type Document = FoxyGrounding['documents'][number];
function invalid(): never { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); }
function key(value: unknown, prefix: 's' | 'd'): string {
  if (typeof value !== 'string' || !new RegExp(`^${prefix}[1-9][0-9]*$`, 'u').test(value)) return invalid();
  return value;
}
function string(value: unknown): string { if (typeof value !== 'string') return invalid(); return value; }
function strings(value: unknown): string[] { if (!Array.isArray(value)) return invalid(); return value.map(string); }
function curriculum(grounding: FoxyGrounding) {
  if (grounding.context.kind === 'GENERAL') {
    if (grounding.curriculum !== null || grounding.sources.length || grounding.documents.length || grounding.referenceMap.length) return invalid();
    return null;
  }
  const data = grounding.curriculum;
  if (!data || !Array.isArray(data.units) || !Array.isArray(data.selectedTopicIds)) return invalid();
  const selected = new Set(data.selectedTopicIds.map(id => string(id).toLowerCase()));
  return { units: (data.units as Unit[]).map(unit => {
    if (!unit || !Array.isArray(unit.topics)) return invalid();
    return { name: string(unit.name), topics: unit.topics.map(topic => {
      if (!topic || !['PENDING', 'NEXT', 'TAUGHT'].includes(topic.status)) return invalid();
      return { name: string(topic.name), status: topic.status, selected: selected.has(string(topic.id).toLowerCase()) };
    }) };
  }) };
}
function source(item: Source) {
  if (!item || !['PLAN', 'MATERIAL', 'ACTIVITY'].includes(item.kind) || !Array.isArray(item.documentKeys)) return invalid();
  return { sourceKey: key(item.sourceKey, 's'), title: string(item.title), kind: item.kind,
    text: string(item.text), documentKeys: item.documentKeys.map(id => key(id, 'd')) };
}
function document(item: Document) {
  if (!item || !item.document || !Array.isArray(item.sourceKeys)) return invalid();
  const content = item.document.kind === 'pdf' && item.document.bytes instanceof Uint8Array
    ? { kind: 'pdf' as const, bytes: new Uint8Array(item.document.bytes) }
    : item.document.kind === 'text' ? { kind: 'text' as const, text: string(item.document.text) } : invalid();
  if (item.pageCount !== null && (!Number.isSafeInteger(item.pageCount) || item.pageCount < 1)) return invalid();
  return { documentKey: key(item.documentKey, 'd'), sourceKeys: item.sourceKeys.map(id => key(id, 's')),
    document: content, pageCount: item.pageCount, warnings: strings(item.warnings) };
}
function history(values: HistoryPair[] | undefined): HistoryPair[] {
  if (values === undefined) return [];
  if (!Array.isArray(values) || values.length > 10) return invalid();
  const clean = (value: unknown, limit: number) => {
    const result = string(value);
    if (!result.trim() || [...result].length > limit || /[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(result)) return invalid();
    return result.replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/giu, '[identificador]');
  };
  const pairs = values.map(pair => {
    if (!pair || !pair.assistant) return invalid();
    return { user: clean(pair.user, 5000), assistant: { title: clean(pair.assistant.title, 200), markdown: clean(pair.assistant.markdown, 50000) } };
  });
  if (Buffer.byteLength(JSON.stringify(pairs), 'utf8') > 262144) return invalid();
  return pairs;
}
export function projectFoxyTextInput(input: { purpose: FoxyPurpose; message: string; grounding: FoxyGrounding; history?: HistoryPair[]; signal: AbortSignal }) {
  input.signal.throwIfAborted();
  const { grounding } = input;
  if (!grounding || !grounding.context || !['GENERAL', 'CLASSROOM'].includes(grounding.context.kind)
    || !Array.isArray(grounding.sources) || !Array.isArray(grounding.documents) || !Array.isArray(grounding.referenceMap)
    || !['CHAT', 'STUDY_MATERIAL', 'REVIEW', 'SUMMARY', 'ACTIVITY_IDEAS', 'LESSON_PLAN'].includes(input.purpose)) return invalid();
  const result = { mode: grounding.context.kind, purpose: input.purpose, message: string(input.message),
    curriculum: curriculum(grounding), sources: grounding.sources.map(source), documents: grounding.documents.map(document),
    warnings: strings(grounding.warnings), history: history(input.history), signal: input.signal };
  input.signal.throwIfAborted();
  return result;
}
