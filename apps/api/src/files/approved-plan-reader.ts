import { createHash } from 'node:crypto';
import type { ApprovedPlanReader } from '../../../../src/core/domain/index.ts';
import type { FileTransaction } from './contracts.ts';
import type { FileStore } from './store.ts';
import { requireReady } from './service.ts';
import { parsePlanDocument } from './docx-text.ts';
import { PlanDocumentError } from './plan-document-error.ts';

type Grant = Parameters<ApprovedPlanReader['read']>[0];
interface Options {
  files: { read(request: unknown, id: string): Promise<{ bytes: Uint8Array; headers: Record<string, string> }>; store?: FileStore };
  authorize(input: Grant, signal: AbortSignal): Promise<unknown>;
}
export function createApprovedPlanReader(options: Options) {
  if (typeof options?.authorize !== 'function' || typeof options.files?.read !== 'function') throw new PlanDocumentError();
  return {
    async snapshot(tx: FileTransaction, request: unknown, draftId: string, fileId: string) {
      if (!options.files.store) throw new PlanDocumentError();
      const row = await options.files.store.loadAuthorized(tx, request, fileId, 'read');
      requireReady(row);
      if (row.classroom_draft_id !== draftId || row.classroom_id || row.purpose !== 'plan'
        || !row.digest || !['pdf', 'docx'].includes(row.extension) || Number(row.size_bytes) > 20_000_000) throw new PlanDocumentError();
      return { fileId: row.id, digest: row.digest, extension: row.extension as 'pdf' | 'docx', sizeBytes: Number(row.size_bytes) };
    },
    async read(input: Grant, signal: AbortSignal) {
      if (signal.aborted) throw new PlanDocumentError();
      const request = await options.authorize(input, signal);
      if (signal.aborted) throw new PlanDocumentError();
      const file = await options.files.read(request, input.fileId);
      if (createHash('sha256').update(file.bytes).digest('hex') !== input.digest) throw new PlanDocumentError();
      await options.authorize(input, signal);
      if (signal.aborted) throw new PlanDocumentError();
      const mime = file.headers['Content-Type'];
      const extension = mime === 'application/pdf' ? 'pdf'
        : mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx' : null;
      if (!extension) throw new PlanDocumentError();
      return parsePlanDocument(file.bytes, extension, signal);
    },
  };
}
