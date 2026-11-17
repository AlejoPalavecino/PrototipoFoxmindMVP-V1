import { DOCUMENT_MAX_BYTES, isDocumentExtension } from '../../../../../../../src/core/domain/documents/document-formats.ts';

import { studyFileError } from '../../domain/errors.ts';
export { studyFileError } from '../../domain/errors.ts';
export function studyUploadIntent(input: unknown) {
  if (!input || typeof input !== 'object') return studyFileError('INVALID_UPLOAD');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).some(key => !['name','bytes','purpose'].includes(key))
    || typeof value.name !== 'string' || !value.name.trim() || [...value.name].length > 200
    || /[\\/\u0000-\u001f\u007f]/u.test(value.name)
    || !Number.isSafeInteger(value.bytes) || Number(value.bytes) < 1
    || !['plan','material'].includes(String(value.purpose))) return studyFileError('INVALID_UPLOAD');
  const extension = value.name.split('.').pop()!.toLowerCase();
  if (!(isDocumentExtension(extension) || (value.purpose === 'material' && ['xlsx','jpg','jpeg','png','zip'].includes(extension)))
    || Number(value.bytes) > (isDocumentExtension(extension) ? DOCUMENT_MAX_BYTES : 50_000_000)) return studyFileError('INVALID_UPLOAD');
  return { name: value.name, bytes: Number(value.bytes), purpose: value.purpose as 'plan'|'material', extension };
}
export function studyFileReady(row: {phase:string;size_bytes:bigint;digest:string|null;validated_digest:string|null;scanned_digest:string|null}): boolean {
  return row.phase === 'READY' && row.size_bytes > 0n && /^[a-f0-9]{64}$/u.test(row.digest ?? '')
    && row.digest === row.validated_digest && row.digest === row.scanned_digest;
}
