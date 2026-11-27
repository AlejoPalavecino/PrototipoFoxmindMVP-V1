export const DOCUMENT_MAX_BYTES = 20_000_000;
/** Largest private file the API stores (decimal 50 MB); proxies must not admit more. */
export const FILE_MAX_BYTES = 50_000_000;

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
