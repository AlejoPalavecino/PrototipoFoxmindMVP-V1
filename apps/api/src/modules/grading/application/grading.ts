import { rubricSuggestion, type RubricMark } from '../../../../../../src/core/domain/grading/rubric-marks.ts';
import type { EvaluationRubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';
import type { AcademicFeatureContext } from '../../classrooms/public.ts';
import type { ActivityReadPort } from '../../activities/public.ts';
import type { ClassroomFileOperations } from '../../materials/public.ts';
import { privateGradingInput, type PrivateGradingInput } from '../domain/grading-policy.ts';
import { fail, uuid } from '../../classrooms/public.ts';
import { finalGrade, fixedHundredths, hundredths, questionScore, scoreJson } from '../domain/scoring.ts';
import type { Actor, Transaction } from '../../classrooms/public.ts';
import type { AttemptRow } from '../../participation/public.ts';

export interface GradeRow {
  rubric_snapshot?: EvaluationRubric | null; rubric_marks?: RubricMark[]; suggested_grade?: string | null; final_grade_override?: string | null; calculated_grade?: string | null;
  id: string; final_grade: string | null; overall_feedback: string | null;
  is_published: boolean; published_at: Date | null;
}
interface QuestionGradeRow {
  question_id: string; numerator: string | null; denominator: string | null; feedback: string | null;
}

/** Private teacher grading shares the existing classroom lock and revision CAS. */
export class GradingService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly activity: ActivityReadPort['activity'];
  private readonly activityView: ActivityReadPort['activityView'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom'>, dependencies: Pick<ActivityReadPort, 'activity' | 'activityView'> & Pick<ClassroomFileOperations, 'advanceRevision'>, private readonly repository: GradingRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context);
    this.activity = dependencies.activity; this.activityView = dependencies.activityView; this.advanceRevision = dependencies.advanceRevision;
  }
  async gradingContext(tx: Transaction, actor: Actor, classroomId: string, attemptId: string, write: boolean) {
    if (!uuid(attemptId)) return fail('FORBIDDEN');
    const room = await this.classroom(tx, actor, classroomId, write, true);
    const [attempt] = await this.repository.lockAttempt(tx, write, attemptId, classroomId);
    // A current teacher retains historical academic records after a student leaves.
    if (!attempt || attempt.status !== 'SUBMITTED') return fail('FORBIDDEN');
    const activity = await this.activity(tx, classroomId, attempt.activity_id);
    const [grade] = await this.repository.lockGrade(tx, write, attemptId, attempt.student_activity_id, activity.id);
    return { room, attempt, activity, grade };
  }

  async gradingView(tx: Transaction, context: Awaited<ReturnType<GradingService['gradingContext']>>) {
    const { room, activity, attempt, grade } = context;
    const view = await this.activityView(tx, activity, room.timezone, true);
    const answers = await this.repository.answers(tx, attempt.id);
    const saved = grade ? await this.repository.savedQuestionGrades(tx, grade.id) : [];
    const questions = view.questions.map(question => {
      const answer = answers.find(row => row.questionId === question.id), row = saved.find(row => row.question_id === question.id);
      const manual = question.type === 'DEVELOPMENT' && !!answer?.text?.trim();
      const points = manual && row?.numerator !== null && row?.numerator !== undefined && row.denominator !== null
        ? fixedHundredths(BigInt(row.numerator) * 100n / BigInt(row.denominator)) : null;
      const earned = questionScore({ ...question, options: question.options.map(option => ({ id: option.id, correct: !!option.correct })) }, answer, points);
      return { ...question, answer: answer ?? { questionId: question.id, text: null, optionIds: [] }, manual,
        manualPoints: points, earned: scoreJson(earned), feedback: row?.feedback ?? null };
    });
    // Legacy rows had only final_grade; an explicit override must never become their base.
    const storedCalculated = grade?.calculated_grade == null && grade?.final_grade_override == null
      ? grade?.final_grade : grade?.calculated_grade;
    const calculated = grade?.is_published || activity.type === 'ASSIGNMENT'
      ? storedCalculated == null ? null : fixedHundredths(hundredths(storedCalculated))
      : finalGrade(questions.map(question => question.earned === null ? null
        : { numerator: BigInt(question.earned.numerator), denominator: BigInt(question.earned.denominator) }), questions.map(question => question.points));
    const override = grade?.final_grade_override == null ? null : fixedHundredths(hundredths(grade.final_grade_override));
    const final = grade?.is_published ? fixedHundredths(hundredths(grade.final_grade!)) : override ?? calculated;
    const attachments = await this.repository.attachments(tx, attempt.id);
    return { revision: room.revision.toString(), archived: !!room.archived_at, canSave: !room.archived_at && !grade?.is_published,
      activity: { ...view, questions }, attempt: { id: attempt.id, number: attempt.attempt_number, submittedAt: attempt.submitted_at,
        submittedLate: attempt.submitted_late, firstName: attempt.first_name, lastName: attempt.last_name, attachments,...(activity.type==='ASSIGNMENT'?{practicalResponse:attempt.practical_response}:{}) },
      grade: { id: grade?.id ?? null, isPublished: grade?.is_published ?? false, publishedAt: grade?.published_at ?? null,
        rubricSnapshot: grade?.rubric_snapshot ?? null, rubricMarks: grade?.rubric_marks ?? [],
        suggestedGrade: grade?.suggested_grade == null ? null : fixedHundredths(hundredths(grade.suggested_grade)), finalGradeOverride: override, calculatedGrade: calculated,
        finalGrade: final, overallFeedback: grade?.overall_feedback ?? null,
        pending: final === null || (activity.type !== 'ASSIGNMENT' && questions.some(question => question.earned === null)) } };
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
      const snapshot = context.grade?.rubric_snapshot ?? (body.rubricMarks === undefined ? null : activity.evaluation_rubric ?? []);
      const marks = body.rubricMarks ?? context.grade?.rubric_marks ?? [];
      let suggested: string | null;
      try { suggested = snapshot === null ? null : rubricSuggestion(snapshot, marks); } catch { return fail('INVALID_INPUT'); }
      const override = Object.hasOwn(body, 'finalGradeOverride') ? body.finalGradeOverride ?? null : context.grade?.final_grade_override ?? null;
      const final = override ?? scored.finalGrade;
      const [grade] = await this.repository.savePrivateGrade(tx, this.repository.newId(), attempt.id, attempt.student_activity_id, activity.id, final, body.overallFeedback, actor.id, snapshot === null ? null : JSON.stringify(snapshot), JSON.stringify(marks), suggested, override, scored.finalGrade);
      if (!grade) return fail('CONFLICT');
      for (const row of scored.questions) await this.repository.saveQuestionGrade(tx, this.repository.newId(), grade.id, activity.id, row.questionId, row.score?.numerator.toString() ?? null, row.score?.denominator.toString() ?? null, row.feedback);
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

export interface GradingRepository {
  newId(): string;
  lockAttempt(tx: Transaction, write: boolean, ...values: unknown[]): Promise<(AttemptRow & { student_id: string; first_name: string; last_name: string })[]>;
  lockGrade(tx: Transaction, write: boolean, ...values: unknown[]): Promise<GradeRow[]>;
  answers(tx: Transaction, ...values: unknown[]): Promise<{ questionId: string; text: string | null; optionIds: string[] }[]>;
  savedQuestionGrades(tx: Transaction, ...values: unknown[]): Promise<QuestionGradeRow[]>;
  attachments(tx: Transaction, ...values: unknown[]): Promise<{ id: string; name: string; ready: boolean }[]>;
  savePrivateGrade(tx: Transaction, ...values: unknown[]): Promise<GradeRow[]>;
  saveQuestionGrade(tx: Transaction, ...values: unknown[]): Promise<Record<string, unknown>[]>;
}
