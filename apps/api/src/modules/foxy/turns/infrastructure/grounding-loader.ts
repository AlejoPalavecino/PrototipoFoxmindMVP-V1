import type { FoxyGrounding, FoxyGroundingFile, FoxyGroundingSnapshot, FoxyParsedDocument } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import { assembleFoxyGrounding } from './assemble-grounding.ts';

type Snapshots = { revalidate(request: unknown, conversationId: string, snapshot: FoxyGroundingSnapshot): Promise<boolean> };
type Documents = { read(request: unknown, descriptor: { classroomId: string; file: FoxyGroundingFile }, signal: AbortSignal): Promise<FoxyParsedDocument> };
function fail(code: 'INVALID_INPUT' | 'CONFLICT' | 'AI_INPUT_LIMIT'): never {
  throw Object.assign(new Error(code), { code });
}
function filesFor(snapshot: FoxyGroundingSnapshot): FoxyGroundingFile[] {
  if (!snapshot || !Array.isArray(snapshot.sources)) return fail('INVALID_INPUT');
  const files = new Map<string, FoxyGroundingFile>();
  for (const source of snapshot.sources) {
    if (!Array.isArray(source.files)) return fail('INVALID_INPUT');
    for (const file of source.files) {
      if (typeof file.fileId !== 'string' || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 1) return fail('INVALID_INPUT');
      const id = file.fileId.toLowerCase(), existing = files.get(id);
      if (existing && (existing.digest !== file.digest || existing.extension !== file.extension || existing.sizeBytes !== file.sizeBytes
        || existing.purpose !== file.purpose || existing.targetId !== file.targetId)) return fail('CONFLICT');
      files.set(id, file);
    }
  }
  const result = [...files.values()];
  if (result.length > 6 || result.reduce((sum, file) => sum + file.sizeBytes, 0) > 20000000) return fail('AI_INPUT_LIMIT');
  return result;
}
export class FoxyGroundingLoader {
  private readonly ports: { snapshots: Snapshots; documents: Documents };
  constructor(ports: { snapshots: Snapshots; documents: Documents }) { this.ports = ports; }
  async load(request: unknown, conversationId: string, snapshot: FoxyGroundingSnapshot, signal: AbortSignal): Promise<FoxyGrounding> {
    signal.throwIfAborted();
    if (!await this.ports.snapshots.revalidate(request, conversationId, snapshot)) return fail('CONFLICT');
    signal.throwIfAborted();
    const files = filesFor(snapshot), parsed: FoxyParsedDocument[] = [];
    if (files.length && snapshot.context.kind !== 'CLASSROOM') return fail('INVALID_INPUT');
    for (const file of files) {
      signal.throwIfAborted();
      if (snapshot.context.kind !== 'CLASSROOM') return fail('INVALID_INPUT');
      parsed.push(await this.ports.documents.read(request, { classroomId: snapshot.context.classroomId, file }, signal));
      signal.throwIfAborted();
    }
    if (!await this.ports.snapshots.revalidate(request, conversationId, snapshot)) return fail('CONFLICT');
    signal.throwIfAborted();
    return assembleFoxyGrounding(snapshot, parsed);
  }
}
