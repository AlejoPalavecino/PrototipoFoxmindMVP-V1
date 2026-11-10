import { FileService, requireReady } from './service.ts';
import { FileError } from '../domain/errors.ts';
import { parseActivityDocument } from './activity-document.ts';
import { createGradingAiAttachmentReader, type GradingAttachmentGrant, type GradingAttachmentSnapshot } from './grading-ai-attachment-reader.ts';
import type { FileAccess, FileTransaction } from '../application/contracts.ts';

type Authorize = (grant: GradingAttachmentGrant, signal: AbortSignal, tx?: FileTransaction) => Promise<void>;
type Parser<T> = (bytes: Uint8Array, extension: 'pdf' | 'docx', signal: AbortSignal) => Promise<T>;
type Capability = { grant: GradingAttachmentGrant; signal: AbortSignal };

function privateAccess(capabilities: WeakMap<object, Capability>, authorize: Authorize): FileAccess {
  const capability = (request: unknown) => {
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
        || target.purpose !== 'attachment' || !target.targetId) throw new FileError('FORBIDDEN');
      const [linked] = await tx.query(`SELECT aa.file_id FROM attempt_attachments aa
        JOIN attempts current_attempt ON current_attempt.id=aa.attempt_id AND current_attempt.activity_id=aa.activity_id
        JOIN attempts original ON original.id=$3::uuid AND original.activity_id=current_attempt.activity_id
          AND original.student_activity_id=current_attempt.student_activity_id
        JOIN student_activities sa ON sa.id=current_attempt.student_activity_id AND sa.classroom_id=aa.classroom_id
        JOIN enrollments e ON e.id=sa.enrollment_id AND e.classroom_id=sa.classroom_id
        JOIN files f ON f.id=aa.file_id AND f.classroom_id=aa.classroom_id AND f.uploaded_by_id=e.student_id
        WHERE aa.attempt_id=$1::uuid AND aa.file_id=$2::uuid AND aa.classroom_id=$4::uuid
          AND current_attempt.status='SUBMITTED' AND original.status='SUBMITTED'
        FOR SHARE OF aa,current_attempt,original,sa,e,f`, grant.attemptId, grant.fileId, target.targetId, grant.classroomId);
      if (!linked) throw new FileError('FORBIDDEN');
      await authorize(grant, signal, tx);
    },
  };
}

async function attachmentSnapshot(files: FileService, request: object, grant: GradingAttachmentGrant): Promise<GradingAttachmentSnapshot> {
  return files.store.transaction(async tx => {
    const [linked] = await tx.query(`SELECT file_id FROM attempt_attachments
      WHERE attempt_id=$1::uuid AND file_id=$2::uuid FOR SHARE`, grant.attemptId, grant.fileId);
    if (!linked) throw new FileError('FILE_NOT_READY');
    const row = await files.store.loadAuthorized(tx, request, grant.fileId, 'read');
    requireReady(row);
    if (row.classroom_id !== grant.classroomId || row.classroom_draft_id !== null || row.purpose !== 'attachment'
      || !row.target_id || row.blob_deleted_at || !row.digest || Number(row.size_bytes) > 20_000_000) {
      throw new FileError('FILE_NOT_READY');
    }
    return { classroomId: row.classroom_id, attemptId: grant.attemptId, fileId: row.id, digest: row.digest,
      extension: row.extension, approved: row.validation_status === 'APPROVED', clean: row.scan_status === 'CLEAN' };
  });
}

/** Creates an unforgeable file capability bound to the authorized grading job. */
export function createDurableGradingAiAttachmentReader<T = Awaited<ReturnType<typeof parseActivityDocument>>>(options: {
  files: FileService; authorize: Authorize; parse?: Parser<T>;
}) {
  const capabilities = new WeakMap<object, Capability>();
  const files = new FileService({ database: options.files.store.database, access: privateAccess(capabilities, options.authorize),
    storage: options.files.storage, scanner: options.files.scanner, draftQuotaBytes: options.files.store.draftQuotaBytes });
  return {
    async read(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<T> {
      const request = Object.freeze({}); capabilities.set(request, { grant, signal });
      const reader = createGradingAiAttachmentReader<T>({
        authorize: options.authorize,
        snapshot: () => attachmentSnapshot(files, request, grant),
        readBytes: async () => (await files.read(request, grant.fileId)).bytes,
        parse: options.parse ?? (parseActivityDocument as Parser<T>),
      });
      return reader.read(grant, signal);
    },
  };
}
