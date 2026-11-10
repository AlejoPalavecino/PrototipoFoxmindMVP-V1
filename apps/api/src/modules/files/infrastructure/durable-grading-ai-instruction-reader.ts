import { FileService, requireReady } from './service.ts';
import { FileError } from '../domain/errors.ts';
import { parseActivityDocument } from './activity-document.ts';
import { createGradingAiAttachmentReader, type GradingAttachmentGrant, type GradingAttachmentSnapshot } from './grading-ai-attachment-reader.ts';
import type { FileAccess, FileTransaction } from '../application/contracts.ts';

import type { GradingInstructionGrant } from '../application/ports.ts';
export type { GradingInstructionGrant } from '../application/ports.ts';
type Authorize = (grant: GradingInstructionGrant, signal: AbortSignal, tx?: FileTransaction) => Promise<void>;
type Parser<T> = (bytes: Uint8Array, extension: 'pdf' | 'docx', signal: AbortSignal) => Promise<T>;
type Capability = { grant: GradingInstructionGrant; signal: AbortSignal };

function privateAccess(capabilities: WeakMap<object, Capability>, authorize: Authorize): FileAccess {
  const capability = (request: unknown): Capability => {
    const value = request && typeof request === 'object' ? capabilities.get(request) : undefined;
    if (!value || value.signal.aborted) throw new FileError('FORBIDDEN');
    return value;
  };
  return {
    async authenticate(tx, request, action) {
      const { grant, signal } = capability(request);
      if (action !== 'read') throw new FileError('FORBIDDEN');
      await authorize(grant, signal, tx); return grant.ownerId;
    },
    async authorize(tx, userId, target, action, request) {
      const { grant, signal } = capability(request);
      if (action !== 'read' || userId !== grant.ownerId || target.scope.kind !== 'classroom'
        || target.scope.id !== grant.classroomId || target.fileId !== grant.fileId
        || target.purpose !== 'instructions' || target.targetId !== grant.activityId) throw new FileError('FORBIDDEN');
      await authorize(grant, signal, tx);
    },
  };
}

async function instructionSnapshot(files: FileService, request: object, grant: GradingInstructionGrant): Promise<GradingAttachmentSnapshot> {
  return files.store.transaction(async tx => {
    const [linked] = await tx.query(`SELECT i.file_id FROM activity_instruction_files i
      JOIN attempts a ON a.activity_id=i.activity_id AND a.id=$3::uuid AND a.status='SUBMITTED'
      WHERE i.activity_id=$1::uuid AND i.file_id=$2::uuid AND i.classroom_id=$4::uuid
      FOR SHARE OF i,a`, grant.activityId, grant.fileId, grant.attemptId, grant.classroomId);
    if (!linked) throw new FileError('FILE_NOT_READY');
    const row = await files.store.loadAuthorized(tx, request, grant.fileId, 'read');
    requireReady(row);
    if (row.classroom_id !== grant.classroomId || row.classroom_draft_id !== null || row.purpose !== 'instructions'
      || row.target_id !== grant.activityId || row.blob_deleted_at || !row.digest || Number(row.size_bytes) > 20_000_000) {
      throw new FileError('FILE_NOT_READY');
    }
    return { classroomId: row.classroom_id, attemptId: grant.attemptId, fileId: row.id, digest: row.digest,
      extension: row.extension, approved: row.validation_status === 'APPROVED', clean: row.scan_status === 'CLEAN' };
  });
}

/** Reads only a linked instruction document under a short-lived authorized job capability. */
export function createDurableGradingAiInstructionReader<T = Awaited<ReturnType<typeof parseActivityDocument>>>(options: {
  files: FileService; authorize: Authorize; parse?: Parser<T>;
}) {
  const capabilities = new WeakMap<object, Capability>();
  const files = new FileService({ database: options.files.store.database, access: privateAccess(capabilities, options.authorize),
    storage: options.files.storage, scanner: options.files.scanner, draftQuotaBytes: options.files.store.draftQuotaBytes });
  return {
    async read(input: GradingInstructionGrant, signal: AbortSignal): Promise<T> {
      const grant = Object.freeze({ ...input });
      const request = Object.freeze({}); capabilities.set(request, { grant, signal });
      const reader = createGradingAiAttachmentReader<T>({
        authorize: () => options.authorize(grant, signal),
        snapshot: () => instructionSnapshot(files, request, grant),
        readBytes: async () => (await files.read(request, grant.fileId)).bytes,
        parse: options.parse ?? (parseActivityDocument as Parser<T>),
      });
      return reader.read(grant, signal);
    },
  };
}
