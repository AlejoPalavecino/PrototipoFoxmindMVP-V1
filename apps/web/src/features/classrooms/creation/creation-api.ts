import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Draft, Payload } from '../../../../../../src/core/contracts/classrooms.ts';

export interface ClassroomCreationOperations {
  saveDraft(id: string, revision: string, payload: Payload): Promise<Pick<Draft, 'revision'>>;
  publishDraft(id: string, revision: string): Promise<{ id: string; code: string | null }>;
}
export function createClassroomCreationOperations(transport: Pick<ClassroomClient, 'call'>): ClassroomCreationOperations {
  return {
    saveDraft: (id, revision, payload) => transport.call(`/drafts/${id}`, 'PATCH', { revision, payload }),
    publishDraft: (id, revision) => transport.call(`/drafts/${id}/publish`, 'POST', { revision }),
  };
}
