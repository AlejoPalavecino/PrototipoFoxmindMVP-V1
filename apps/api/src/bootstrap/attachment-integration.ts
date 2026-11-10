import type { IncomingMessage } from 'node:http';
import { createAttemptAttachments } from '../modules/participation/infrastructure/attempt-attachments.ts';
import { editorCapability } from '../modules/participation/domain/attempt-policy.ts';
import { ClassroomError } from '../../../../src/core/domain/classrooms/policy.ts';
import { attachmentCustody } from '../modules/files/infrastructure/attachment-custody.ts';
import { FileError } from '../modules/files/domain/errors.ts';
import type { AttachmentIntegration } from './files-files.module.ts';

const attempts = createAttemptAttachments(attachmentCustody);

function editorFrom(request: unknown) {
  const headers = (request as IncomingMessage).headers;
  return editorCapability(headers?.['x-attempt-editor'], headers?.['x-attempt-epoch']);
}

async function fileBoundary(operation: () => Promise<void>): Promise<void> {
  try { await operation(); }
  catch (error) {
    if (error instanceof ClassroomError) throw new FileError(error.code === 'FORBIDDEN' ? 'FORBIDDEN'
      : error.code === 'INVALID_INPUT' ? 'INVALID_UPLOAD' : error.code === 'CONFLICT' ? 'UPLOAD_CONFLICT' : 'SERVICE_UNAVAILABLE');
    throw error;
  }
}

export const attachmentIntegration: AttachmentIntegration = {
  authorizeAttemptWrite: (tx, userId, target, request) => fileBoundary(async () => {
    if (target.purpose !== 'attachment' || target.scope.kind !== 'classroom' || !target.targetId) throw new FileError('FORBIDDEN');
    await attempts.authorizeWrite(tx, { userId, classroomId: target.scope.id, attemptId: target.targetId, fileId: target.fileId }, editorFrom(request));
  }),
  onReadyTransition: (tx, request, row) => fileBoundary(async () => {
    if (row.purpose !== 'attachment') return;
    if (!row.classroom_id || !row.target_id) throw new FileError('FORBIDDEN');
    await attempts.associateReady(tx, { userId: row.uploaded_by_id, classroomId: row.classroom_id, attemptId: row.target_id, fileId: row.id }, editorFrom(request));
  }),
};
