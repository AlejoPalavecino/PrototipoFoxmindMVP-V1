import { isDeepStrictEqual } from 'node:util';
import type { FoxyGroundingFile, FoxyParsedDocument } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import type { FileAccess, FileTransaction } from '../application/contracts.ts';
import { FileError } from '../../domain/errors.ts';
import { createFoxyDocumentReader } from './foxy-document-reader.ts';
import { FileService } from './service.ts';

import type { FoxyDocumentGrant as Grant, AuthorizeDocument as Authorize, FoxyDocumentReader } from '../application/reader-contracts.ts';

type RequestState = { capability: object; signal: AbortSignal; grant: Grant };
function forbidden(): never { throw new FileError('FORBIDDEN'); }
function equal(a: string | null | undefined, b: string | null | undefined): boolean {
  return a?.toLowerCase() === b?.toLowerCase();
}
function validate(grant: Grant): void {
  const { file } = grant;
  if (!file || !['plan', 'material', 'instructions'].includes(file.purpose)
    || (file.purpose === 'instructions' ? !file.targetId : file.targetId !== null)) forbidden();
}
function privateAccess(capabilities: WeakMap<object, RequestState>, authorize: Authorize): FileAccess {
  function get(request: unknown): RequestState {
    const state = request && typeof request === 'object' ? capabilities.get(request) : undefined;
    if (!state || state.signal.aborted) return forbidden();
    return state;
  }
  async function verify(state: RequestState, tx: FileTransaction): Promise<void> {
    const grant = await authorize(state.capability, state.signal, tx);
    if (state.signal.aborted || !isDeepStrictEqual(grant, state.grant)) forbidden();
  }
  return {
    async authenticate(tx, request, action) {
      if (action !== 'read') return forbidden();
      const state = get(request); await verify(state, tx); return state.grant.ownerId;
    },
    async authorize(tx, userId, target, action, request) {
      const state = get(request), { grant } = state;
      if (action !== 'read' || !equal(userId, grant.ownerId) || target.scope.kind !== 'classroom'
        || !equal(target.scope.id, grant.classroomId) || !equal(target.fileId, grant.file.fileId)
        || target.purpose !== grant.file.purpose || !equal(target.targetId, grant.file.targetId)) return forbidden();
      await verify(state, tx);
    },
  };
}
export function createDurableFoxyDocumentReader(options: { files: FileService; authorizeDocument: Authorize }): FoxyDocumentReader {
  if (!options.files?.store || typeof options.authorizeDocument !== 'function') return forbidden();
  const capabilities = new WeakMap<object, RequestState>();
  const files = new FileService({ database: options.files.store.database, access: privateAccess(capabilities, options.authorizeDocument),
    storage: options.files.storage, scanner: options.files.scanner, draftQuotaBytes: options.files.store.draftQuotaBytes });
  const reader = createFoxyDocumentReader({ files });
  return {
    async read(capability: object, signal: AbortSignal): Promise<FoxyParsedDocument> {
      if (signal.aborted) return forbidden();
      const grant = await options.authorizeDocument(capability, signal);
      if (signal.aborted || !grant) return forbidden();
      validate(grant);
      const snapshot = structuredClone(grant), request = Object.freeze({});
      capabilities.set(request, { capability, signal, grant: snapshot });
      try { return await reader.read(request, { classroomId: snapshot.classroomId, file: snapshot.file }, signal); }
      finally { capabilities.delete(request); }
    },
  };
}
