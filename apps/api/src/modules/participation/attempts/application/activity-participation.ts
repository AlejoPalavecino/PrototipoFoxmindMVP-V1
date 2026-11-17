import type { resolveAttemptContext } from './attempt-access.ts';
import type { ActivityRow } from '../../../activities/public.ts';
import type { AcademicFeatureContext } from '../../../classrooms/public.ts';
import type { ActivityReadPort } from '../../../activities/public.ts';
import type { RevisionPort } from '../../../classrooms/public.ts';
import type { SessionProjection } from './activity-session.ts';
import { exactActivityObject } from '../../../activities/public.ts';
import { resolveDeadline } from '../../../activities/public.ts';
import { revision } from '../../../classrooms/public.ts';
import { fail, uuid } from '../../../classrooms/public.ts';
import { receptionPolicy } from '../../domain/attempt-policy.ts';
import type { Transaction } from '../../../classrooms/public.ts';


export { resolveAttemptContext, assertAttemptWrite } from './attempt-access.ts';
import { type AttemptRow, type Obligation } from './attempt-access.ts';
export type { AttemptRow } from './attempt-access.ts';

export class ActivityParticipationService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly activity: ActivityReadPort['activity'];
  private readonly advanceRevision: RevisionPort;
  private readonly sessionView: SessionProjection['sessionView'];
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom'>, dependencies: {
    activity: ActivityReadPort['activity']; advanceRevision: RevisionPort; sessionView: ActivityParticipationService['sessionView'];
  }, private readonly repository: ActivityParticipationRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context);
    this.activity = dependencies.activity; this.advanceRevision = dependencies.advanceRevision; this.sessionView = dependencies.sessionView;
  }
  private async obligation(tx: Transaction, classroomId: string, activityId: string, studentId: string) {
    const [row] = await this.repository.obligation(tx, { classroomId: classroomId, activityId: activityId, studentId: studentId });
    return row ?? null;
  }

  activitySession(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      if (room.teacher_id === actor.id) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const obligation = await this.obligation(tx, classroomId, activityId, actor.id);
      const [attempt] = obligation ? await this.repository.latestAttempt(tx, { obligationId: obligation.id }) : [];
      const [{ now }] = await this.repository.sessionClock(tx);
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
      let [attempt] = await this.repository.existingAttempt(tx, { obligationId: obligation.id });
      const [{ now }] = await this.repository.startClock(tx);
      const reception = receptionPolicy(activity.deadline_at, attempt?.individual_deadline_at ?? obligation.first_submission_deadline_at,
        activity.allow_late_submissions, now);
      // Resuming never creates or increments an attempt, rotates editor control, or changes a submitted snapshot.
      if (attempt) return this.sessionView(tx, activity, room.timezone, false, obligation, attempt, now);
      if (!reception.open && activity.type !== 'ASSIGNMENT') return fail('CONFLICT');
      // A real first instruction opening locks TP content even after reception closes.
      // It is not a submission or an eligibility change; only expected work with open reception gets an editor.
      const token = obligation.is_expected && reception.open ? this.repository.editorToken() : null;
      [attempt] = await this.repository.insertAttempt(tx, { id: this.repository.randomUUID(), now: now, obligationId: obligation.id, activityId: activityId, deadline: obligation.first_submission_deadline_at, editorTokenHash: token ? this.repository.digest(token) : null, editorEpoch: token ? 1 : 0 });
      await this.repository.markStarted(tx, { activityId: activityId, now: now });
      await this.advanceRevision(tx, classroomId, room.revision);
      return { ...await this.sessionView(tx, { ...activity, first_started_at: activity.first_started_at ?? now }, room.timezone,
        false, obligation, attempt, now), ...(token ? { editor: { token, epoch: attempt.editor_epoch.toString() } } : {}) };
    });
  }

  transferAttemptEditor(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = exactActivityObject(input, ['revision']), expected = revision(body.revision);
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true);
      const context = await this.repository.resolveAttemptContext(tx, actor.id, classroomId, attemptId), attempt = context.attempt;
      if (context.room.archived_at || attempt.status !== 'DRAFT' || attempt.activity_status !== 'PUBLISHED'
        || !attempt.is_expected || !context.reception.open || attempt.revision.toString() !== expected) return fail('CONFLICT');
      const token = this.repository.editorToken();
      const [updated] = await this.repository.transferEditor(tx, { attemptId: attemptId, editorTokenHash: this.repository.digest(token), now: context.now });
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
      const students = await this.repository.eligibilityStudents(tx, { classroomId: classroomId, activityId: activity.id });
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
      const [member] = await this.repository.lockMember(tx, { classroomId: classroomId, studentId: body.studentId });
      if (!member) return fail('FORBIDDEN');
      const obligation = await this.obligation(tx, classroomId, activityId, body.studentId);
      if (!obligation || obligation.is_expected) return fail('CONFLICT');
      const prior = await this.repository.priorAttempts(tx, { obligationId: obligation.id });
      // A real instruction-only opening is still the first submission opportunity, not a resubmission.
      // Never reuse submitted history or a reopened/additional attempt through this initial-authorization path.
      if (prior.length && (activity.type !== 'ASSIGNMENT' || prior.length !== 1 || prior[0].attempt_number !== 1
        || prior[0].status !== 'DRAFT' || prior[0].submitted_at !== null)) return fail('CONFLICT');
      const deadline = resolveDeadline(room.timezone, body.deadline);
      const [{ now }] = await this.repository.authorizationClock(tx);
      if (!deadline || deadline <= now) return fail('INVALID_INPUT');
      await this.repository.authorizeObligation(tx, { obligationId: obligation.id, now: now, actorId: actor.id, deadline: deadline });
      if (prior.length) await this.repository.authorizeAttempt(tx, { attemptId: prior[0].id, deadline: deadline, now: now });
      await this.repository.activityEvent(tx, classroomId, activityId, 'FIRST_SUBMISSION_ENABLED', body.studentId);
      return this.advanceRevision(tx, classroomId, room.revision);
    });
  }

}

