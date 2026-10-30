import type { ActivityAuthoringService, ActivityRow } from './activity-authoring.ts';
import type { Transaction } from './contracts.ts';
import type { AttemptRow, Obligation } from './attempt-access.ts';
import { receptionPolicy } from './attempt-policy.ts';
import { isVerifiedRead } from './context.ts';
import { practicalAttachments, questionnaireUnanswered } from './session-readers.ts';

export async function studentObligation(tx: Transaction, classroomId: string, activityId: string, studentId: string) {
  const [row] = await tx.query<Obligation>(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
    WHERE sa.classroom_id=$1::uuid AND sa.activity_id=$2::uuid AND e.student_id=$3::uuid FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'} OF e,sa`,
  classroomId, activityId, studentId);
  return row ?? null;
}
export async function studentActivityView(activityView: ActivityAuthoringService['activityView'], tx: Transaction,
  row: ActivityRow, zone: string, studentId: string, archived = false) {
  const view = await activityView(tx, row, zone, false);
  if (row.type !== 'ASSIGNMENT' || archived) return view;
  const obligation = await studentObligation(tx, row.classroom_id, row.id, studentId);
  const [attempt] = obligation ? await tx.query('SELECT id FROM attempts WHERE student_activity_id=$1::uuid LIMIT 1', obligation.id) : [];
  return attempt ? view : { ...view, instructions: null, instructionFiles: [], materials: [] };
}
export async function sessionView(activityView: ActivityAuthoringService['activityView'], tx: Transaction, activity: ActivityRow,
  zone: string, archived: boolean, obligation: Obligation | null, attempt: AttemptRow | null, now: Date) {
  const reception = receptionPolicy(activity.deadline_at, attempt?.individual_deadline_at ?? obligation?.first_submission_deadline_at ?? null,
    activity.allow_late_submissions, now);
  const needsStart = !!obligation && (obligation.is_expected || activity.type === 'ASSIGNMENT') && !attempt;
  let view = await activityView(tx, activity, zone, false);
  if (activity.type === 'ASSIGNMENT' && !attempt && !archived) view = { ...view, instructions: null, instructionFiles: [], materials: [] };
  const answers = attempt ? await tx.query<{ questionId: string; text: string | null; savedAt: Date; optionIds: string[] }>(`SELECT
    a.question_id AS "questionId",a.development_text AS text,a.saved_at AS "savedAt",
    COALESCE((SELECT array_agg(s.option_id ORDER BY s.option_id) FROM answer_selections s WHERE s.answer_id=a.id),'{}'::uuid[]) AS "optionIds"
    FROM answers a WHERE a.attempt_id=$1::uuid ORDER BY a.question_id`, attempt.id) : [];
  const attemptView = attempt ? { id: attempt.id, number: attempt.attempt_number, status: attempt.status, openedAt: attempt.opened_at,
    submittedAt: attempt.submitted_at, appliedDeadlineAt: attempt.applied_deadline_at, submittedLate: attempt.submitted_late,
    epoch: attempt.editor_epoch.toString(), revision: attempt.revision.toString(), answers,
    ...(activity.type === 'ASSIGNMENT' ? { attachments: await practicalAttachments(tx, attempt.id, attempt.status === 'DRAFT') } : {}) } : null;
  return { activity: view, expected: obligation?.is_expected ?? false, eligibilityReason: obligation?.eligibility_reason ?? null,
    archived, serverTime: now, reception: { deadlineAt: reception.deadline, open: reception.open, late: reception.late },
    canStart: needsStart && !archived && (reception.open || activity.type === 'ASSIGNMENT'), canTransfer: !!attempt && attempt.status === 'DRAFT'
      && !!obligation?.is_expected && !archived && reception.open, attempt: attemptView,
    ...(attempt && activity.type !== 'ASSIGNMENT' ? { unansweredCount: await questionnaireUnanswered(tx, activity.id, attempt.id) } : {}) };
}
