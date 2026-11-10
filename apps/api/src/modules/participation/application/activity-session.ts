import type { ActivityReadPort, ActivityRow } from '../../activities/public.ts';
import type { Transaction } from '../../classrooms/public.ts';
import type { AttemptRow, Obligation } from './attempt-contracts.ts';
import { receptionPolicy } from '../domain/attempt-policy.ts';


export async function studentObligation(repository: ActivitySessionRepository, tx: Transaction, classroomId: string, activityId: string, studentId: string) {
  const [row] = await repository.obligation(tx, classroomId, activityId, studentId);
  return row ?? null;
}
export async function studentActivityView(repository: ActivitySessionRepository, activityView: ActivityReadPort['activityView'], tx: Transaction,
  row: ActivityRow, zone: string, studentId: string, archived = false) {
  const view = await activityView(tx, row, zone, false);
  if (row.type !== 'ASSIGNMENT' || archived) return view;
  const obligation = await studentObligation(repository, tx, row.classroom_id, row.id, studentId);
  const [attempt] = obligation ? await repository.firstAttempt(tx, obligation.id) : [];
  return attempt ? view : { ...view, instructions: null, instructionFiles: [], materials: [] };
}
export async function sessionView(repository: ActivitySessionRepository, activityView: ActivityReadPort['activityView'], tx: Transaction, activity: ActivityRow,
  zone: string, archived: boolean, obligation: Obligation | null, attempt: AttemptRow | null, now: Date) {
  const reception = receptionPolicy(activity.deadline_at, attempt?.individual_deadline_at ?? obligation?.first_submission_deadline_at ?? null,
    activity.allow_late_submissions, now);
  const needsStart = !!obligation && (obligation.is_expected || activity.type === 'ASSIGNMENT') && !attempt;
  let view = await activityView(tx, activity, zone, false);
  if (activity.type === 'ASSIGNMENT' && !attempt && !archived) view = { ...view, instructions: null, instructionFiles: [], materials: [] };
  const answers = attempt ? await repository.answers(tx, attempt.id) : [];
  const attemptView = attempt ? { id: attempt.id, number: attempt.attempt_number, status: attempt.status, openedAt: attempt.opened_at,
    submittedAt: attempt.submitted_at, appliedDeadlineAt: attempt.applied_deadline_at, submittedLate: attempt.submitted_late,
    epoch: attempt.editor_epoch.toString(), revision: attempt.revision.toString(), answers,
    ...(activity.type === 'ASSIGNMENT' ? { practicalResponse:attempt.practical_response, attachments: await repository.practicalAttachments(tx, attempt.id, attempt.status === 'DRAFT') } : {}) } : null;
  return { activity: view, expected: obligation?.is_expected ?? false, eligibilityReason: obligation?.eligibility_reason ?? null,
    archived, serverTime: now, reception: { deadlineAt: reception.deadline, open: reception.open, late: reception.late },
    canStart: needsStart && !archived && (reception.open || activity.type === 'ASSIGNMENT'), canTransfer: !!attempt && attempt.status === 'DRAFT'
      && !!obligation?.is_expected && !archived && reception.open, attempt: attemptView,
    ...(attempt && activity.type !== 'ASSIGNMENT' ? { unansweredCount: await repository.questionnaireUnanswered(tx, activity.id, attempt.id) } : {}) };
}

export interface ActivitySessionRepository {
 practicalAttachments(tx: Transaction, attemptId: string, draft: boolean): Promise<{ id: string; name: string; extension: string; sizeBytes: string; ready: boolean; selected: boolean; upload: string; validation: string; scan: string; rejectionCode: string | null }[]>;
 questionnaireUnanswered(tx: Transaction, activityId: string, attemptId: string): Promise<number>;
  obligation(tx: Transaction, ...values: unknown[]): Promise<Obligation[]>;
  firstAttempt(tx: Transaction, ...values: unknown[]): Promise<Record<string, unknown>[]>;
  answers(tx: Transaction, ...values: unknown[]): Promise<{ questionId: string; text: string | null; savedAt: Date; optionIds: string[] }[]>;
}

export interface SessionProjection {
 studentObligation: (...args: Parameters<typeof studentObligation> extends [unknown, ...infer Args] ? Args : never) => ReturnType<typeof studentObligation>;
 studentActivityView: (...args: Parameters<typeof studentActivityView> extends [unknown, ...infer Args] ? Args : never) => ReturnType<typeof studentActivityView>;
 sessionView: (...args: Parameters<typeof sessionView> extends [unknown, unknown, ...infer Args] ? Args : never) => ReturnType<typeof sessionView>;
}
export type ActivitySessionProjectionPort = SessionProjection;
