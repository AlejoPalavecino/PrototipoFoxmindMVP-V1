export type { FileCustodyPort, FilePromotionPort, DocumentReader,
  GradingAttachmentGrant, GradingInstructionGrant, GradingAttachmentSnapshot, GradingAttachmentPorts } from './custody/public.ts';
export type { FileAccess, FileScope, FileTarget, FileTransaction, FileDatabase, FileAction } from './custody/public.ts';
export { FileUseCases } from './uploads/public.ts';
export { FileIdentityError } from './custody/public.ts';
export type { AuthorizeDocument, FoxyDocumentGrant, FoxyDocumentReader, PrivateImageFacts, PrivateImageInspector,
  FoxyPrivateAssetPayload, RenewPrivateAsset, FoxyPrivateAssetFiles, FoxyPublicationFiles, FoxyPublicationRasterSource } from './custody/public.ts';
export type { FileView } from './domain/file-view.ts';
export { FileError } from './domain/errors.ts';
export { requireReady, type ReadinessSnapshot } from './domain/readiness.ts';
export { uuid, targetOf, type FileRow } from './domain/file-record.ts';
export { validateUploadIntent, assertFileUsable, mayClaimAbandonedUpload, FilePolicyError,
  type UploadIntent, type FileSafety, type CleanupCandidate, type FilePurpose } from './domain/policy.ts';
export type { FileReadPort } from './downloads/public.ts';
export type { FileHttpPort } from './uploads/public.ts';
