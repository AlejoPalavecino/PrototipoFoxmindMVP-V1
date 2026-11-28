export const DOCUMENT_MAX_BYTES = 20_000_000;
/** Largest private file the API stores (decimal 50 MB); proxies must not admit more. */
export const FILE_MAX_BYTES = 50_000_000;
/** Slowest average rate an upload may keep (100 kB/s); a sender that goes quiet is cut sooner by the idle window. */
export const UPLOAD_MIN_BYTES_PER_SECOND = 100_000;
/** Total time a binary upload of `bytes` may take: never under 10 s, 500 s for FILE_MAX_BYTES (F8). */
export function uploadDeadlineMs(bytes: number): number {
  return Math.max(10_000, Math.ceil(bytes / UPLOAD_MIN_BYTES_PER_SECOND * 1000));
}
/** Slow start allowed before the running rate floor applies. */
export const UPLOAD_RATE_GRACE_MS = 10_000;
/**
 * Running rate floor (F8): milliseconds from the start of an upload by which `received` bytes are still at or
 * above 100 kB/s after the grace. Each chunk moves this point; a sender that trickles bytes is cut when it passes,
 * even though the idle window never fires.
 */
export function uploadRateDeadlineMs(received: number): number {
  return UPLOAD_RATE_GRACE_MS + Math.ceil(received / UPLOAD_MIN_BYTES_PER_SECOND * 1000);
}

export const documentMimeTypes = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;

export type DocumentExtension = keyof typeof documentMimeTypes;
export function isDocumentExtension(value: string): value is DocumentExtension {
  return Object.hasOwn(documentMimeTypes, value);
}
