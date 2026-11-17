import type { ClassroomClient } from '../../../../../src/core/contracts/academic-client.ts';
import type { AttemptEditor } from '../../../../../src/core/contracts/participation.ts';
import type { AttemptAttachmentOperations, AttemptReadingOperations, PracticalAttemptOperations, QuestionnaireAttemptOperations } from './model/participation-operations.ts';

export type { AnswerWrite, AttemptAttachmentOperations, AttemptReadingOperations, AttemptSubmissionReceipt, PracticalAttemptOperations, QuestionnaireAttemptOperations } from './model/participation-operations.ts';
export type AttemptWriteTransport = Pick<ClassroomClient, 'attempt'>;
export type AttemptAttachmentTransport = Pick<ClassroomClient, 'attempt' | 'uploadAttachment' | 'fileUrl'>;

function attemptWriter(transport: AttemptWriteTransport, classroomId: string, attemptId: string | null, editor: AttemptEditor | null) {
  return async <T>(action: string, input: unknown, unavailable: string, signal?: AbortSignal): Promise<T> => {
    if (!transport.attempt || !editor || !attemptId) throw new Error(unavailable);
    return transport.attempt<T>(`/${classroomId}/attempts/${attemptId}/${action}`, input, editor, signal);
  };
}

export function createQuestionnaireAttemptApi(transport: AttemptWriteTransport, classroomId: string, attemptId: string | null, editor: AttemptEditor | null): QuestionnaireAttemptOperations {
  const write = attemptWriter(transport, classroomId, attemptId, editor);
  return {
    saveAnswer: (input, signal) => write('answer', input, 'El guardado no está disponible en esta pestaña.', signal),
    submitAnswers: (revision, confirmIncomplete, signal) => write('submit-answers', { revision, confirm: true, confirmIncomplete }, 'El envío no está disponible.', signal),
  };
}

export function createPracticalAttemptApi(transport: AttemptWriteTransport, classroomId: string, attemptId: string | null, editor: AttemptEditor | null): PracticalAttemptOperations {
  const write = attemptWriter(transport, classroomId, attemptId, editor);
  return {
    saveResponse: (revision, text, signal) => write('practical-response', { revision, text }, 'El guardado no está disponible.', signal),
    submitPractical: (revision, signal) => write('submit-practical', { revision, confirm: true }, 'El envío no está disponible.', signal),
  };
}

export function createAttemptReadingApi(transport: Pick<ClassroomClient, 'fileUrl'>): AttemptReadingOperations {
  return { fileUrl: (id, preview) => transport.fileUrl(id, preview) };
}

export function createAttemptAttachmentsApi(transport: AttemptAttachmentTransport, classroomId: string, attemptId: string | null, editor: AttemptEditor | null): AttemptAttachmentOperations {
  const write = attemptWriter(transport, classroomId, attemptId, editor);
  return {
    ...createAttemptReadingApi(transport),
    upload: async file => {
      if (!transport.uploadAttachment || !editor || !attemptId) throw new Error('La carga no está disponible.');
      return transport.uploadAttachment(classroomId, attemptId, file, editor);
    },
    remove: (revision, fileId, signal) => write('attachments-remove', { revision, fileId }, 'El flujo de archivos no está disponible.', signal),
  };
}
