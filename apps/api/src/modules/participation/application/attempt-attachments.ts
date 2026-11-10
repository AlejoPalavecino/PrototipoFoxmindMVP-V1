import type { QuestionnaireAttemptsRepository } from './questionnaire-attempts.ts';
import type { EditorCapability } from '../domain/attempt-policy.ts';
import type { Transaction } from '../../classrooms/public.ts';
import { fail } from '../../classrooms/public.ts';

interface AttachmentTarget {
  userId: string;
  classroomId: string;
  attemptId: string;
  fileId?: string;
}

interface AttachmentFileFacts {
  uploadIsUsable(tx: Transaction, fileId: string): Promise<boolean>;
  pendingReservationCount(tx: Transaction, attemptId: string, excludedFileIds: readonly string[]): Promise<number>;
}

/** The caller owns the authenticated transaction, including any ready-state changes. */
export function createAttemptAttachments(facts: AttachmentFileFacts, repository: AttemptAttachmentsRepository) {
  async function authorize(tx: Transaction, target: AttachmentTarget, editor: EditorCapability) {
    const { userId, classroomId, attemptId, fileId } = target;
    // An unrelated revision change does not revoke the current editor.
    const { attempt } = await repository.assertAttemptWrite(tx, userId, classroomId, attemptId, editor);
    if (attempt.activity_type !== 'ASSIGNMENT') return fail('FORBIDDEN');
    if (fileId && !await facts.uploadIsUsable(tx, fileId)) return fail('CONFLICT');
    // Both reads share the classroom and attempt locks acquired above. A selected file may
    // have custody from an earlier attempt, and a selected reservation must count only once.
    const selected = await repository.selected(tx,attemptId,fileId ?? null);
    const excluded = selected.map(row => row.file_id);
    if (fileId) excluded.push(fileId);
    if (selected.length + await facts.pendingReservationCount(tx, attemptId, excluded) >= 5) return fail('CONFLICT');
    return attempt;
  }

  return {
    async authorizeWrite(tx: Transaction, target: AttachmentTarget, editor: EditorCapability): Promise<void> {
      await authorize(tx, target, editor);
    },
    async associateReady(tx: Transaction, target: AttachmentTarget & { fileId: string }, editor: EditorCapability): Promise<void> {
      const attempt = await authorize(tx, target, editor);
      const added = await repository.associate(tx,target.attemptId,attempt.activity_id,target.classroomId,target.fileId);
      if (added.length) await repository.advanceRevision(tx,target.attemptId);
    },
  };
}

export interface AttemptAttachmentsRepository {
 assertAttemptWrite: QuestionnaireAttemptsRepository['assertAttemptWrite'];
selected(tx:Transaction,...values:unknown[]):Promise<({ file_id: string })[]>;
associate(tx:Transaction,...values:unknown[]):Promise<(Record<string,unknown>)[]>;
advanceRevision(tx:Transaction,...values:unknown[]):Promise<(Record<string,unknown>)[]>;
}
