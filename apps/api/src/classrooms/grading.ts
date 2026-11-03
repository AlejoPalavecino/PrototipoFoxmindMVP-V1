import { randomUUID } from 'node:crypto';
import type { ClassroomCore } from './core.ts';
import type { ActivityAuthoringService } from './activity-authoring.ts';
import type { ClassroomFileOperations } from './classroom-file.ts';
import { isVerifiedRead } from './context.ts';
import { privateGradingInput, type PrivateGradingInput } from './grading-policy.ts';
import { fail, uuid } from './policy.ts';
import { finalGrade, fixedHundredths, hundredths, questionScore, scoreJson } from './scoring.ts';
import type { Actor, Transaction } from './contracts.ts';
import type { AttemptRow } from './attempt-access.ts';

export interface GradeRow {
  id: string; final_grade: string | null; overall_feedback: string | null;
  is_published: boolean; published_at: Date | null;
}
interface QuestionGradeRow {
  question_id: string; numerator: string | null; denominator: string | null; feedback: string | null;
}

/** Private teacher grading shares the existing classroom lock and revision CAS. */
export class GradingService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly activity: ActivityAuthoringService['activity'];
  private readonly activityView: ActivityAuthoringService['activityView'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom'>, dependencies: Pick<ActivityAuthoringService, 'activity' | 'activityView'> & Pick<ClassroomFileOperations, 'advanceRevision'>) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context);
    this.activity = dependencies.activity; this.activityView = dependencies.activityView; this.advanceRevision = dependencies.advanceRevision;
  }
  async gradingContext(tx: Transaction, actor: Actor, classroomId: string, attemptId: string, write: boolean) {
    if (!uuid(attemptId)) return fail('FORBIDDEN');
    const room = await this.classroom(tx, actor, classroomId, write, true);
    const [attempt] = await tx.query<AttemptRow & { student_id: string; first_name: string; last_name: string }>(`SELECT a.*,e.student_id,u.first_name,u.last_name
      FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
      JOIN enrollments e ON e.id=sa.enrollment_id JOIN users u ON u.id=e.student_id
      WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid AND e.classroom_id=$2::uuid AND sa.activity_id=a.activity_id
      FOR ${isVerifiedRead(tx) && !write ? 'SHARE' : 'UPDATE'} OF a,sa,e`, attemptId, classroomId);
    // A current teacher retains historical academic records after a student leaves.
    if (!attempt || attempt.status !== 'SUBMITTED') return fail('FORBIDDEN');
    const activity = await this.activity(tx, classroomId, attempt.activity_id);
    const [grade] = await tx.query<GradeRow>(`SELECT id,final_grade::text,overall_feedback,is_published,published_at
      FROM attempt_grades WHERE attempt_id=$1::uuid AND student_activity_id=$2::uuid AND activity_id=$3::uuid FOR ${isVerifiedRead(tx) && !write ? 'SHARE' : 'UPDATE'}`,
    attemptId, attempt.student_activity_id, activity.id);
    return { room, attempt, activity, grade };
  }

  async gradingView(tx: Transaction, context: Awaited<ReturnType<GradingService['gradingContext']>>) {
    const { room, activity, attempt, grade } = context;
    const view = await this.activityView(tx, activity, room.timezone, true);
    const answers = await tx.query<{ questionId: string; text: string | null; optionIds: string[] }>(`SELECT a.question_id AS "questionId",a.development_text AS text,
      COALESCE(array_agg(s.option_id ORDER BY s.option_id) FILTER(WHERE s.option_id IS NOT NULL),ARRAY[]::uuid[]) AS "optionIds"
      FROM answers a LEFT JOIN answer_selections s ON s.answer_id=a.id WHERE a.attempt_id=$1::uuid GROUP BY a.id ORDER BY a.question_id`, attempt.id);
    const saved = grade ? await tx.query<QuestionGradeRow>(`SELECT question_id,earned_numerator::text AS numerator,
      earned_denominator::text AS denominator,feedback FROM question_grades WHERE attempt_grade_id=$1::uuid`, grade.id) : [];
    const questions = view.questions.map(question => {
      const answer = answers.find(row => row.questionId === question.id), row = saved.find(row => row.question_id === question.id);
      const manual = question.type === 'DEVELOPMENT' && !!answer?.text?.trim();
      const points = manual && row?.numerator !== null && row?.numerator !== undefined && row.denominator !== null
        ? fixedHundredths(BigInt(row.numerator) * 100n / BigInt(row.denominator)) : null;
      const earned = questionScore({ ...question, options: question.options.map(option => ({ id: option.id, correct: !!option.correct })) }, answer, points);
      return { ...question, answer: answer ?? { questionId: question.id, text: null, optionIds: [] }, manual,
        manualPoints: points, earned: scoreJson(earned), feedback: row?.feedback ?? null };
    });
    const final = grade?.is_published || activity.type === 'ASSIGNMENT'
      ? grade?.final_grade === null || grade?.final_grade === undefined ? null : fixedHundredths(hundredths(grade.final_grade))
      : finalGrade(questions.map(question => question.earned === null ? null
        : { numerator: BigInt(question.earned.numerator), denominator: BigInt(question.earned.denominator) }), questions.map(question => question.points));
    const attachments = await tx.query<{ id: string; name: string; ready: boolean }>(`SELECT f.id,f.original_name AS name,
      (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED'
       AND f.scan_status='CLEAN' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready
      FROM attempt_attachments a JOIN files f ON f.id=a.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
      WHERE a.attempt_id=$1::uuid ORDER BY a.position,f.id`, attempt.id);
    return { revision: room.revision.toString(), archived: !!room.archived_at, canSave: !room.archived_at && !grade?.is_published,
      activity: { ...view, questions }, attempt: { id: attempt.id, number: attempt.attempt_number, submittedAt: attempt.submitted_at,
        submittedLate: attempt.submitted_late, firstName: attempt.first_name, lastName: attempt.last_name, attachments },
      grade: { id: grade?.id ?? null, isPublished: grade?.is_published ?? false, publishedAt: grade?.published_at ?? null,
        finalGrade: final, overallFeedback: grade?.overall_feedback ?? null, pending: final === null } };
  }

  getAttemptGrading(request: unknown, classroomId: string, attemptId: string) {
    return this.run(request, false, async (tx, actor) => this.gradingView(tx, await this.gradingContext(tx, actor, classroomId, attemptId, false)));
  }

  saveAttemptGrading(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = privateGradingInput(input);
    return this.run(request, true, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, true);
      return this.savePrivateGrading(tx, actor, classroomId, context, body);
    });
  }

  async savePrivateGrading(tx: Transaction, actor: Actor, classroomId: string,
    context: Awaited<ReturnType<GradingService['gradingContext']>>, body: PrivateGradingInput) {
    const { room, attempt, activity } = context;
      if (room.revision.toString() !== body.revision || context.grade?.is_published) return fail('CONFLICT');
      const view = await this.gradingView(tx, context);
      const scored = this.scoreCorrection(view, body);
      const [grade] = await tx.query<GradeRow>(`INSERT INTO attempt_grades(id,updated_at,attempt_id,student_activity_id,activity_id,
        final_grade,overall_feedback,graded_by_id) VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5::numeric,$6,$7::uuid)
        ON CONFLICT(attempt_id) DO UPDATE SET updated_at=clock_timestamp(),final_grade=EXCLUDED.final_grade,
          overall_feedback=EXCLUDED.overall_feedback,graded_by_id=EXCLUDED.graded_by_id WHERE NOT attempt_grades.is_published
        RETURNING id,final_grade::text,overall_feedback,is_published,published_at`, randomUUID(), attempt.id,
      attempt.student_activity_id, activity.id, scored.finalGrade, body.overallFeedback, actor.id);
      if (!grade) return fail('CONFLICT');
      for (const row of scored.questions) await tx.query(`INSERT INTO question_grades(id,updated_at,attempt_grade_id,activity_id,
        question_id,earned_numerator,earned_denominator,feedback) VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5::numeric,$6::numeric,$7)
        ON CONFLICT(attempt_grade_id,question_id) DO UPDATE SET updated_at=clock_timestamp(),earned_numerator=EXCLUDED.earned_numerator,
          earned_denominator=EXCLUDED.earned_denominator,feedback=EXCLUDED.feedback RETURNING id`, randomUUID(), grade.id,
      activity.id, row.questionId, row.score?.numerator.toString() ?? null, row.score?.denominator.toString() ?? null, row.feedback);
      await this.advanceRevision(tx, classroomId, room.revision);
      return this.gradingView(tx, { ...context, grade, room: { ...room, revision: room.revision + 1n } });
  }

  scoreCorrection(view: Awaited<ReturnType<GradingService['gradingView']>>, body: PrivateGradingInput) {
    if (view.activity.type === 'ASSIGNMENT') {
      if (body.questions.length) return fail('INVALID_INPUT');
      return { finalGrade: body.overallGrade === null ? null : fixedHundredths(hundredths(body.overallGrade)), questions: [] };
    }
    if (body.overallGrade !== null || body.questions.length !== view.activity.questions.length) return fail('INVALID_INPUT');
    const questions = view.activity.questions.map(question => {
      const row = body.questions.find(row => row.questionId === question.id);
      if (!row || (!question.manual && row.points !== null)) return fail('INVALID_INPUT');
      return { questionId: question.id, feedback: row.feedback,
        score: questionScore({ ...question, options: question.options.map(option => ({ id: option.id, correct: !!option.correct })) }, question.answer, row.points) };
    });
    return { finalGrade: finalGrade(questions.map(row => row.score), view.activity.questions.map(question => question.points)), questions };
  }
}
