import { randomUUID } from 'node:crypto';
import type { ClassroomCore } from './core.ts';
import type { ActivityAuthoringService } from './activity-authoring.ts';
import type { ClassroomFileOperations } from './classroom-file.ts';
import type { sessionView } from './activity-session.ts';
import { exactActivityObject } from './activity-policy.ts';
import { resolveDeadline } from './activity-time.ts';
import { receptionPolicy } from './attempt-policy.ts';
import { readActivityTopics } from './activity-topics.ts';
import { revision } from './revision.ts';
import { fail, uuid } from './policy.ts';
import { requireReady } from '../files/service.ts';
import { activityEvent } from './activity-events.ts';
import type { AttemptRow, Obligation } from './attempt-access.ts';
import type { Transaction } from './contracts.ts';

interface HistoryRow {
  id: string; number: number; status: 'DRAFT' | 'SUBMITTED'; openedAt: Date; submittedAt: Date | null;
  appliedDeadlineAt: Date | null; individualDeadlineAt: Date | null; submittedLate: boolean | null;
  studentId: string; firstName: string; lastName: string; currentMember: boolean; gradePublished: boolean;
}

export class ActivityHistoryService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly ports: ClassroomCore['ports'];
  private readonly activity: ActivityAuthoringService['activity'];
  private readonly activitySummary: ActivityAuthoringService['activitySummary'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  private readonly sessionView: (...args: Parameters<typeof sessionView> extends [unknown, ...infer Rest] ? Rest : never) => ReturnType<typeof sessionView>;
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>, dependencies: {
    activity: ActivityAuthoringService['activity']; activitySummary: ActivityAuthoringService['activitySummary'];
    advanceRevision: ClassroomFileOperations['advanceRevision']; sessionView: ActivityHistoryService['sessionView'];
  }) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
    this.activity = dependencies.activity; this.activitySummary = dependencies.activitySummary;
    this.advanceRevision = dependencies.advanceRevision; this.sessionView = dependencies.sessionView;
  }
  private async historyRows(tx: Transaction, classroomId: string, activityId: string, studentId: string | null) {
    return tx.query<HistoryRow>(`SELECT a.id,a.attempt_number AS number,a.status::text,a.opened_at AS "openedAt",
      a.submitted_at AS "submittedAt",a.applied_deadline_at AS "appliedDeadlineAt",a.individual_deadline_at AS "individualDeadlineAt",
      a.submitted_late AS "submittedLate",COALESCE(g.is_published,false) AS "gradePublished",e.student_id AS "studentId",u.first_name AS "firstName",u.last_name AS "lastName",
      EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) AS "currentMember"
      FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id JOIN enrollments e ON e.id=sa.enrollment_id
      JOIN users u ON u.id=e.student_id LEFT JOIN attempt_grades g ON g.attempt_id=a.id WHERE sa.classroom_id=$1::uuid AND a.activity_id=$2::uuid
      AND ($3::uuid IS NULL OR e.student_id=$3::uuid) ORDER BY a.attempt_number DESC,a.opened_at DESC,a.id`,
    classroomId, activityId, studentId);
  }

  activityHistory(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      if (room.teacher_id === actor.id) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, activityId);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const attempts = await this.historyRows(tx, classroomId, activityId, actor.id);
      return { activity: { ...this.activitySummary(activity, room.timezone),
        topicIds: await readActivityTopics(tx, activity.id, activity.topic_id) }, attempts,
        delivered: attempts.some(a => a.status === 'SUBMITTED'), pendingResubmission: attempts.some(a => a.number > 1 && a.status === 'DRAFT') };
    });
  }

  activitySubmissions(request: unknown, classroomId: string, activityId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, false, true);
      const activity = await this.activity(tx, classroomId, activityId);
      const attempts = await this.historyRows(tx, classroomId, activityId, null);
      // A pending reopening is metadata only. Never reveal its private answers or files to the teacher.
      return { revision: room.revision.toString(), activity: { ...this.activitySummary(activity, room.timezone),
        topicIds: await readActivityTopics(tx, activity.id, activity.topic_id) }, attempts,
        canReopen: !room.archived_at && activity.status === 'PUBLISHED' };
    });
  }

  activityAttempt(request: unknown, classroomId: string, attemptId: string) {
    if (!uuid(attemptId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId), teacher = room.teacher_id === actor.id;
      const [row] = await tx.query<AttemptRow & { student_id: string }>(`SELECT a.*,e.student_id FROM attempts a
        JOIN student_activities sa ON sa.id=a.student_activity_id JOIN enrollments e ON e.id=sa.enrollment_id
        WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid FOR SHARE OF a,sa,e`, attemptId, classroomId);
      if (!row || (teacher ? row.status !== 'SUBMITTED' : row.student_id !== actor.id)) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, row.activity_id);
      if (!teacher && activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const [obligation] = await tx.query<Obligation>('SELECT * FROM student_activities WHERE id=$1::uuid', row.student_activity_id);
      const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
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
      const [obligation] = await tx.query<Obligation>(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
        WHERE sa.activity_id=$1::uuid AND sa.classroom_id=$2::uuid AND e.student_id=$3::uuid
          AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) FOR UPDATE OF e,sa`,
      activityId, classroomId, body.studentId);
      if (!obligation?.is_expected) return fail('FORBIDDEN');
      const attempts = await tx.query<AttemptRow>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC FOR UPDATE`, obligation.id);
      const previous = attempts.find(a => a.status === 'SUBMITTED');
      if (!previous || attempts.some(a => a.status === 'DRAFT')) return fail('CONFLICT');
      const deadline = resolveDeadline(room.timezone, body.deadline);
      const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      if (deadline && deadline <= now) return fail('INVALID_INPUT');
      if (!receptionPolicy(activity.deadline_at, null, activity.allow_late_submissions, now).open && !deadline) return fail('CONFLICT');
      const attachments = await tx.query<{ file_id: string }>(`SELECT file_id FROM attempt_attachments
        WHERE attempt_id=$1::uuid ORDER BY position,file_id FOR SHARE`, previous.id);
      for (const attachment of attachments) {
        const file = await this.ports.files.loadAuthorized(tx, request, attachment.file_id, 'read');
        if (file.classroom_id !== classroomId || file.purpose !== 'attachment' || file.uploaded_by_id !== body.studentId) return fail('FORBIDDEN');
        const [origin] = await tx.query(`SELECT a.id FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
          JOIN enrollments e ON e.id=sa.enrollment_id WHERE a.id=$1::uuid AND a.activity_id=$2::uuid
          AND sa.classroom_id=$3::uuid AND e.student_id=$4::uuid AND a.status='SUBMITTED' FOR SHARE OF a,sa,e`,
        file.target_id, activityId, classroomId, body.studentId);
        if (!origin) return fail('FORBIDDEN');
        requireReady(file);
      }
      const id = randomUUID(), number = attempts[0].attempt_number + 1;
      await tx.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,opened_at,enabled_by_id,individual_deadline_at)
        VALUES($1::uuid,$2,$3::uuid,$4::uuid,$5,$2,$6::uuid,$7) RETURNING id`, id, now, obligation.id, activityId, number, actor.id, deadline);
      await tx.query('UPDATE attempts SET practical_response=(SELECT practical_response FROM attempts WHERE id=$2::uuid) WHERE id=$1::uuid RETURNING id',id,previous.id);
      await tx.query(`INSERT INTO answers(id,updated_at,attempt_id,activity_id,question_id,development_text,saved_at)
        SELECT gen_random_uuid(),$3,$1::uuid,activity_id,question_id,development_text,$3 FROM answers WHERE attempt_id=$2::uuid RETURNING id`, id, previous.id, now);
      await tx.query(`INSERT INTO answer_selections(answer_id,question_id,option_id)
        SELECT fresh.id,s.question_id,s.option_id FROM answers old JOIN answer_selections s ON s.answer_id=old.id
        JOIN answers fresh ON fresh.question_id=old.question_id AND fresh.attempt_id=$1::uuid WHERE old.attempt_id=$2::uuid RETURNING answer_id`, id, previous.id);
      await tx.query(`INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position)
        SELECT $1::uuid,activity_id,classroom_id,file_id,position FROM attempt_attachments WHERE attempt_id=$2::uuid RETURNING file_id`, id, previous.id);
      await activityEvent(tx, classroomId, activityId, 'ATTEMPT_REOPENED', body.studentId, id);
      return { ...await this.advanceRevision(tx, classroomId, room.revision), id, number, status: 'DRAFT' as const };
    });
  }
}
