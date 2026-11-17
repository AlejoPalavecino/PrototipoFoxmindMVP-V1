import type { Transaction } from '../../../classrooms/public.ts';
export interface LibraryActivityLink { id: string; linked: boolean; status: string; first_started_at: Date | null }
export interface LibraryRepository {
activitiesForLinks(tx: Transaction, classroomId: string, materialId: string, activityIds: string[]): Promise<LibraryActivityLink[]>;
addActivityLinks(tx: Transaction, classroomId: string, materialId: string, activityIds: string[]): Promise<unknown>;
removeActivityLinks(tx: Transaction, classroomId: string, materialId: string, activityIds: string[]): Promise<unknown>;
updateDescription(tx: Transaction, id: string, description: string | null): Promise<unknown>;
  listMaterials(tx: Transaction, input: { classroomId: string; includeDeleted: boolean }): Promise<MaterialListItem[]>;
  findRevisionReplay(tx: Transaction, input: { previousId: string; commandHash: string }): Promise<RevisionReplay[]>;
  findSuccessor(tx: Transaction, input: { materialId: string }): Promise<Existence[]>;
  saveRevisionContent(tx: Transaction, input: { materialId: string; body: string; resourceUse: string; contentKind: string }): Promise<MaterialIdentity[]>;
  recordRevision(tx: Transaction, input: { previousId: string; currentId: string; classroomId: string; classroomRevision: string; commandHash: string }): Promise<MaterialIdentity[]>;
  savePublishedContent(tx: Transaction, input: { materialId: string; body: string | null; resourceUse: string; contentKind: string }): Promise<MaterialIdentity[]>;
  findSuccessorForEdit(tx: Transaction, input: { materialId: string }): Promise<Existence[]>;
  updateContentMetadata(tx: Transaction, input: { materialId: string; body: string | null; resourceUse: string; contentKind: string; clearDescription: boolean }): Promise<MaterialIdentity[]>;
  updateOrganization(tx: Transaction, input: { materialId: string; title: string; unitId: string | null; topicId: string | null }): Promise<MaterialIdentity[]>;
  findSuccessorForDeletion(tx: Transaction, input: { materialId: string }): Promise<Existence[]>;
  findFileReferences(tx: Transaction, input: { materialId: string; fileId: string }): Promise<Existence[]>;
  markDeleted(tx: Transaction, input: { materialId: string }): Promise<MaterialIdentity[]>;
  lockMaterial(tx: Transaction, input: { materialId: string; classroomId: string }): Promise<MaterialRecord[]>;
  findUnit(tx: Transaction, input: { unitId: string; classroomId: string }): Promise<MaterialIdentity[]>;
  findTopic(tx: Transaction, input: { topicId: string; unitId: string; classroomId: string }): Promise<MaterialIdentity[]>;
}

export interface MaterialIdentity { id: string }
export interface Existence { '?column?': number }
export interface RevisionReplay { current_id: string; classroom_revision: bigint | string }
export interface MaterialRecord { id: string; title: string; file_id: string; deleted_at: Date | null; content_kind: string; description: string | null; body: string | null; resource_use: string }
export interface MaterialListItem {
  id: string; title: string; body: string | null; description: string | null; resourceUse: string; contentKind: string;
  fileId: string; unitId: string | null; topicId: string | null; fileName: string; extension: string; sizeBytes: string;
  deleted: boolean; deletionPending: boolean; ready: boolean; previewable: boolean; activityIds: string[]; linked: boolean; supersededBy: string | null;
}
