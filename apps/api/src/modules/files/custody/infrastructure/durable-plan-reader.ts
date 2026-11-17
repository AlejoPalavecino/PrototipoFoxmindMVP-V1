import type { ApprovedPlanReader } from '../../../../../../../src/core/domain/curriculum/ai.ts';
import { FileService } from './service.ts';
import type { FileAccess, FileTransaction } from '../application/contracts.ts';
import { createApprovedPlanReader } from './approved-plan-reader.ts';
import { PlanDocumentError } from '../../domain/plan-document-error.ts';

type Grant = Parameters<ApprovedPlanReader['read']>[0];
type AuthorizeClaim = (input: Grant, signal: AbortSignal, tx?: FileTransaction) => Promise<void>;
interface Capability { input: Grant; signal: AbortSignal }

function durableAccess(capabilities: WeakMap<object, Capability>, authorize: AuthorizeClaim): FileAccess {
  const get = (request: unknown): Capability => {
    const capability = request && typeof request === 'object' ? capabilities.get(request) : undefined;
    if (!capability || capability.signal.aborted) throw new PlanDocumentError();
    return capability;
  };
  return {
    async authenticate(tx, request, action) {
      if (action !== 'read') throw new PlanDocumentError();
      const { input, signal } = get(request);
      await authorize(input, signal, tx);
      return input.ownerId;
    },
    async authorize(tx, userId, target, action, request) {
      const { input, signal } = get(request);
      if (action !== 'read' || userId !== input.ownerId || target.scope.kind !== 'draft'
        || target.scope.id !== input.draftId || target.fileId !== input.fileId || target.purpose !== 'plan') throw new PlanDocumentError();
      await authorize(input, signal, tx);
    },
  };
}
/** Creates a private capability boundary for claimed jobs, never an HTTP session. */
export function createDurableApprovedPlanReader(options: { files: FileService; authorize: AuthorizeClaim }) {
  if (typeof options.authorize !== 'function' || !options.files?.store) throw new PlanDocumentError();
  const capabilities = new WeakMap<object, Capability>();
  const issue = (input: Grant, signal: AbortSignal) => {
    const request = Object.freeze({}); capabilities.set(request, { input, signal }); return request;
  };
  const privateReader = () => {
    const files = new FileService({ database: options.files.store.database,
      access: durableAccess(capabilities, options.authorize), storage: options.files.storage,
      scanner: options.files.scanner, draftQuotaBytes: options.files.store.draftQuotaBytes });
    return createApprovedPlanReader({ files, authorize: async (input, signal) => {
      await options.authorize(input, signal); return issue(input, signal);
    } });
  };
  const reader = privateReader();
  const http = createApprovedPlanReader({ files: options.files, authorize: async () => { throw new PlanDocumentError(); } });
  return {
    read: (input: Grant, signal: AbortSignal) => privateReader().read(input, signal),
    snapshot: http.snapshot,
    async snapshotWorker(tx: FileTransaction, input: Grant, signal: AbortSignal) {
      await options.authorize(input, signal, tx);
      return reader.snapshot(tx, issue(input, signal), input.draftId, input.fileId);
    },
  };
}
