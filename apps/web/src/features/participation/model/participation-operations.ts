import type { AnswerConfirmation } from '../../../../../../src/core/contracts/participation.ts';
import type { FileState } from '../../../../../../src/core/contracts/materials.ts';

export interface AttemptSubmissionReceipt {
  submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null;
}
export interface AnswerWrite {
  revision: string; questionId: string; text: string; optionIds: string[];
}
export interface QuestionnaireAttemptOperations {
  saveAnswer(input: AnswerWrite, signal?: AbortSignal): Promise<AnswerConfirmation>;
  submitAnswers(revision: string, confirmIncomplete: boolean, signal?: AbortSignal): Promise<AttemptSubmissionReceipt>;
}
export interface PracticalAttemptOperations {
  saveResponse(revision: string, text: string, signal?: AbortSignal): Promise<{ revision: string; text: string }>;
  submitPractical(revision: string, signal?: AbortSignal): Promise<AttemptSubmissionReceipt>;
}
export interface AttemptReadingOperations {
  fileUrl(id: string, preview?: boolean): string;
}
export interface AttemptAttachmentOperations extends AttemptReadingOperations {
  upload(file: File): Promise<FileState>;
  remove(revision: string, fileId: string, signal?: AbortSignal): Promise<unknown>;
}
