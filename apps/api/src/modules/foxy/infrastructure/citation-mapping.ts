import { isDeepStrictEqual } from 'node:util';
import type { FoxyAnswer } from '../../../../../../src/core/domain/foxy/resource.ts';
import type { FoxyGroundingFile, FoxyGroundingSnapshot } from '../../../../../../src/core/domain/foxy/grounding.ts';

type Mapping = { sourceKey: string; sourceId: string; documentKeys: string[] };
type Citation = { sourceId: string; documentKey: string | null; page: number | null };
type Report = { sourceKey: string; title: string; kind: string; documentKeys: string[]; citations: Citation[] };
type Result = { citationKey: string; sourceId: string; sourceTitle: string | null; sourceKind: string | null;
  documentKey: string | null; page: number | null; available: boolean; file: FoxyGroundingFile | null };
type Source = FoxyGroundingSnapshot['sources'][number];
type SourceInfo = { source: Source; sourceKey: string; keys: string[]; valid: boolean };
function sameIds(a: string[], b: string[]): boolean { return a.length === b.length && a.every((x, i) => x === b[i]); }
function indexSources(snapshot: FoxyGroundingSnapshot): Map<string, SourceInfo> {
  const files = new Map<string, string>(), descriptors = new Map<string, FoxyGroundingFile>(), invalidFiles = new Set<string>();
  const sources = new Map<string, SourceInfo>();
  for (const [index, source] of snapshot.sources.entries()) {
    const keys: string[] = [];
    for (const file of source.files) {
      const id = file.fileId.toLowerCase();
      if (!files.has(id)) { files.set(id, `d${files.size + 1}`); descriptors.set(id, file); }
      else if (!isDeepStrictEqual(descriptors.get(id), file)) invalidFiles.add(id);
      keys.push(files.get(id)!);
    }
    const prefix = source.kind.toLowerCase(), sourceId = source.sourceId.toLowerCase();
    const kindValid = ['PLAN', 'MATERIAL', 'ACTIVITY'].includes(source.kind)
      && new RegExp(`^${prefix}:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$`, 'u').test(sourceId);
    const target = source.kind === 'ACTIVITY' ? sourceId.slice(sourceId.indexOf(':') + 1) : null;
    const purpose = source.kind === 'ACTIVITY' ? 'instructions' : prefix;
    const valid = kindValid && ((source.kind === 'ACTIVITY') || source.files.length === 1)
      && source.files.every(file => file.purpose === purpose && (file.targetId?.toLowerCase() ?? null) === target);
    if (sources.has(sourceId)) sources.get(sourceId)!.valid = false;
    else sources.set(sourceId, { source, sourceKey: `s${index + 1}`, keys, valid });
  }
  for (const info of sources.values()) if (info.source.files.some(file => invalidFiles.has(file.fileId.toLowerCase()))) info.valid = false;
  return sources;
}
function reportFor(sourceId: string, info: SourceInfo, map: Mapping[], reports: Report[]): Report | null {
  const sourceIndex = [...map].filter(entry => entry.sourceId.toLowerCase() === sourceId.toLowerCase());
  if (sourceIndex.length !== 1 || !info.valid) return null;
  const entry = sourceIndex[0]!;
  if (entry.sourceKey !== info.sourceKey) return null;
  const matching = reports.filter(report => report.sourceKey === entry.sourceKey);
  if (matching.length !== 1 || !Array.isArray(entry.documentKeys) || !sameIds(entry.documentKeys, info.keys)) return null;
  const report = matching[0]!;
  if (report.title !== info.source.title || report.kind !== info.source.kind || !Array.isArray(report.documentKeys)
    || !sameIds(report.documentKeys, info.keys) || !Array.isArray(report.citations)) return null;
  return report;
}
export function mapFoxyCitations(input: { answer: FoxyAnswer; sourceReport: Report[]; referenceMap: Mapping[]; snapshot: FoxyGroundingSnapshot }): Result[] {
  const refs = Array.isArray(input.answer?.references) ? input.answer.references : [];
  const sources = input.snapshot && Array.isArray(input.snapshot.sources) ? indexSources(input.snapshot) : new Map<string, SourceInfo>();
  const reports = Array.isArray(input.sourceReport) ? input.sourceReport : [], mappings = Array.isArray(input.referenceMap) ? input.referenceMap : [];
  const positions = new Map<string, number>();
  return refs.map((reference, index) => {
    const normalized = reference.sourceId.toLowerCase();
    const info = sources.get(normalized), report = info && reportFor(reference.sourceId, info, mappings, reports);
    const position = positions.get(normalized) ?? 0; positions.set(normalized, position + 1);
    const citation = report?.citations[position];
    const fileIndex = citation && info ? info.keys.indexOf(citation.documentKey ?? '') : -1;
    const valid = Boolean(info && report && citation && report.citations.length === refs.filter(ref => ref.sourceId.toLowerCase() === normalized).length
      && citation.sourceId.toLowerCase() === normalized && citation.page === reference.page
      && ((citation.documentKey === null && citation.page === null) || (fileIndex >= 0
        && (citation.page === null || (Number.isSafeInteger(citation.page) && citation.page > 0)))));
    return { citationKey: `c${index + 1}`, sourceId: reference.sourceId, sourceTitle: info?.source.title ?? null,
      sourceKind: info?.source.kind ?? null, documentKey: valid ? citation!.documentKey : null, page: reference.page,
      available: valid, file: valid && fileIndex >= 0 ? structuredClone(info!.source.files[fileIndex]!) : null };
  });
}
