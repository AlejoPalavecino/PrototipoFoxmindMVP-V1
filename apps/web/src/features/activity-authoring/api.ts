import type { ClassroomClient } from '../../../../../src/core/contracts/academic-client.ts';
import type { ActivityAuthoringOperations, ActivityGenerationOperations, ActivityRevision, PersistedActivity } from './model/authoring-operations.ts';

export type { ActivityAuthoringOperations, ActivityGenerationOperations, ActivityDraftPayload, ActivityDeadline, ActivityMetadata, ActivityRevision, PersistedActivity, GenerationStartRequest } from './model/authoring-operations.ts';
export type AuthoringTransport = Pick<ClassroomClient, 'call'>;

export function createActivityGenerationApi(transport: AuthoringTransport, roomId: string): ActivityGenerationOperations {
  const base = `/${roomId}/activity-generations`;
  return {
    sources: signal => transport.call(`${base}/sources`, 'GET', undefined, signal),
    list: signal => transport.call(base, 'GET', undefined, signal),
    get: (id, signal) => transport.call(`${base}/${id}`, 'GET', undefined, signal),
    start: (input, signal) => transport.call(base, 'POST', input, signal),
    regenerate: (id, input, acknowledgePossibleCharge, signal) =>
      transport.call(`${base}/${id}/regenerate`, 'POST', { ...input, acknowledgePossibleCharge }, signal),
    apply: (id, revision, requestId, proposal, signal) =>
      transport.call(`${base}/${id}/apply`, 'POST', { revision, requestId, proposal }, signal),
  };
}

export function createActivityAuthoringApi(transport: AuthoringTransport, roomId: string): ActivityAuthoringOperations {
  const base = `/${roomId}/activities`;
  const write = <T extends ActivityRevision>(revision: string, operation: object, signal?: AbortSignal) =>
    transport.call<T>(base, 'POST', { revision, operation }, signal);
  return {
    createDraft: (revision, type, signal) => write<PersistedActivity>(revision, { action: 'create', type }, signal),
    saveDraft: (revision, id, payload, signal) => write(revision, { action: 'save', id, payload }, signal),
    updateMetadata: (revision, id, metadata, signal) => write(revision, { action: 'metadata', id, ...metadata }, signal),
    publish: (revision, id, signal) => write(revision, { action: 'publish', id }, signal),
    updateDeadline: (revision, id, deadline, allowLate, signal) => write(revision, { action: 'deadline', id, deadline, allowLate }, signal),
    resolveDeadline: (local, signal) => transport.call(`${base}/deadline`, 'POST', { local }, signal),
    generation: createActivityGenerationApi(transport, roomId),
  };
}
