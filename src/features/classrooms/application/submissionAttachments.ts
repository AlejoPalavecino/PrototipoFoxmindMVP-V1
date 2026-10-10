import type { SubmissionAttachment, SubmissionDelivery } from '../model/Submission';

export const MAX_SUBMISSION_FILE_BYTES = 25 * 1024 * 1024;
export const SUBMISSION_FILE_ACCEPT = '.pdf,.doc,.docx,.txt,.epub';
const allowedExtensions = ['PDF', 'DOC', 'DOCX', 'TXT', 'EPUB'];

const extension = (name: string) => name.includes('.') ? name.split('.').pop()!.toUpperCase() : '';
const typeError = (name: string) => allowedExtensions.includes(extension(name)) ? undefined
  : `"${name}": Formato no permitido. Usa PDF, DOC, DOCX, TXT o EPUB.`;

// Client-side selection feedback, not security/content validation.
function fileError(file: File): string | undefined {
  return typeError(file.name) ?? (file.size > MAX_SUBMISSION_FILE_BYTES
    ? `"${file.name}": El archivo supera el máximo de 25 MB.` : undefined);
}

export function selectSubmissionAttachments(current: SubmissionAttachment[], files: Iterable<File>) {
  const attachments = [...current];
  const errors: string[] = [];
  for (const file of files) {
    const error = fileError(file);
    if (error) {
      errors.push(error);
    } else {
      attachments.push({ name: file.name, size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`, type: extension(file.name), file });
    }
  }
  return { attachments, errors };
}

export const removeSubmissionAttachment = (attachments: SubmissionAttachment[], index: number) =>
  attachments.filter((_, position) => position !== index);

export function validateSubmissionDelivery(delivery: SubmissionDelivery): void {
  const attachments = delivery.attachments ?? [];
  for (const attachment of attachments) {
    const error = fileError(attachment.file);
    if (error) throw new Error(error);
  }
  // Metadata-only callers predate File retention; do not pretend to validate their bytes.
  const legacyFile = delivery.attachments === undefined ? delivery.attachedFile : undefined;
  if (legacyFile) {
    const error = typeError(legacyFile.name);
    if (error) throw new Error(error);
  }
  if (!attachments.length && !legacyFile && !delivery.text?.trim()) {
    throw new Error('Por favor adjunta un archivo o escribe una respuesta antes de entregar');
  }
}
