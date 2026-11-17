import type { AcademicFeatureContext } from '../../../classrooms/public.ts';
import type { ActivityReadPort } from '../../../activities/public.ts';
import type { RevisionPort } from '../../../classrooms/public.ts';
import type { SessionProjection } from '../../attempts/public.ts';
import { exactActivityObject } from '../../../activities/public.ts';
import { resolveDeadline } from '../../../activities/public.ts';
import { receptionPolicy } from '../../domain/attempt-policy.ts';

import { revision } from '../../../classrooms/public.ts';
import { fail, uuid } from '../../../classrooms/public.ts';


import type { AttemptRow, Obligation } from '../../attempts/public.ts';
import type { Transaction } from '../../../classrooms/public.ts';

interface HistoryRow {
  id: string; number: number; status: 'DRAFT' | 'SUBMITTED'; openedAt: Date; submittedAt: Date | null;
  appliedDeadlineAt: Date | null; individualDeadlineAt: Date | null; submittedLate: boolean | null;
  studentId: string; firstName: string; lastName: string; currentMember: boolean; gradePublished: boolean; reviewState: 'pending' | 'saved' | 'published';
}

export class ActivityHistoryService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly ports: AcademicFeatureContext['ports'];
  private readonly activity: ActivityReadPort['activity'];
  private readonly activitySummary: ActivityReadPort['activitySummary'];
  private readonly advanceRevision: RevisionPort;
  private readonly sessionView: SessionProjection['sessionView'];
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom' | 'ports'>, dependencies: {
    activity: ActivityReadPort['activity']; activitySummary: ActivityReadPort['activitySummary'];
    advanceRevision: RevisionPort; sessionView: ActivityHistoryService['sessionView'];
  }, private readonly repository: ActivityHistoryRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
    this.activity = dependencies.activity; this.activitySummary = dependencies.activitySummary;
    this.advanceRevision = dependencies.advanceRevision; this.sessionView = dependencies.sessionView;
  }
  private async historyRows(tx: Transaction, classroomId: string, activityId: string, studentId: string | null) {
    return this.repository.history(tx, { classroomId: classroomId, activityId: activityId, studentId: studentId });
  }

  activityHistory(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      if (room.teacher_id === actor.id) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const rows = await this.historyRows(tx, classroomId, activityId, actor.id);
      const attempts = rows.map(({ reviewState: _privateReviewState, ...attempt }) => attempt);
      return { activity: { ...this.activitySummary(activity, room.timezone),
        topicIds: await this.repository.readActivityTopics(tx, activity.id, activity.topic_id) }, attempts,
        delivered: attempts.some(a => a.status === 'SUBMITTED'), pendingResubmission: attempts.some(a => a.number > 1 && a.status === 'DRAFT') };
    });
  }

  activitySubmissions(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, false, true);
      const activity = await this.activity(tx, classroomId, activityId);
      const attempts = await this.historyRows(tx, classroomId, activityId, null);
      const expectedStudents = await this.repository.expectedStudents(tx, { classroomId: classroomId, activityId: activityId });
      const received = new Set(attempts.filter(attempt => attempt.status === 'SUBMITTED').map(attempt => attempt.studentId));
      // A pending reopening is metadata only. Never reveal its private answers or files to the teacher.
      return { revision: room.revision.toString(), activity: { ...this.activitySummary(activity, room.timezone),
        topicIds: await this.repository.readActivityTopics(tx, activity.id, activity.topic_id) }, attempts,
        expectedStudentCount: expectedStudents.length, waitingStudents: expectedStudents.filter(student => !received.has(student.studentId)),
        canReopen: !room.archived_at && activity.status === 'PUBLISHED' };
    });
  }

  activityAttempt(request: unknown, classroomId: string, attemptId: string) {
    if (!uuid(attemptId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId), teacher = room.teacher_id === actor.id;
      const [row] = await this.repository.attempt(tx, { attemptId: attemptId, classroomId: classroomId });
      if (!row || (teacher ? row.status !== 'SUBMITTED' : row.student_id !== actor.id)) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, row.activity_id);
      if (!teacher && activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const [obligation] = await this.repository.obligation(tx, { obligationId: row.student_activity_id });
      const [{ now }] = await this.repository.viewClock(tx);
      const view = await this.sessionView(tx, activity, room.timezone, room.archived_at !== null, obligation, row, now);
      return { ...view, canStart: false, canTransfer: false };
    });
  }

  reopenActivity(request: unknown, classroomId: string, activityId: string, input: unknown) {
    const body = exactActivityObject(input, ['revision', 'studentId', 'deadline', 'confirm']);
    const expected = revision(body.revision);
    if (!uuid(body.studentId) || body.confirm !== true) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, true, true);
      if (room.revision.toString() !== expected) return fail('CONFLICT');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('CONFLICT');
      const [obligation] = await this.repository.lockObligation(tx, { activityId: activityId, classroomId: classroomId, studentId: body.studentId });
      if (!obligation?.is_expected) return fail('FORBIDDEN');
      const attempts = await this.repository.lockAttempts(tx, { obligationId: obligation.id });
      const previous = attempts.find(a => a.status === 'SUBMITTED');
      if (!previous || attempts.some(a => a.status === 'DRAFT')) return fail('CONFLICT');
      const deadline = resolveDeadline(room.timezone, body.deadline);
      const [{ now }] = await this.repository.reopenClock(tx);
      if (deadline && deadline <= now) return fail('INVALID_INPUT');
      if (!receptionPolicy(activity.deadline_at, null, activity.allow_late_submissions, now).open && !deadline) return fail('CONFLICT');
      const attachments = await this.repository.attachments(tx, { attemptId: previous.id });
      for (const attachment of attachments) {
        const file = await this.ports.files.loadAuthorized(tx, request, attachment.file_id, 'read');
        if (file.classroom_id !== classroomId || file.purpose !== 'attachment' || file.uploaded_by_id !== body.studentId) return fail('FORBIDDEN');
        const [origin] = await this.repository.attachmentOrigin(tx, { sourceAttemptId: file.target_id, activityId: activityId, classroomId: classroomId, studentId: body.studentId });
        if (!origin) return fail('FORBIDDEN');
        this.repository.requireReady(file);
      }
      const id = this.repository.randomUUID(), number = attempts[0].attempt_number + 1;
      await this.repository.insertReopenedAttempt(tx, { id: id, now: now, obligationId: obligation.id, activityId: activityId, attemptNumber: number, actorId: actor.id, deadline: deadline });
      await this.repository.copyPractical(tx, { attemptId: id, sourceAttemptId: previous.id });
      await this.repository.copyAnswers(tx, { attemptId: id, sourceAttemptId: previous.id, now: now });
      await this.repository.copySelections(tx, { attemptId: id, sourceAttemptId: previous.id });
      await this.repository.copyAttachments(tx, { attemptId: id, sourceAttemptId: previous.id });
      await this.repository.activityEvent(tx, classroomId, activityId, 'ATTEMPT_REOPENED', body.studentId, id);
      return { ...await this.advanceRevision(tx, classroomId, room.revision), id, number, status: 'DRAFT' as const };
    });
  }
}

