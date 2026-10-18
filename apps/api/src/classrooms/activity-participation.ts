import { randomBytes, randomUUID } from 'node:crypto';
import { ActivityAuthoringService, type ActivityRow } from './activity-authoring.ts';
import { exactActivityObject } from './activity-policy.ts';
import { resolveDeadline } from './activity-time.ts';
import { revision } from './drafts.ts';
import { digest, fail, uuid } from './policy.ts';
import { receptionPolicy } from './attempt-policy.ts';
import type { Transaction } from './contracts.ts';
import { activityEvent } from './activity-events.ts';

export { resolveAttemptContext, assertAttemptWrite } from './attempt-access.ts';
import { resolveAttemptContext, type AttemptRow, type Obligation } from './attempt-access.ts';
export type { AttemptRow } from './attempt-access.ts';

export class ActivityParticipationService extends ActivityAuthoringService {
  private async obligation(tx: Transaction, classroomId: string, activityId: string, studentId: string) {
    const [row] = await tx.query<Obligation>(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
      WHERE sa.classroom_id=$1::uuid AND sa.activity_id=$2::uuid AND e.student_id=$3::uuid FOR UPDATE OF e,sa`,
    classroomId, activityId, studentId);
    return row ?? null;
  }

  protected override async studentActivityView(tx: Transaction, row: ActivityRow, zone: string, studentId: string, archived = false) {
    const view = await this.activityView(tx, row, zone, false);
    if (row.type !== 'ASSIGNMENT' || archived) return view;
    const obligation = await this.obligation(tx, row.classroom_id, row.id, studentId);
    const [attempt] = obligation ? await tx.query('SELECT id FROM attempts WHERE student_activity_id=$1::uuid LIMIT 1', obligation.id) : [];
    if (obligation?.is_expected && !attempt) return { ...view, instructions: null, instructionFiles: [], materials: [] };
    return view;
  }

  activitySession(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      if (room.teacher_id === actor.id) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const obligation = await this.obligation(tx, classroomId, activityId, actor.id);
      const [attempt] = obligation ? await tx.query<AttemptRow>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE`, obligation.id) : [];
      const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      return this.sessionView(tx, activity, room.timezone, room.archived_at !== null, obligation, attempt ?? null, now);
    });
  }

  startActivity(request: unknown, classroomId: string, activityId: string, input: unknown) {
    exactActivityObject(input, []);
    return this.run(request, true, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, true);
      if (room.teacher_id === actor.id) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const obligation = await this.obligation(tx, classroomId, activityId, actor.id);
      if (!obligation?.is_expected) return fail('FORBIDDEN');
      let [attempt] = await tx.query<AttemptRow>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE`, obligation.id);
      const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      const reception = receptionPolicy(activity.deadline_at, attempt?.individual_deadline_at ?? obligation.first_submission_deadline_at,
        activity.allow_late_submissions, now);
      // Resuming never creates or increments an attempt, rotates editor control, or changes a submitted snapshot.
      if (attempt) return this.sessionView(tx, activity, room.timezone, false, obligation, attempt, now);
      if (!reception.open && activity.type !== 'ASSIGNMENT') return fail('CONFLICT');
      // A real first instruction opening locks TP content even after reception closes.
      // It is not a submission, does not reserve timeliness, and grants no editor while closed.
      const token = reception.open ? randomBytes(32).toString('base64url') : null;
      [attempt] = await tx.query<AttemptRow>(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,
        opened_at,individual_deadline_at,editor_token_hash,editor_epoch,revision)
        VALUES($1::uuid,$2,$3::uuid,$4::uuid,1,$2,$5,$6,$7,0) RETURNING *`,
      randomUUID(), now, obligation.id, activityId, obligation.first_submission_deadline_at, token ? digest(token) : null, token ? 1 : 0);
      await tx.query(`UPDATE activities SET first_started_at=COALESCE(first_started_at,$2),updated_at=$2
        WHERE id=$1::uuid RETURNING id`, activityId, now);
      await this.advanceRevision(tx, classroomId, room.revision);
      return { ...await this.sessionView(tx, { ...activity, first_started_at: activity.first_started_at ?? now }, room.timezone,
        false, obligation, attempt, now), ...(token ? { editor: { token, epoch: attempt.editor_epoch.toString() } } : {}) };
    });
  }

  transferAttemptEditor(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = exactActivityObject(input, ['revision']), expected = revision(body.revision);
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const context = await resolveAttemptContext(tx, actor.id, classroomId, attemptId), attempt = context.attempt;
      if (context.room.archived_at || attempt.status !== 'DRAFT' || attempt.activity_status !== 'PUBLISHED'
        || !attempt.is_expected || !context.reception.open || attempt.revision.toString() !== expected) return fail('CONFLICT');
      const token = randomBytes(32).toString('base64url');
      const [updated] = await tx.query<AttemptRow>(`UPDATE attempts SET editor_token_hash=$2,editor_epoch=editor_epoch+1,
        revision=revision+1,updated_at=$3 WHERE id=$1::uuid RETURNING *`, attemptId, digest(token), context.now);
      const room = await this.classroom(tx, actor, classroomId);
      const activity = await this.activity(tx, classroomId, updated.activity_id);
      const obligation = await this.obligation(tx, classroomId, activity.id, actor.id);
      return { ...await this.sessionView(tx, activity, room.timezone, false, obligation, updated, context.now),
        editor: { token, epoch: updated.editor_epoch.toString() } };
    });
  }

  activityEligibility(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, false, true);
      const activity = await this.activity(tx, classroomId, activityId);
      const students = await tx.query<{ studentId: string; firstName: string; lastName: string; expected: boolean;
        reason: string | null; individualDeadlineAt: Date | null }>(`SELECT e.student_id AS "studentId",u.first_name AS "firstName",u.last_name AS "lastName",
        COALESCE(sa.is_expected,false) AS expected,sa.eligibility_reason::text AS reason,sa.first_submission_deadline_at AS "individualDeadlineAt"
        FROM enrollments e JOIN users u ON u.id=e.student_id LEFT JOIN student_activities sa
        ON sa.enrollment_id=e.id AND sa.activity_id=$2::uuid WHERE e.classroom_id=$1::uuid
        AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)
        ORDER BY u.last_name,u.first_name,e.id`, classroomId, activity.id);
      return { revision: room.revision.toString(), published: activity.status === 'PUBLISHED', students };
    });
  }

  authorizeFirstSubmission(request: unknown, classroomId: string, activityId: string, input: unknown) {
    const body = exactActivityObject(input, ['revision', 'studentId', 'deadline']), expected = revision(body.revision);
    if (!uuid(body.studentId)) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, true, true);
      if (room.revision.toString() !== expected) return fail('CONFLICT');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('CONFLICT');
      const [member] = await tx.query(`SELECT e.id FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid AND m.ended_at IS NULL FOR UPDATE OF e FOR SHARE OF m`, classroomId, body.studentId);
      if (!member) return fail('FORBIDDEN');
      const obligation = await this.obligation(tx, classroomId, activityId, body.studentId);
      if (!obligation || obligation.is_expected) return fail('CONFLICT');
      const [prior] = await tx.query('SELECT id FROM attempts WHERE student_activity_id=$1::uuid FOR UPDATE', obligation.id);
      if (prior) return fail('CONFLICT');
      const deadline = resolveDeadline(room.timezone, body.deadline);
      const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      if (!deadline || deadline <= now) return fail('INVALID_INPUT');
      await tx.query(`UPDATE student_activities SET is_expected=true,eligibility_reason='TEACHER_AUTHORIZATION',eligible_at=$2,
        authorized_by_id=$3::uuid,first_submission_deadline_at=$4,updated_at=$2 WHERE id=$1::uuid RETURNING id`,
      obligation.id, now, actor.id, deadline);
      await activityEvent(tx, classroomId, activityId, 'FIRST_SUBMISSION_ENABLED', body.studentId);
      return this.advanceRevision(tx, classroomId, room.revision);
    });
  }

  protected async sessionView(tx: Transaction, activity: ActivityRow, zone: string, archived: boolean,
    obligation: Obligation | null, attempt: AttemptRow | null, now: Date) {
    const reception = receptionPolicy(activity.deadline_at, attempt?.individual_deadline_at ?? obligation?.first_submission_deadline_at ?? null,
      activity.allow_late_submissions, now);
    const needsStart = !!obligation?.is_expected && !attempt;
    let view = await this.activityView(tx, activity, zone, false);
    if (activity.type === 'ASSIGNMENT' && needsStart && !archived) view = { ...view, instructions: null, instructionFiles: [], materials: [] };
    const answers = attempt ? await tx.query<{ questionId: string; text: string | null; savedAt: Date; optionIds: string[] }>(`SELECT
      a.question_id AS "questionId",a.development_text AS text,a.saved_at AS "savedAt",
      COALESCE((SELECT array_agg(s.option_id ORDER BY s.option_id) FROM answer_selections s WHERE s.answer_id=a.id),'{}'::uuid[]) AS "optionIds"
      FROM answers a WHERE a.attempt_id=$1::uuid ORDER BY a.question_id`, attempt.id) : [];
    return { activity: view, expected: obligation?.is_expected ?? false, eligibilityReason: obligation?.eligibility_reason ?? null,
      archived, serverTime: now, reception: { deadlineAt: reception.deadline, open: reception.open, late: reception.late },
      canStart: needsStart && !archived && (reception.open || activity.type === 'ASSIGNMENT'), canTransfer: !!attempt && attempt.status === 'DRAFT'
        && !!obligation?.is_expected && !archived && reception.open,
      attempt: attempt ? { id: attempt.id, number: attempt.attempt_number, status: attempt.status, openedAt: attempt.opened_at,
        submittedAt: attempt.submitted_at, appliedDeadlineAt: attempt.applied_deadline_at, submittedLate: attempt.submitted_late,
        epoch: attempt.editor_epoch.toString(), revision: attempt.revision.toString(), answers } : null };
  }
}
