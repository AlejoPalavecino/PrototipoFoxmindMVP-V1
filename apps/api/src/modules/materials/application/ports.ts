import type { Transaction, RevisionPort } from '../../classrooms/public.ts';
import type { FileRow } from '../../files/public.ts';
export interface ClassroomFileOperations {
 readyClassroomFile(tx: Transaction, request: unknown, classroomId: string, fileId: unknown, purpose: 'plan' | 'material'): Promise<FileRow>;
 advanceRevision: RevisionPort;
}
export interface MaterialPublisherPort {
 publish(tx: Transaction, request: unknown, actorId: string, input: { classroomId: string; revision: string; title: string; fileId: string; unitId: string | null; topicId: string | null }): Promise<{ materialId: string; classroomRevision: string }>;
}

export type MaterialPublicationInput = { classroomId: string; revision: string; title: string; fileId: string; unitId: string | null; topicId: string | null };
