import { isDeepStrictEqual } from 'node:util';
import type { FoxyGrounding, FoxyGroundingFile, FoxyGroundingSnapshot, FoxyParsedDocument } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import type { FoxyClaimScope } from './claim-authority.ts';
import { assembleFoxyGrounding } from './assemble-grounding.ts';

type Claim = { ownerId: string; conversationId: string; snapshot: FoxyGroundingSnapshot };
type Descriptor = { classroomId: string; file: FoxyGroundingFile };
type Authority = { authorizeClaim(capability: object, signal: AbortSignal): Promise<Claim>;
  authorizeDocument(capability: object, signal: AbortSignal): Promise<Descriptor & { ownerId: string; conversationId: string }>;
  revalidateGrounding(capability: object, signal: AbortSignal): Promise<boolean> };
type Documents = { read(capability: object, signal: AbortSignal): Promise<FoxyParsedDocument> };
function fail(code: 'INVALID_INPUT' | 'CONFLICT' | 'AI_INPUT_LIMIT' | 'FORBIDDEN'): never {
  throw Object.assign(new Error(code), { code });
}
function selectedFiles(snapshot: FoxyGroundingSnapshot): Descriptor[] {
  if (!snapshot || !Array.isArray(snapshot.sources) || !snapshot.context) return fail('INVALID_INPUT');
  const files: Descriptor[] = [];
  for (const source of snapshot.sources) {
    if (!Array.isArray(source.files)) return fail('INVALID_INPUT');
    for (const file of source.files) {
      if (snapshot.context.kind !== 'CLASSROOM' || typeof file.fileId !== 'string'
        || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 1) return fail('INVALID_INPUT');
      files.push({ classroomId: snapshot.context.classroomId, file });
    }
  }
  const unique = new Map<string, FoxyGroundingFile>();
  for (const { file } of files) {
    const id = file.fileId.toLowerCase(), existing = unique.get(id);
    if (existing && !isDeepStrictEqual(existing, file)) return fail('CONFLICT');
    unique.set(id, file);
  }
  if (unique.size > 6 || [...unique.values()].reduce((sum, file) => sum + file.sizeBytes, 0) > 20000000) return fail('AI_INPUT_LIMIT');
  return files;
}
export function createFoxyDurableLoader(options: { authority: Authority; documents: Documents }) {
  return {
    async load(scope: FoxyClaimScope, signal: AbortSignal): Promise<FoxyGrounding> {
      signal.throwIfAborted();
      if (!scope || !scope.capability || !Array.isArray(scope.documents)) return fail('INVALID_INPUT');
      const capability = scope.capability, visible = structuredClone(scope.snapshot);
      const docs = scope.documents.map(entry => ({ capability: entry.capability, descriptor: structuredClone(entry.descriptor) }));
      const claim = await options.authority.authorizeClaim(capability, signal);
      signal.throwIfAborted();
      if (!isDeepStrictEqual(visible, claim.snapshot)) return fail('FORBIDDEN');
      const expected = selectedFiles(claim.snapshot);
      if (expected.length !== docs.length) return fail('FORBIDDEN');
      const unmatched = [...expected];
      for (const entry of docs) {
        const grant = await options.authority.authorizeDocument(entry.capability, signal);
        signal.throwIfAborted();
        if (grant.ownerId !== claim.ownerId || grant.conversationId !== claim.conversationId) return fail('FORBIDDEN');
        const descriptor = { classroomId: grant.classroomId, file: grant.file };
        const index = unmatched.findIndex(item => isDeepStrictEqual(item, descriptor));
        if (index < 0 || !isDeepStrictEqual(entry.descriptor, descriptor)) return fail('FORBIDDEN');
        unmatched.splice(index, 1);
      }
      if (!await options.authority.revalidateGrounding(capability, signal)) return fail('CONFLICT');
      signal.throwIfAborted();
      const parsed: FoxyParsedDocument[] = [], seen = new Set<string>();
      for (const entry of docs) {
        const id = entry.descriptor.file.fileId.toLowerCase();
        if (seen.has(id)) continue;
        seen.add(id); parsed.push(await options.documents.read(entry.capability, signal)); signal.throwIfAborted();
      }
      if (!await options.authority.revalidateGrounding(capability, signal)) return fail('CONFLICT');
      signal.throwIfAborted();
      const after = await options.authority.authorizeClaim(capability, signal);
      if (!isDeepStrictEqual(after, claim)) return fail('CONFLICT');
      signal.throwIfAborted();
      return assembleFoxyGrounding(claim.snapshot, parsed);
    },
  };
}
