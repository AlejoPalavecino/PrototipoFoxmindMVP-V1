import { revision } from './revision.ts';
import { fail, uuid } from './policy.ts';
import { editorCapability, matchesEditor, receptionPolicy, type EditorCapability } from './attempt-policy.ts';
import type { Transaction } from './contracts.ts';

export interface Obligation {
  id: string; is_expected: boolean; eligibility_reason: string; eligible_at: Date | null;
  first_submission_deadline_at: Date | null;
}
export interface AttemptRow {
  id: string; activity_id: string; student_activity_id: string; attempt_number: number;
  status: 'DRAFT' | 'SUBMITTED'; opened_at: Date; submitted_at: Date | null;
  individual_deadline_at: Date | null; applied_deadline_at: Date | null; submitted_late: boolean | null;
  editor_token_hash: string | null; editor_epoch: bigint; revision: bigint;
}

/** Transaction-only resolver for future answer/file writers. No admission or standalone session validation here. */
export async function resolveAttemptContext(tx: Transaction, userId: string, classroomId: string, attemptId: string) {
  if (![userId, classroomId, attemptId].every(uuid)) return fail('FORBIDDEN');
  const [room] = await tx.query<{ archived_at: Date | null }>(
    'SELECT archived_at FROM classrooms WHERE id=$1::uuid FOR UPDATE', classroomId);
  if (!room) return fail('FORBIDDEN');
  const [row] = await tx.query<AttemptRow & { student_id: string; is_expected: boolean; activity_status: string;
    deadline_at: Date | null; allow_late_submissions: boolean; activity_type: string; attachments_required: boolean }>(`SELECT a.*,e.student_id,sa.is_expected,
    activity.status::text AS activity_status,activity.deadline_at,activity.allow_late_submissions,
    activity.type::text AS activity_type,activity.attachments_required
    FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
    JOIN enrollments e ON e.id=sa.enrollment_id JOIN activities activity ON activity.id=a.activity_id
    WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid
    FOR UPDATE OF activity,e,sa,a`, attemptId, classroomId);
  if (!row || row.student_id !== userId) return fail('FORBIDDEN');
  const [membership] = await tx.query(`SELECT id FROM membership_periods WHERE enrollment_id=
    (SELECT enrollment_id FROM student_activities WHERE id=$1::uuid) AND ended_at IS NULL FOR SHARE`, row.student_activity_id);
  if (!membership) return fail('FORBIDDEN');
  const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
  return { room, attempt: row, now, reception: receptionPolicy(row.deadline_at, row.individual_deadline_at, row.allow_late_submissions, now) };
}

/** An editor epoch is authorization; an optional revision is an independent compare-and-swap guard. */
export async function assertAttemptWrite(tx: Transaction, userId: string, classroomId: string, attemptId: string,
  capability: EditorCapability, expectedRevision?: unknown, receivedAt?: Date) {
  const context = await resolveAttemptContext(tx, userId, classroomId, attemptId), a = context.attempt;
  const parsed = editorCapability(capability.token, capability.epoch);
  const reception = receivedAt ? receptionPolicy(a.deadline_at, a.individual_deadline_at, a.allow_late_submissions, receivedAt) : context.reception;
  if (context.room.archived_at || a.status !== 'DRAFT' || a.activity_status !== 'PUBLISHED'
    || !a.is_expected || !reception.open) return fail('CONFLICT');
  if (!matchesEditor(a.editor_token_hash, a.editor_epoch, parsed)) return fail('FORBIDDEN');
  if (expectedRevision !== undefined && a.revision.toString() !== revision(expectedRevision)) return fail('CONFLICT');
  return { ...context, reception };
}