export interface ActivityParticipationRepository {
 randomUUID: () => string;
 editorToken(): string;
 digest: (token: string) => string;
 resolveAttemptContext: (tx: Transaction, userId: string, classroomId: string, attemptId: string) => ReturnType<typeof resolveAttemptContext>;
 activityEvent: (tx: Transaction, classroomId: string, activityId: string, event: import('./activity-events.ts').ActivityEvent, recipient?: string | null, attemptId?: string | null) => Promise<void>;
 obligation(tx: Transaction, input: { classroomId: string; activityId: string; studentId: string }): Promise<(Obligation)[]>;
 latestAttempt(tx: Transaction, input: { obligationId: string }): Promise<(AttemptRow)[]>;
 sessionClock(tx: Transaction): Promise<({ now: Date })[]>;
 existingAttempt(tx: Transaction, input: { obligationId: string }): Promise<(AttemptRow)[]>;
 startClock(tx: Transaction): Promise<({ now: Date })[]>;
 insertAttempt(tx: Transaction, input: { id: string; now: Date; obligationId: string; activityId: string; deadline: Date | null; editorTokenHash: string | null; editorEpoch: number }): Promise<(AttemptRow)[]>;
 markStarted(tx: Transaction, input: { activityId: string; now: Date }): Promise<({ id: string })[]>;
 transferEditor(tx: Transaction, input: { attemptId: string; editorTokenHash: string; now: Date }): Promise<(AttemptRow)[]>;
 eligibilityStudents(tx: Transaction, input: { classroomId: string; activityId: string }): Promise<({ studentId: string; firstName: string; lastName: string; expected: boolean;
        reason: string | null; individualDeadlineAt: Date | null })[]>;
 lockMember(tx: Transaction, input: { classroomId: string; studentId: string }): Promise<({ id: string })[]>;
 priorAttempts(tx: Transaction, input: { obligationId: string }): Promise<(AttemptRow)[]>;
 authorizationClock(tx: Transaction): Promise<({ now: Date })[]>;
 authorizeObligation(tx: Transaction, input: { obligationId: string; now: Date; actorId: string; deadline: Date }): Promise<({ id: string })[]>;
 authorizeAttempt(tx: Transaction, input: { attemptId: string; deadline: Date; now: Date }): Promise<({ id: string })[]>;
}
