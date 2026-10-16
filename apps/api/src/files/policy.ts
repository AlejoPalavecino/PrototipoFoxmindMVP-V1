export type FilePurpose = 'plan' | 'instructions' | 'material' | 'attachment';
export interface UploadIntent { purpose: FilePurpose; name: string; bytes: number }
export interface FileSafety {
  upload: 'STARTED' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  validation: 'PENDING' | 'APPROVED' | 'REJECTED';
  scan: 'PENDING' | 'RUNNING' | 'CLEAN' | 'REJECTED' | 'ERROR';
  objectDigest: string;
  validatedDigest: string | null;
  scannedDigest: string | null;
}
export interface CleanupCandidate {
  upload: FileSafety['upload'];
  lastActivityAt: number;
  completedAt: number | null;
  confirmedDraft: boolean;
  references: number;
}

export class FilePolicyError extends Error {
  readonly code: 'INVALID_UPLOAD' | 'FILE_TYPE_NOT_ALLOWED' | 'FILE_TOO_LARGE' | 'FILE_NOT_READY';
  constructor(code: FilePolicyError['code']) {
    super(code);
    this.name = 'FilePolicyError';
    this.code = code;
  }
}

const formats = new Set(['pdf', 'docx', 'pptx', 'xlsx', 'jpg', 'jpeg', 'png', 'zip']);
const purposes = new Set(['plan', 'instructions', 'material', 'attachment']);
const sha256 = /^[a-f0-9]{64}$/;

/** Metadata admission only: actual content and real scan are separate, mandatory gates. */
export function validateUploadIntent(intent: UploadIntent): { extension: string; maxBytes: number } {
  if (!intent || !purposes.has(intent.purpose) || typeof intent.name !== 'string'
    || intent.name.length === 0 || intent.name.length > 255 || intent.name !== intent.name.trim()
    || /[\u0000-\u001f\u007f/\\:]/u.test(intent.name) || intent.name.endsWith('.')
    || !Number.isSafeInteger(intent.bytes) || intent.bytes <= 0) {
    throw new FilePolicyError('INVALID_UPLOAD');
  }
  const dot = intent.name.lastIndexOf('.');
  const extension = dot > 0 ? intent.name.slice(dot + 1).toLowerCase() : '';
  const restricted = intent.purpose === 'plan' || intent.purpose === 'instructions';
  if (!formats.has(extension) || (restricted && extension !== 'pdf' && extension !== 'docx')) {
    throw new FilePolicyError('FILE_TYPE_NOT_ALLOWED');
  }
  const maxBytes = restricted ? 20_000_000 : 50_000_000;
  if (intent.bytes > maxBytes) throw new FilePolicyError('FILE_TOO_LARGE');
  return { extension, maxBytes };
}

/** Safety is necessary, never authorization. The caller must also check current record access. */
export function assertFileUsable(file: FileSafety): void {
  if (!file || file.upload !== 'COMPLETED' || file.validation !== 'APPROVED' || file.scan !== 'CLEAN'
    || typeof file.objectDigest !== 'string' || !sha256.test(file.objectDigest)
    || file.validatedDigest !== file.objectDigest || file.scannedDigest !== file.objectDigest) {
    throw new FilePolicyError('FILE_NOT_READY');
  }
}

/** Eligibility only. Recheck and claim under the upload/classroom mutation lock before deletion. */
export function mayClaimAbandonedUpload(candidate: CleanupCandidate, now: number): boolean {
  return Boolean(candidate && Number.isSafeInteger(now) && now >= 0
    && Number.isSafeInteger(candidate.lastActivityAt) && candidate.lastActivityAt >= 0
    && ['STARTED', 'UPLOADING', 'FAILED', 'CANCELLED'].includes(candidate.upload)
    && candidate.completedAt === null && candidate.confirmedDraft === false
    && candidate.references === 0 && now - candidate.lastActivityAt >= 86_400_000);
}
