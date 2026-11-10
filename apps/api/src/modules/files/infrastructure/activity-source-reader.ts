import type { ActivitySourceGrant } from '../../../../../../src/core/domain/index.ts';
import { FileService } from './service.ts';
import type { FileAccess, FileTransaction } from '../application/contracts.ts';
import { FileError } from '../domain/errors.ts';
import { activitySourceSnapshot } from './activity-source-snapshot.ts';
import { parseActivityDocument } from './activity-document.ts';
import { createHash } from 'node:crypto';

type Authorize = (grant: ActivitySourceGrant, signal: AbortSignal, tx?: FileTransaction) => Promise<void>;
interface Capability { grant: ActivitySourceGrant; signal: AbortSignal }
function privateAccess(capabilities: WeakMap<object, Capability>, authorize: Authorize): FileAccess {
  const get = (request: unknown) => {
    const capability = request && typeof request === 'object' ? capabilities.get(request) : undefined;
    if (!capability || capability.signal.aborted) throw new FileError('FORBIDDEN');
    return capability;
  };
  return {
    async authenticate(tx, request, action) {
      const { grant, signal } = get(request);
      if (action !== 'read') throw new FileError('FORBIDDEN');
      await authorize(grant, signal, tx); return grant.ownerId;
    },
    async authorize(tx, userId, target, action, request) {
      const { grant, signal } = get(request);
      if (action !== 'read' || userId !== grant.ownerId || target.scope.kind !== 'classroom' || target.scope.id !== grant.classroomId
        || target.fileId !== grant.fileId || target.purpose !== grant.sourceId.split(':')[0]) throw new FileError('FORBIDDEN');
      await authorize(grant, signal, tx);
    },
  };
}
export function createDurableActivitySourceReader(options: { files: FileService; authorize: Authorize }) {
  const capabilities = new WeakMap<object, Capability>();
  const issue = (grant: ActivitySourceGrant, signal: AbortSignal) => {
    const request = Object.freeze({}); capabilities.set(request, { grant, signal }); return request;
  };
  const privateFiles = () => new FileService({ database: options.files.store.database,
    access: privateAccess(capabilities, options.authorize), storage: options.files.storage,
    scanner: options.files.scanner, draftQuotaBytes: options.files.store.draftQuotaBytes });
  return {
    snapshot: (tx: FileTransaction, request: unknown, classroomId: string, sourceId: string) =>
      activitySourceSnapshot(options.files, tx, request, classroomId, sourceId),
    async snapshotWorker(tx: FileTransaction, grant: ActivitySourceGrant, signal: AbortSignal) {
      await options.authorize(grant, signal, tx);
      const snapshot = await activitySourceSnapshot(privateFiles(), tx, issue(grant, signal), grant.classroomId, grant.sourceId);
      if (snapshot.fileId !== grant.fileId || snapshot.digest !== grant.digest) throw new FileError('FILE_NOT_READY');
      return snapshot;
    },
    async read(grant: ActivitySourceGrant, signal: AbortSignal) {
      if (signal.aborted) throw new FileError('FORBIDDEN');
      await options.authorize(grant, signal);
      const files = privateFiles(), request = issue(grant, signal);
      const snapshot = await files.store.transaction(tx => activitySourceSnapshot(files, tx, request, grant.classroomId, grant.sourceId));
      if (snapshot.fileId !== grant.fileId || snapshot.digest !== grant.digest) throw new FileError('FILE_NOT_READY');
      const { bytes } = await files.read(request, grant.fileId);
      if (createHash('sha256').update(bytes).digest('hex') !== grant.digest) throw new FileError('FILE_NOT_READY');
      await options.authorize(grant, signal);
      await files.store.transaction(tx => activitySourceSnapshot(files, tx, request, grant.classroomId, grant.sourceId));
      const parsed = await parseActivityDocument(bytes, snapshot.extension, signal);
      await options.authorize(grant, signal);
      const final = await files.store.transaction(tx => activitySourceSnapshot(files, tx, request, grant.classroomId, grant.sourceId));
      if (final.fileId !== grant.fileId || final.digest !== grant.digest) throw new FileError('FILE_NOT_READY');
      return { sourceId: grant.sourceId, ...parsed };
    },
  };
}
