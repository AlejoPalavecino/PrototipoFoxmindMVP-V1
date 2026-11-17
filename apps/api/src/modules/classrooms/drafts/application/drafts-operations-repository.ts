import type { Transaction } from '../../access/public.ts';
import type { DraftRow } from '../../application/management-operations.ts';
export interface PublicationRepository {
  readSnapshot(tx: Transaction, input: { draftId: string; ownerId: string }): Promise<DraftRow[]>;
  markPublished(tx: Transaction, input: { draftId: string; classroomId: string }): Promise<{ id: string }[]>;
  createDestination(tx: Transaction, input: { classroomId: string; teacherId: string; name: string|undefined; subject: string|undefined; division: string|undefined; academicYear: number|undefined; timezone: string|undefined; coverKey: string|undefined; quota: bigint }): Promise<{ id: string }[]>;
  addPlanVersion(tx: Transaction, input: { versionId: string; classroomId: string; fileId: string; actorId: string }): Promise<{ id: string }[]>;
  addUnit(tx: Transaction, input: { unitId: string; classroomId: string; name: string; position: number }): Promise<{ id: string }[]>;
  addTopic(tx: Transaction, input: { topicId: string; classroomId: string; unitId: string; name: string; position: number }): Promise<{ id: string }[]>;
}