export interface ActivityHistoryRepository {
 randomUUID: () => string;
 activityEvent: (tx: Transaction, classroomId: string, activityId: string, event: import('../../attempts/public.ts').ActivityEvent, recipient?: string | null, attemptId?: string | null) => Promise<void>;
 readActivityTopics: (tx: Transaction, activityId: string, fallback: string | null) => Promise<string[]>;
 requireReady: (file: import('../../../files/public.ts').FileRow) => void;
 expectedStudents(tx: Transaction, input: { classroomId: string; activityId: string }): Promise<{ studentId: string; firstName: string; lastName: string }[]>;
 history(tx: Transaction, input: { classroomId: string; activityId: string; studentId: string | null }): Promise<(HistoryRow)[]>;
 attempt(tx: Transaction, input: { attemptId: string; classroomId: string }): Promise<(AttemptRow & { student_id: string })[]>;
 obligation(tx: Transaction, input: { obligationId: string }): Promise<(Obligation)[]>;
 viewClock(tx: Transaction): Promise<({ now: Date })[]>;
 lockObligation(tx: Transaction, input: { activityId: string; classroomId: string; studentId: string }): Promise<(Obligation)[]>;
 lockAttempts(tx: Transaction, input: { obligationId: string }): Promise<(AttemptRow)[]>;
 reopenClock(tx: Transaction): Promise<({ now: Date })[]>;
 attachments(tx: Transaction, input: { attemptId: string }): Promise<({ file_id: string })[]>;
 attachmentOrigin(tx: Transaction, input: { sourceAttemptId: string | null; activityId: string; classroomId: string; studentId: string }): Promise<({ id: string })[]>;
 insertReopenedAttempt(tx: Transaction, input: { id: string; now: Date; obligationId: string; activityId: string; attemptNumber: number; actorId: string; deadline: Date | null }): Promise<({ id: string })[]>;
 copyPractical(tx: Transaction, input: { attemptId: string; sourceAttemptId: string }): Promise<({ id: string })[]>;
 copyAnswers(tx: Transaction, input: { attemptId: string; sourceAttemptId: string | null; now: Date }): Promise<({ id: string })[]>;
 copySelections(tx: Transaction, input: { attemptId: string; sourceAttemptId: string }): Promise<({ option_id: string })[]>;
 copyAttachments(tx: Transaction, input: { attemptId: string; sourceAttemptId: string }): Promise<({ file_id: string })[]>;
}
