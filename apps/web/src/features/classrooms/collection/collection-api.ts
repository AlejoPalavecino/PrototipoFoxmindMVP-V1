import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Classroom, Draft, Invitation } from '../../../../../../src/core/contracts/classrooms.ts';

export interface ClassroomCollectionData { teach: Classroom[]; study: Classroom[]; drafts: Draft[]; invitations: Invitation[] }
export interface ClassroomCollectionOperations {
  rooms(signal?: AbortSignal): Promise<Pick<ClassroomCollectionData, 'teach' | 'study'>>;
  drafts(signal?: AbortSignal): Promise<Draft[]>;
  invitations(signal?: AbortSignal): Promise<Invitation[]>;
  createDraft(): Promise<Draft>;
  getDraft(id: string): Promise<Draft>;
  deleteDraft(id: string, revision: string): Promise<unknown>;
}
export function createClassroomCollectionOperations(transport: Pick<ClassroomClient, 'call'>): ClassroomCollectionOperations {
  return {
    rooms: signal => transport.call('', undefined, undefined, signal),
    drafts: signal => transport.call('/drafts', undefined, undefined, signal),
    invitations: signal => transport.call('/invitations', undefined, undefined, signal),
    createDraft: () => transport.call('/drafts', 'POST', {}),
    getDraft: id => transport.call(`/drafts/${id}`),
    deleteDraft: (id, revision) => transport.call(`/drafts/${id}`, 'DELETE', { revision, confirm: true }),
  };
}
