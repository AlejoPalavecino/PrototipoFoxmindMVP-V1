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
