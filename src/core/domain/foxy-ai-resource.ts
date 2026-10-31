export interface FoxyReference { sourceId: string; page: number | null }
export interface FoxyAnswer {
  schemaVersion: 'foxy-answer-v1'; title: string; markdown: string; references: FoxyReference[];
  warnings: string[]; missingInformation: string[];
}
export interface EditFoxyResource { requestId: string; revision: string; title: string; markdown: string }
export interface PrepareFoxyPublication {
  requestId: string; resourceRevision: string; classroomId: string; title: string;
  unitId: string | null; topicId: string | null;
}
export interface ConfirmFoxyPublication {
  requestId: string; publicationRevision: string; classroomRevision: string; confirm: true;
}
export type FoxyPublicationState = 'PREPARING' | 'READY' | 'FAILED' | 'PUBLISHED';
export interface FoxyPublicationSummary {
  id: string; resourceId: string; resourceRevision: string; classroomId: string;
  unitId: string | null; topicId: string | null; title: string; state: FoxyPublicationState; revision: string;
}
export interface FoxyPublicationInspection {
  publication: FoxyPublicationSummary; classroomRevision: string; classroomArchived: boolean;
  errorCode: 'AI_INPUT_LIMIT' | 'INVALID_INPUT' | 'FILE_NOT_READY' | null;
}
export interface FoxyPublicationConfirmation {
  publicationId: string; materialId: string; publicationRevision: string; classroomRevision: string;
}
