export type { FileCustodyPort, FileReadPort, FilePromotionPort, DocumentReader,
  GradingAttachmentGrant, GradingInstructionGrant, GradingAttachmentSnapshot, GradingAttachmentPorts } from './application/ports.ts';
export type { FileAccess, FileScope, FileTarget, FileTransaction, FileDatabase, FileAction } from './application/contracts.ts';
export { FileUseCases } from './application/file-use-cases.ts';
export { FileIdentityError } from './application/identity-error.ts';
export type { AuthorizeDocument, FoxyDocumentGrant, FoxyDocumentReader, PrivateImageFacts, PrivateImageInspector,
  FoxyPrivateAssetPayload, RenewPrivateAsset, FoxyPrivateAssetFiles, FoxyPublicationFiles, FoxyPublicationRasterSource } from './application/reader-contracts.ts';
export type { FileView } from './domain/file-view.ts';
export { FileError } from './domain/errors.ts';
export { requireReady, type ReadinessSnapshot } from './domain/readiness.ts';
export { uuid, targetOf, type FileRow } from './domain/file-record.ts';
export { validateUploadIntent, assertFileUsable, mayClaimAbandonedUpload, FilePolicyError,
  type UploadIntent, type FileSafety, type CleanupCandidate, type FilePurpose } from './domain/policy.ts';
