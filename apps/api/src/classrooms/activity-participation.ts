import { randomBytes, randomUUID } from 'node:crypto';
import type { ActivityRow } from './activity-authoring.ts';
import type { ClassroomCore } from './core.ts';
import type { ActivityAuthoringService } from './activity-authoring.ts';
import type { PlanService } from './plan.ts';
import type { sessionView } from './activity-session.ts';
import { exactActivityObject } from './activity-policy.ts';
import { resolveDeadline } from './activity-time.ts';
import { revision } from './drafts.ts';
import { digest, fail, uuid } from './policy.ts';
import { receptionPolicy } from './attempt-policy.ts';
import type { Transaction } from './contracts.ts';
import { activityEvent } from './activity-events.ts';
import { isVerifiedRead } from './context.ts';

export { resolveAttemptContext, assertAttemptWrite } from './attempt-access.ts';
import { resolveAttemptContext, type AttemptRow, type Obligation } from './attempt-access.ts';
export type { AttemptRow } from './attempt-access.ts';

export class ActivityParticipationService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly activity: ActivityAuthoringService['activity'];
  private readonly advanceRevision: PlanService['advanceRevision'];
  private readonly sessionView: (...args: Parameters<typeof sessionView> extends [unknown, ...infer Rest] ? Rest : never) => ReturnType<typeof sessionView>;
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom'>, dependencies: {
    activity: ActivityAuthoringService['activity']; advanceRevision: PlanService['advanceRevision']; sessionView: ActivityParticipationService['sessionView'];
  }) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context);
    this.activity = dependencies.activity; this.advanceRevision = dependencies.advanceRevision; this.sessionView = dependencies.sessionView;
  }
  private async obligation(tx: Transaction, classroomId: string, activityId: string, studentId: string) {
    const [row] = await tx.query<Obligation>(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
      WHERE sa.classroom_id=$1::uuid AND sa.activity_id=$2::uuid AND e.student_id=$3::uuid FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'} OF e,sa`,
    classroomId, activityId, studentId);
    return row ?? null;
  }

  activitySession(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      if (room.teacher_id === actor.id) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const obligation = await this.obligation(tx, classroomId, activityId, actor.id);
      const [attempt] = obligation ? await tx.query<AttemptRow>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC LIMIT 1 FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'}`, obligation.id) : [];
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
      if (!obligation || (!obligation.is_expected && activity.type !== 'ASSIGNMENT')) return fail('FORBIDDEN');
      let [attempt] = await tx.query<AttemptRow>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE`, obligation.id);
      const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      const reception = receptionPolicy(activity.deadline_at, attempt?.individual_deadline_at ?? obligation.first_submission_deadline_at,
        activity.allow_late_submissions, now);
      // Resuming never creates or increments an attempt, rotates editor control, or changes a submitted snapshot.
      if (attempt) return this.sessionView(tx, activity, room.timezone, false, obligation, attempt, now);
      if (!reception.open && activity.type !== 'ASSIGNMENT') return fail('CONFLICT');
      // A real first instruction opening locks TP content even after reception closes.
      // It is not a submission or an eligibility change; only expected work with open reception gets an editor.
      const token = obligation.is_expected && reception.open ? randomBytes(32).toString('base64url') : null;
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
      const prior = await tx.query<AttemptRow>('SELECT * FROM attempts WHERE student_activity_id=$1::uuid ORDER BY attempt_number FOR UPDATE', obligation.id);
      // A real instruction-only opening is still the first submission opportunity, not a resubmission.
      // Never reuse submitted history or a reopened/additional attempt through this initial-authorization path.
      if (prior.length && (activity.type !== 'ASSIGNMENT' || prior.length !== 1 || prior[0].attempt_number !== 1
        || prior[0].status !== 'DRAFT' || prior[0].submitted_at !== null)) return fail('CONFLICT');
      const deadline = resolveDeadline(room.timezone, body.deadline);
      const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      if (!deadline || deadline <= now) return fail('INVALID_INPUT');
      await tx.query(`UPDATE student_activities SET is_expected=true,eligibility_reason='TEACHER_AUTHORIZATION',eligible_at=$2,
        authorized_by_id=$3::uuid,first_submission_deadline_at=$4,updated_at=$2 WHERE id=$1::uuid RETURNING id`,
      obligation.id, now, actor.id, deadline);
      if (prior.length) await tx.query(`UPDATE attempts SET individual_deadline_at=$2,updated_at=$3
        WHERE id=$1::uuid RETURNING id`, prior[0].id, deadline, now);
      await activityEvent(tx, classroomId, activityId, 'FIRST_SUBMISSION_ENABLED', body.studentId);
      return this.advanceRevision(tx, classroomId, room.revision);
    });
  }

}
