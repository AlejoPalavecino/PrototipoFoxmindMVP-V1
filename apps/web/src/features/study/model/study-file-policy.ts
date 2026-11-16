import { DOCUMENT_MAX_BYTES, documentMimeTypes, isDocumentExtension } from '../../../../../../src/core/domain/documents/document-formats.ts';

export type StudyUploadPurpose = 'plan' | 'material';
const documents = Object.keys(documentMimeTypes);
const materials = [...documents, 'xlsx', 'jpg', 'jpeg', 'png', 'zip'];

export function studyUploadPolicy(purpose: StudyUploadPurpose) {
  const plan = purpose === 'plan';
  const extensions = plan ? documents : materials;
  return {
    extensions,
    accept: extensions.map(extension => '.' + extension).join(','),
    maxBytes: plan ? DOCUMENT_MAX_BYTES : 50_000_000,
    label: plan ? 'PDF, Word o PowerPoint · hasta 20 MB · sólo para vos'
      : 'PDF, Word, PowerPoint, XLSX, JPG, JPEG, PNG o ZIP · hasta 20 MB para documentos y 50 MB para otros formatos · sólo para vos',
  };
}

export function validateStudyUpload(purpose: StudyUploadPurpose, file: { name: string; size: number }): string | null {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return 'El archivo está vacío. Elegí otro documento.';
  const policy = studyUploadPolicy(purpose), extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
  const limit = isDocumentExtension(extension) ? DOCUMENT_MAX_BYTES : policy.maxBytes;
  if (file.size > limit) return 'El archivo supera ' + limit / 1_000_000 + ' MB. Elegí uno más pequeño.';
  if (!policy.extensions.includes(extension)) return purpose === 'plan' ? 'Elegí un archivo PDF, Word o PowerPoint para el plan.'
    : 'Ese formato de material no está permitido. Revisá los formatos indicados.';
  return null;
}

export function requireStudyPlan(planFileId: string | null | undefined): string | null {
  return planFileId ? null : 'Primero cargá y validá el documento del plan para continuar.';
}
