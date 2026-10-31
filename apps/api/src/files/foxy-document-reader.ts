import { createHash } from 'node:crypto';
import type { FoxyGroundingFile, FoxyParsedDocument } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import { FileError } from './errors.ts';
import { parseActivityDocument } from './activity-document.ts';
import { requireReady, type FileService } from './service.ts';
import type { FileRow } from './store.ts';

export interface FoxyDocumentDescriptor { classroomId: string; file: FoxyGroundingFile }
function notReady(): never { throw new FileError('FILE_NOT_READY'); }
function checkAbort(signal: AbortSignal): void { if (signal.aborted) notReady(); }
function equalId(a: string | null, b: string | null): boolean { return a?.toLowerCase() === b?.toLowerCase(); }
function checkRow(row: FileRow, descriptor: FoxyDocumentDescriptor): void {
  const { file, classroomId } = descriptor;
  requireReady(row);
  if (!equalId(row.id, file.fileId) || !equalId(row.classroom_id, classroomId) || row.classroom_draft_id !== null
    || row.blob_deleted_at !== null || row.purpose !== file.purpose || !equalId(row.target_id, file.targetId)
    || row.extension !== file.extension || !['pdf', 'docx'].includes(file.extension)
    || !Number.isSafeInteger(file.sizeBytes) || file.sizeBytes < 1 || file.sizeBytes > 20000000
    || row.size_bytes !== BigInt(file.sizeBytes) || row.digest !== file.digest || !/^[a-f0-9]{64}$/u.test(file.digest)) notReady();
}
function checkBytes(bytes: Uint8Array, file: FoxyGroundingFile): void {
  if (!(bytes instanceof Uint8Array) || bytes.length !== file.sizeBytes
    || createHash('sha256').update(bytes).digest('hex') !== file.digest) notReady();
}
export function createFoxyDocumentReader(options: { files: FileService }) {
  if (!options.files?.store || typeof options.files.read !== 'function') notReady();
  const files = options.files;
  async function authorize(request: unknown, descriptor: FoxyDocumentDescriptor, signal: AbortSignal): Promise<void> {
    checkAbort(signal);
    await files.store.transaction(async tx => {
      const row = await files.store.loadAuthorized(tx, request, descriptor.file.fileId, 'read');
      checkAbort(signal); checkRow(row, descriptor);
    });
    checkAbort(signal);
  }
  return {
    async read(request: unknown, descriptor: FoxyDocumentDescriptor, signal: AbortSignal): Promise<FoxyParsedDocument> {
      checkAbort(signal); await authorize(request, descriptor, signal);
      const response = await files.read(request, descriptor.file.fileId, 'download');
      checkAbort(signal); checkBytes(response.bytes, descriptor.file);
      const parsed = await parseActivityDocument(response.bytes, descriptor.file.extension, signal);
      checkAbort(signal); checkBytes(response.bytes, descriptor.file);
      if (parsed.document.kind === 'pdf') checkBytes(parsed.document.bytes, descriptor.file);
      await authorize(request, descriptor, signal);
      checkAbort(signal);
      return { fileId: descriptor.file.fileId, digest: descriptor.file.digest, ...parsed };
    },
  };
}
