import { assertAttemptWrite } from './attempt-access.ts';
import type { EditorCapability } from './attempt-policy.ts';
import type { Transaction } from './contracts.ts';
import { fail } from './policy.ts';

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
export function createAttemptAttachments(facts: AttachmentFileFacts) {
  async function authorize(tx: Transaction, target: AttachmentTarget, editor: EditorCapability) {
    const { userId, classroomId, attemptId, fileId } = target;
    // An unrelated revision change does not revoke the current editor.
    const { attempt } = await assertAttemptWrite(tx, userId, classroomId, attemptId, editor);
    if (attempt.activity_type !== 'ASSIGNMENT') return fail('FORBIDDEN');
    if (fileId && !await facts.uploadIsUsable(tx, fileId)) return fail('CONFLICT');
    // Both reads share the classroom and attempt locks acquired above. A selected file may
    // have custody from an earlier attempt, and a selected reservation must count only once.
    const selected = await tx.query<{ file_id: string }>(`SELECT file_id FROM attempt_attachments
      WHERE attempt_id=$1::uuid AND file_id IS DISTINCT FROM $2::uuid`, attemptId, fileId ?? null);
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
      const added = await tx.query(`INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position)
        SELECT $1::uuid,$2::uuid,$3::uuid,$4::uuid,COALESCE(MAX(position)+1,0) FROM attempt_attachments WHERE attempt_id=$1::uuid
        ON CONFLICT(attempt_id,file_id) DO NOTHING RETURNING file_id`, target.attemptId, attempt.activity_id, target.classroomId, target.fileId);
      if (added.length) await tx.query(`UPDATE attempts SET revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING id`, target.attemptId);
    },
  };
}
