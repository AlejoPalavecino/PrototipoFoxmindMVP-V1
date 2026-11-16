import type { AcademicFeatureContext } from '../../classrooms/public.ts';
import type { ActivityReadPort } from '../../activities/public.ts';
import type { ClassroomFileOperations } from '../../materials/public.ts';
import type { SessionProjection } from './activity-session.ts';
import { exactActivityObject } from '../../activities/public.ts';
import { resolveDeadline } from '../../activities/public.ts';
import { receptionPolicy } from '../domain/attempt-policy.ts';

import { revision } from '../../classrooms/public.ts';
import { fail, uuid } from '../../classrooms/public.ts';


import type { AttemptRow, Obligation } from './attempt-access.ts';
import type { Transaction } from '../../classrooms/public.ts';

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
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  private readonly sessionView: SessionProjection['sessionView'];
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom' | 'ports'>, dependencies: {
    activity: ActivityReadPort['activity']; activitySummary: ActivityReadPort['activitySummary'];
    advanceRevision: ClassroomFileOperations['advanceRevision']; sessionView: ActivityHistoryService['sessionView'];
  }, private readonly repository: ActivityHistoryRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
    this.activity = dependencies.activity; this.activitySummary = dependencies.activitySummary;
    this.advanceRevision = dependencies.advanceRevision; this.sessionView = dependencies.sessionView;
  }
  private async historyRows(tx: Transaction, classroomId: string, activityId: string, studentId: string | null) {
    return this.repository.history(tx, classroomId, activityId, studentId);
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
      const expectedStudents = await this.repository.expectedStudents(tx, classroomId, activityId);
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
      const [row] = await this.repository.attempt(tx, attemptId, classroomId);
      if (!row || (teacher ? row.status !== 'SUBMITTED' : row.student_id !== actor.id)) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, row.activity_id);
      if (!teacher && activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const [obligation] = await this.repository.obligation(tx, row.student_activity_id);
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
      const [obligation] = await this.repository.lockObligation(tx, activityId, classroomId, body.studentId);
      if (!obligation?.is_expected) return fail('FORBIDDEN');
      const attempts = await this.repository.lockAttempts(tx, obligation.id);
      const previous = attempts.find(a => a.status === 'SUBMITTED');
      if (!previous || attempts.some(a => a.status === 'DRAFT')) return fail('CONFLICT');
      const deadline = resolveDeadline(room.timezone, body.deadline);
      const [{ now }] = await this.repository.reopenClock(tx);
      if (deadline && deadline <= now) return fail('INVALID_INPUT');
      if (!receptionPolicy(activity.deadline_at, null, activity.allow_late_submissions, now).open && !deadline) return fail('CONFLICT');
      const attachments = await this.repository.attachments(tx, previous.id);
      for (const attachment of attachments) {
        const file = await this.ports.files.loadAuthorized(tx, request, attachment.file_id, 'read');
        if (file.classroom_id !== classroomId || file.purpose !== 'attachment' || file.uploaded_by_id !== body.studentId) return fail('FORBIDDEN');
        const [origin] = await this.repository.attachmentOrigin(tx, file.target_id, activityId, classroomId, body.studentId);
        if (!origin) return fail('FORBIDDEN');
        this.repository.requireReady(file);
      }
      const id = this.repository.randomUUID(), number = attempts[0].attempt_number + 1;
      await this.repository.insertReopenedAttempt(tx, id, now, obligation.id, activityId, number, actor.id, deadline);
      await this.repository.copyPractical(tx, id, previous.id);
      await this.repository.copyAnswers(tx, id, previous.id, now);
      await this.repository.copySelections(tx, id, previous.id);
      await this.repository.copyAttachments(tx, id, previous.id);
      await this.repository.activityEvent(tx, classroomId, activityId, 'ATTEMPT_REOPENED', body.studentId, id);
      return { ...await this.advanceRevision(tx, classroomId, room.revision), id, number, status: 'DRAFT' as const };
    });
  }
}

export interface ActivityHistoryRepository {
 randomUUID: () => string;
 activityEvent: (tx: Transaction, classroomId: string, activityId: string, event: import('./activity-events.ts').ActivityEvent, recipient?: string | null, attemptId?: string | null) => Promise<void>;
 readActivityTopics: (tx: Transaction, activityId: string, fallback: string | null) => Promise<string[]>;
 requireReady: (file: import('../../files/public.ts').FileRow) => void;
 expectedStudents(tx: Transaction, ...values: unknown[]): Promise<{ studentId: string; firstName: string; lastName: string }[]>;
 history(tx: Transaction, ...values: unknown[]): Promise<(HistoryRow)[]>;
 attempt(tx: Transaction, ...values: unknown[]): Promise<(AttemptRow & { student_id: string })[]>;
 obligation(tx: Transaction, ...values: unknown[]): Promise<(Obligation)[]>;
 viewClock(tx: Transaction, ...values: unknown[]): Promise<({ now: Date })[]>;
 lockObligation(tx: Transaction, ...values: unknown[]): Promise<(Obligation)[]>;
 lockAttempts(tx: Transaction, ...values: unknown[]): Promise<(AttemptRow)[]>;
 reopenClock(tx: Transaction, ...values: unknown[]): Promise<({ now: Date })[]>;
 attachments(tx: Transaction, ...values: unknown[]): Promise<({ file_id: string })[]>;
 attachmentOrigin(tx: Transaction, ...values: unknown[]): Promise<(Record<string, unknown>)[]>;
 insertReopenedAttempt(tx: Transaction, ...values: unknown[]): Promise<(Record<string, unknown>)[]>;
 copyPractical(tx: Transaction, ...values: unknown[]): Promise<(Record<string, unknown>)[]>;
 copyAnswers(tx: Transaction, ...values: unknown[]): Promise<(Record<string, unknown>)[]>;
 copySelections(tx: Transaction, ...values: unknown[]): Promise<(Record<string, unknown>)[]>;
 copyAttachments(tx: Transaction, ...values: unknown[]): Promise<(Record<string, unknown>)[]>;
}
