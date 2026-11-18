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
export interface PrepareFoxyVisualPublication {
  requestId: string; assetRevision: string; editorialRevision?: string; classroomId: string; title: string; unitId: string | null; topicId: string | null;
}
export interface ConfirmFoxyPublication {
  requestId: string; publicationRevision: string; classroomRevision: string; confirm: true;
}
export type FoxyPublicationState = 'PREPARING' | 'READY' | 'FAILED' | 'PUBLISHED' | 'DISCARDED';
export interface FoxyPublicationSummary {
  id: string; resourceId: string; resourceRevision: string; classroomId: string;
  unitId: string | null; topicId: string | null; title: string; state: FoxyPublicationState; revision: string;
}
export type FoxyVisualPublicationSummary = Omit<FoxyPublicationSummary, 'resourceId' | 'resourceRevision'> & {
  sourceKind: 'VISUAL'; assetId: string; assetRevision: string; editorialRevision?: string;
};
export type FoxyAnyPublicationSummary = FoxyPublicationSummary | FoxyVisualPublicationSummary;
export interface FoxyRasterPublicationArtifact {
  kind: 'RASTER'; digest: string; sizeBytes: number; mimeType: 'image/png' | 'image/jpeg'; extension: 'png' | 'jpg';
  width: number; height: number; producerVersion: 'foxy-diagram-png-v1' | 'foxy-image-original-v1';
}
export type FoxyPublicationArtifact = { digest: string; sizeBytes: number; pageCount: number; rendererVersion: 'foxy-text-pdf-v1' | 'foxy-pdf-v1' | 'foxy-pdf-v2' } | FoxyRasterPublicationArtifact;
export interface FoxyPublicationInspection {
  editorialSnapshot?: { title: string; description: string | null; revision: string | null };
  publication: FoxyAnyPublicationSummary; classroomRevision: string; classroomArchived: boolean;
  errorCode: 'AI_INPUT_LIMIT' | 'INVALID_INPUT' | 'FILE_NOT_READY' | null;
}
export interface FoxyPublicationConfirmation {
  publicationId: string; materialId: string; publicationRevision: string; classroomRevision: string;
}

export interface RetryFoxyPublication { requestId: string; publicationRevision: string }
export interface DiscardFoxyPublication extends RetryFoxyPublication { confirm: true }
export interface FoxyPublicationCommandReceipt { publicationId: string; action: 'RETRY' | 'DISCARD'; publicationRevision: string }
export type FoxyPublicationRetryReason = 'STATE' | 'SOURCE_CHANGED' | 'DESTINATION_UNAVAILABLE' | 'INVALID_RESOURCE' | 'REFERENCED' | 'BUSY' | 'CONTENT_REJECTED' | 'FILE_UNAVAILABLE';
export type FoxyPublicationCleanupState = 'NOT_REQUESTED' | 'PENDING' | 'FAILED' | 'DONE';
export interface FoxyPublicationManagement { publicationId: string; publicationRevision: string; canRetry: boolean; retryReason: FoxyPublicationRetryReason | null; canDiscard: boolean; cleanupState: FoxyPublicationCleanupState }
