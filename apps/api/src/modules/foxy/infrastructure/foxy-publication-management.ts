import type { FoxyPublicationCleanupState, FoxyPublicationRetryReason } from '../../../../../../src/core/domain/index.ts';
type PublicationState = 'PREPARING' | 'READY' | 'FAILED' | 'PUBLISHED' | 'DISCARDED';
type FileFacts = { phase: 'reserved' | 'receiving' | 'inspecting' | 'ready' | 'rejected' | 'deleting' | 'deleted';
  uploadStatus: 'STARTED' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'; reservationReleased: boolean; blobDeleted: boolean;
  proofValid: boolean; leaseActive: boolean; rendererCompatible: boolean };
type Facts = { state: PublicationState; errorCode: string | null; sourceCurrent: boolean;
  destinationUsable: boolean; associationsValid: boolean; file: FileFacts | null; referenced: boolean; cleanupError: string | null };
type RetryReason = FoxyPublicationRetryReason;
function fileReason(file: FileFacts | null): RetryReason | null {
  if (!file) return null;
  if (file.leaseActive) return 'BUSY';
  if (file.phase === 'rejected') return 'CONTENT_REJECTED';
  if (file.blobDeleted || file.phase === 'deleting' || file.phase === 'deleted') return 'FILE_UNAVAILABLE';
  if (file.phase === 'ready') return file.uploadStatus === 'COMPLETED' && file.proofValid ? null : 'FILE_UNAVAILABLE';
  if (file.phase === 'reserved' || file.phase === 'receiving' || file.phase === 'inspecting') {
    return file.reservationReleased === false && file.rendererCompatible &&
      (file.uploadStatus === 'STARTED' || file.uploadStatus === 'UPLOADING' || file.uploadStatus === 'FAILED') ? null : 'FILE_UNAVAILABLE';
  }
  return 'FILE_UNAVAILABLE';
}
export function decideFoxyPublicationManagement(facts: Facts) {
  let retryReason: RetryReason | null;
  if (facts.state !== 'FAILED') retryReason = 'STATE';
  else if (!facts.sourceCurrent) retryReason = 'SOURCE_CHANGED';
  else if (!facts.destinationUsable || !facts.associationsValid) retryReason = 'DESTINATION_UNAVAILABLE';
  else if (facts.errorCode !== 'FILE_NOT_READY') retryReason = 'INVALID_RESOURCE';
  else if (facts.referenced) retryReason = 'REFERENCED';
  else retryReason = fileReason(facts.file);
  const canDiscard = !facts.referenced && (facts.state === 'PREPARING' || facts.state === 'READY' || facts.state === 'FAILED');
  const cleanupState: FoxyPublicationCleanupState = facts.state !== 'DISCARDED' ? 'NOT_REQUESTED' : !facts.file || facts.file.blobDeleted ? 'DONE' : facts.cleanupError !== null ? 'FAILED' : 'PENDING';
  return { canRetry: retryReason === null, canDiscard, retryReason, cleanupState };
}
