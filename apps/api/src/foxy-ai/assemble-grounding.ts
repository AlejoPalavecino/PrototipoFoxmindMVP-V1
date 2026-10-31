import { createHash } from 'node:crypto';
import type { FoxyGrounding, FoxyGroundingFile, FoxyGroundingSnapshot, FoxyParsedDocument } from '../../../../src/core/domain/foxy-ai-grounding.ts';

function fail(code: 'INVALID_INPUT' | 'FILE_NOT_READY' | 'AI_INPUT_LIMIT'): never {
  throw Object.assign(new Error(code), { code });
}
function sameFile(a: FoxyGroundingFile, b: FoxyGroundingFile): boolean {
  return a.digest === b.digest && a.extension === b.extension && a.sizeBytes === b.sizeBytes
    && a.purpose === b.purpose && a.targetId === b.targetId;
}
function checkDocument(file: FoxyGroundingFile, parsed: FoxyParsedDocument): void {
  if (parsed.digest !== file.digest || !/^[a-f0-9]{64}$/u.test(file.digest)) fail('FILE_NOT_READY');
  if (!Array.isArray(parsed.warnings)) fail('INVALID_INPUT');
  if (file.extension === 'pdf') {
    if (!Number.isSafeInteger(parsed.pageCount) || parsed.pageCount! < 1) fail('INVALID_INPUT');
    if (parsed.document?.kind !== 'pdf' || !(parsed.document.bytes instanceof Uint8Array)
      || parsed.document.bytes.length !== file.sizeBytes || createHash('sha256').update(parsed.document.bytes).digest('hex') !== file.digest) fail('FILE_NOT_READY');
  } else if (file.extension === 'docx') {
    if (parsed.pageCount !== null || !parsed.warnings.includes('DOCX_IMAGES_OMITTED')) fail('INVALID_INPUT');
    if (parsed.document?.kind !== 'text' || typeof parsed.document.text !== 'string') fail('FILE_NOT_READY');
  } else fail('FILE_NOT_READY');
}
function collect(snapshot: FoxyGroundingSnapshot): Map<string, FoxyGroundingFile> {
  const files = new Map<string, FoxyGroundingFile>(), sources = new Set<string>();
  let sourceCharacters = 0;
  for (const source of snapshot.sources) {
    if (sources.has(source.sourceId.toLowerCase()) || !Array.isArray(source.files) || typeof source.text !== 'string') fail('INVALID_INPUT');
    sources.add(source.sourceId.toLowerCase()); sourceCharacters += [...source.text].length;
    if ((source.kind === 'PLAN' || source.kind === 'MATERIAL') && source.files.length !== 1) fail('FILE_NOT_READY');
    const expectedPrefix = source.kind.toLowerCase();
    if (!['PLAN', 'MATERIAL', 'ACTIVITY'].includes(source.kind)) fail('INVALID_INPUT');
    if (!new RegExp(`^${expectedPrefix}:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$`, 'iu').test(source.sourceId)) fail('FILE_NOT_READY');
    for (const file of source.files) {
      const expectedPurpose = source.kind === 'ACTIVITY' ? 'instructions' : expectedPrefix;
      const expectedTarget = source.kind === 'ACTIVITY' ? source.sourceId.slice(source.sourceId.indexOf(':') + 1).toLowerCase() : null;
      if (file.purpose !== expectedPurpose || (file.targetId?.toLowerCase() ?? null) !== expectedTarget) fail('FILE_NOT_READY');
      const id = file.fileId.toLowerCase(), prior = files.get(id);
      if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 1) fail('FILE_NOT_READY');
      if (prior && !sameFile(prior, file)) fail('FILE_NOT_READY');
      files.set(id, file);
    }
  }
  if (sourceCharacters > 100000 || files.size > 6 || [...files.values()].reduce((sum, file) => sum + file.sizeBytes, 0) > 20000000) fail('AI_INPUT_LIMIT');
  return files;
}
function validatedDocuments(files: Map<string, FoxyGroundingFile>, parsed: FoxyParsedDocument[]) {
  const results = new Map<string, FoxyParsedDocument>();
  let pages = 0, characters = 0;
  for (const item of parsed) {
    const id = item.fileId.toLowerCase(), file = files.get(id);
    if (!file || results.has(id)) fail('INVALID_INPUT');
    checkDocument(file, item); results.set(id, item);
    pages += item.pageCount ?? 0;
    if (item.document.kind === 'text') characters += [...item.document.text].length;
  }
  if (results.size !== files.size) fail('FILE_NOT_READY');
  if (pages > 100 || characters > 200000) fail('AI_INPUT_LIMIT');
  return results;
}
export function assembleFoxyGrounding(snapshot: FoxyGroundingSnapshot, parsed: FoxyParsedDocument[]): FoxyGrounding {
  if (!snapshot || !Array.isArray(snapshot.sources) || !Array.isArray(parsed)) fail('INVALID_INPUT');
  if ((snapshot.context?.kind === 'GENERAL' && (snapshot.curriculum !== null || snapshot.sources.length))
    || (snapshot.context?.kind === 'CLASSROOM' && !snapshot.curriculum)
    || !['GENERAL', 'CLASSROOM'].includes(snapshot.context?.kind)) fail('INVALID_INPUT');
  const files = collect(snapshot), validated = validatedDocuments(files, parsed);
  const keys = new Map([...files.keys()].map((id, i) => [id, `d${i + 1}`]));
  const sources = snapshot.sources.map((source, i) => ({ sourceKey: `s${i + 1}`, title: source.title, kind: source.kind,
    text: source.text, documentKeys: source.files.map(file => keys.get(file.fileId.toLowerCase())!) }));
  const documents = [...validated].map(([id, item]) => ({ documentKey: keys.get(id)!,
    sourceKeys: sources.filter(source => source.documentKeys.includes(keys.get(id)!)).map(source => source.sourceKey),
    document: item.document, pageCount: item.pageCount, warnings: item.warnings }));
  return { context: snapshot.context, curriculum: snapshot.curriculum, sources, documents, referenceMap: sources.map((source, i) => ({ sourceKey: source.sourceKey,
    sourceId: snapshot.sources[i]!.sourceId, documentKeys: source.documentKeys })),
    warnings: [...new Set(documents.flatMap(doc => doc.warnings))] };
}
