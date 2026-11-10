import type { FoxyPublicationFiles } from '../application/reader-contracts.ts';
import { createHash } from 'node:crypto';
import type { FoxyPublicationArtifact } from '../../../../../../src/core/domain/index.ts';
import { isDeepStrictEqual } from 'node:util';
import { FileService } from './service.ts';
import { requireReady } from '../domain/readiness.ts';
import { FileError } from '../domain/errors.ts';
import { targetOf } from './store.ts';
import type { FileAccess, FileTransaction } from '../application/contracts.ts';
import type { FoxyPublicationAuthorityPort, FoxyPublicationFileAllocatorPort } from '../../foxy/public.ts';

type Authority = FoxyPublicationAuthorityPort;
type Claim = Awaited<ReturnType<Authority['authorize']>>;
type Grant = Awaited<ReturnType<Authority['authorizeFile']>>;
type RequestState = { capability: object; signal: AbortSignal; grant: Claim | Grant; kind: 'claim' | 'file' };
function forbidden(): never { throw new FileError('FORBIDDEN'); }
function privateAccess(states: WeakMap<object, RequestState>, authority: Authority): FileAccess {
  async function verify(tx: FileTransaction, request: unknown): Promise<RequestState> {
    const state = request && typeof request === 'object' ? states.get(request) : undefined;
    if (!state || state.signal.aborted) return forbidden();
    const fresh = state.kind === 'claim' ? await authority.authorize(state.capability, state.signal, tx)
      : await authority.authorizeFile(state.capability, state.signal, tx);
    if (state.signal.aborted || !isDeepStrictEqual(fresh, state.grant)) return forbidden();
    return state;
  }
  return {
    async authenticate(tx, request, action) {
      if (!['upload', 'read'].includes(action)) return forbidden();
      return (await verify(tx, request)).grant.ownerId;
    },
    async authorize(tx, userId, target, action, request) {
      const initial = request && typeof request === 'object' ? states.get(request) : undefined;
      if (!initial || initial.signal.aborted) return forbidden();
      if (initial.kind === 'file' && action === 'upload') await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123003)');
      const state = await verify(tx, request), grant = state.grant;
      if (userId !== grant.ownerId || target.scope.kind !== 'classroom' || target.scope.id !== grant.classroomId
        || target.purpose !== 'material' || target.targetId !== null || !['upload', 'read'].includes(action)) return forbidden();
      if (state.kind === 'file' && target.fileId !== (grant as Grant).fileId) return forbidden();
      if (state.kind === 'claim' && (action !== 'upload' || target.fileId)) return forbidden();
    },
  };
}
export function createDurableFoxyPublicationFiles(options: { files: FileService; authority: Authority; createAllocator(files: FileService, access: FileAccess): FoxyPublicationFileAllocatorPort }): FoxyPublicationFiles {
  if (!options.files?.store || !options.authority) return forbidden();
  const states = new WeakMap<object, RequestState>(), access = privateAccess(states, options.authority);
  const files = new FileService({ database: options.files.store.database, access, storage: options.files.storage,
    scanner: options.files.scanner, draftQuotaBytes: options.files.store.draftQuotaBytes });
  const allocator = options.createAllocator(files, access);
  let receiving = false;
  async function withRequest<T>(capability: object, signal: AbortSignal, kind: 'claim' | 'file', operation: (request: object, grant: Claim | Grant) => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    const grant = kind === 'claim' ? await options.authority.authorize(capability, signal) : await options.authority.authorizeFile(capability, signal);
    signal.throwIfAborted(); const snapshot = structuredClone(grant), request = Object.freeze({});
    states.set(request, { capability, signal, grant: snapshot, kind });
    try { const result = await operation(request, snapshot); signal.throwIfAborted();
      const after = kind === 'claim' ? await options.authority.authorize(capability, signal) : await options.authority.authorizeFile(capability, signal);
      if (signal.aborted || !isDeepStrictEqual(snapshot, after)) return forbidden(); return result;
    } finally { states.delete(request); }
  }
  return {
    ensureFile: (capability: object, artifact: FoxyPublicationArtifact, signal: AbortSignal) => {
      const copy = { ...artifact };
      return withRequest(capability, signal, 'claim', (request, grant) => allocator.ensureFile(request, grant, copy, signal));
    },
    receive: async (capability: object, bytes: Uint8Array, signal: AbortSignal) => {
      signal.throwIfAborted();
      if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > 20000000) return forbidden();
      if (receiving) throw new FileError('SERVICE_UNAVAILABLE');
      receiving = true;
      const copy = Buffer.from(bytes);
      try { return await withRequest(capability, signal, 'file', async (request, value) => {
        const grant = value as Grant;
        if (copy.length !== grant.sizeBytes || createHash('sha256').update(copy).digest('hex') !== grant.digest) return forbidden();
        const guardedStorage = { ...options.files.storage, put: async (key: string, input: Buffer) => {
          const fresh = await options.authority.authorizeFile(capability, signal);
          if (!isDeepStrictEqual(fresh, grant) || signal.aborted) return forbidden();
          return options.files.storage.put(key, input);
        }, get: options.files.storage.get.bind(options.files.storage), remove: options.files.storage.remove.bind(options.files.storage) };
        const receiver = new FileService({ database: options.files.store.database, access, storage: guardedStorage,
          scanner: options.files.scanner, draftQuotaBytes: options.files.store.draftQuotaBytes });
        return receiver.receive(request, grant.fileId, copy);
      }); } finally { receiving = false; }
    },
    inspect: (capability: object, signal: AbortSignal) => withRequest(capability, signal, 'file', async (request, value) => {
      const grant = value as Grant;
      return files.store.transaction(async tx => {
        const initial = await files.store.load(tx, grant.fileId);
        if (initial.blob_deleted_at) {
          await files.store.authorize(tx, request, targetOf(initial), 'read');
          return 'UNAVAILABLE' as const;
        }
        const row = await files.store.loadAuthorized(tx, request, grant.fileId, 'read');
        if (row.blob_deleted_at || Number(row.size_bytes) !== grant.sizeBytes || (row.digest !== null && row.digest !== grant.digest)) return 'UNAVAILABLE' as const;
        if (row.phase === 'ready') {
          try { requireReady(row); return row.digest === grant.digest ? 'READY' as const : 'UNAVAILABLE' as const; }
          catch { return 'UNAVAILABLE' as const; }
        }
        if (['receiving', 'inspecting'].includes(row.phase)) {
          const now = await files.store.now(tx);
          if (row.lease_until && row.lease_until > now) return 'BUSY' as const;
        }
        return ['reserved', 'receiving', 'inspecting'].includes(row.phase) && !row.reservation_released_at
          && !['COMPLETED', 'CANCELLED'].includes(row.upload_status) ? 'RECEIVABLE' as const : 'UNAVAILABLE' as const;
      });
    }),
    proof: (capability: object, signal: AbortSignal) => withRequest(capability, signal, 'file', async (request, value) => {
      const grant = value as Grant;
      const read = await files.read(request, grant.fileId, 'download');
      if (read.bytes.length !== grant.sizeBytes || createHash('sha256').update(read.bytes).digest('hex') !== grant.digest) return forbidden();
      signal.throwIfAborted();
      return files.store.transaction(async tx => {
        const row = await files.store.loadAuthorized(tx, request, grant.fileId, 'read'); requireReady(row);
        if (row.digest !== grant.digest || Number(row.size_bytes) !== grant.sizeBytes) return forbidden();
        return { fileId: grant.fileId, digest: grant.digest, sizeBytes: grant.sizeBytes };
      });
    }),
  };
}
