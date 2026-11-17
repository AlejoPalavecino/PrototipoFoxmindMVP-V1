import type { AcademicFeatureContext } from '../../../classrooms/public.ts';
import type { ActivityReadPort } from '../../../activities/public.ts';
import type { GradingService } from '../../review/public.ts';
import type { RevisionPort } from '../../../classrooms/public.ts';
import { revision } from '../../../classrooms/public.ts';
import { fail, object, uuid } from '../../../classrooms/public.ts';
import { fixedHundredths, hundredths, scoreJson } from '../../domain/scoring.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import type { GradeRow } from '../../review/public.ts';
import { gradePublicationInput } from '../../../../../../../src/core/domain/grading/grading.ts';

export function publicationInput(input: unknown) {
  try { return gradePublicationInput(input); } catch { return fail('INVALID_INPUT'); }
}

export class GradePublicationService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly activity: ActivityReadPort['activity'];
  private readonly activityView: ActivityReadPort['activityView'];
  private readonly gradingContext: GradingService['gradingContext'];
  private readonly gradingView: GradingService['gradingView'];
  private readonly scoreCorrection: GradingService['scoreCorrection'];
  private readonly advanceRevision: RevisionPort;
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom'>, dependencies: Pick<ActivityReadPort, 'activity' | 'activityView'> & Pick<GradingService, 'gradingContext' | 'gradingView' | 'scoreCorrection'> & { advanceRevision: RevisionPort }, private readonly repository: GradePublicationRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context);
    this.activity = dependencies.activity; this.activityView = dependencies.activityView; this.gradingContext = dependencies.gradingContext;
    this.gradingView = dependencies.gradingView; this.scoreCorrection = dependencies.scoreCorrection; this.advanceRevision = dependencies.advanceRevision;
  }
  publishAttemptGrade(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = publicationInput(input);
    return this.run(request, true, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, true);
      const { room, grade, attempt, activity } = context;
      if (room.revision.toString() !== body.revision || !grade || grade.is_published) return fail('CONFLICT');
      const rows = await this.repository.lockQuestionGrades(tx, { gradeId: grade.id, activityId: activity.id });
      const definition = await this.activityView(tx, activity, room.timezone, true);
      if (rows.length !== definition.questions.length) return fail('CONFLICT');
      for (const question of definition.questions) {
        const row = rows.find(row => row.question_id === question.id);
        if (!row || row.numerator === null || row.denominator === null || !/^\d+$/.test(row.numerator)
          || !/^\d+$/.test(row.denominator)) return fail('CONFLICT');
        const numerator = BigInt(row.numerator), denominator = BigInt(row.denominator);
        if (denominator <= 0n || numerator * 100n > hundredths(question.points) * denominator
          || (question.type === 'DEVELOPMENT' && numerator * 100n % denominator !== 0n)) return fail('CONFLICT');
      }
      const view = await this.gradingView(tx, context);
      const questions = view.activity.questions.map(question => {
        const row = rows.find(row => row.question_id === question.id);
        // Completeness, range and manual precision were validated before the preview recomputed any score.
        const numerator = BigInt(row!.numerator!), denominator = BigInt(row!.denominator!);
        return { questionId: question.id, points: question.manual ? fixedHundredths(numerator * 100n / denominator) : null,
          feedback: question.feedback };
      });
      const correction = this.scoreCorrection(view, { revision: body.revision,
        overallGrade: activity.type === 'ASSIGNMENT' ? grade.calculated_grade == null && grade.final_grade_override == null
          ? grade.final_grade : grade.calculated_grade ?? null : null,
        overallFeedback: grade.overall_feedback, questions });
      const final = grade.final_grade_override ?? correction.finalGrade;
      if (final === null || hundredths(final) > 1000n) return fail('CONFLICT');
      // One source transaction owns grade, effective pointer, revision and event. Any failure rolls all of them back.
      const [published] = await this.repository.publishGrade(tx, { gradeId: grade.id, finalGrade: final });
      if (!published) return fail('CONFLICT');
      for (const row of correction.questions) await this.repository.updateQuestionGrade(tx, { gradeId: grade.id, questionId: row.questionId, numerator: row.score!.numerator.toString(), denominator: row.score!.denominator.toString() });
      await this.repository.setEffectiveGrade(tx, { obligationId: attempt.student_activity_id, gradeId: grade.id });
      await this.advanceRevision(tx, classroomId, room.revision);
      await this.repository.notifyPublication(tx, { studentId: attempt.student_id, classroomId: classroomId, activityId: activity.id, attemptId: attempt.id, gradeId: grade.id });
      return this.gradingView(tx, { ...context, grade: published, room: { ...room, revision: room.revision + 1n } });
    });
  }

  getAttemptResult(request: unknown, classroomId: string, attemptId: string) {
    if (!uuid(attemptId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      const [attempt] = await this.repository.resultAttempt(tx, { attemptId: attemptId, classroomId: classroomId });
      if (!attempt || (actor.id !== room.teacher_id && actor.id !== attempt.student_id)) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, attempt.activity_id);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const [grade] = await this.repository.publishedGrade(tx, { attemptId: attempt.id, obligationId: attempt.student_activity_id, activityId: activity.id });
      if (!grade) return { status: 'pending' as const, attemptId: attempt.id };
      const questions = await this.repository.resultQuestions(tx, { gradeId: grade.id, attemptId: attempt.id, activityId: activity.id });
      return { status: 'published' as const, activity: { id: activity.id, title: activity.title, type: activity.type },
        attempt: { id: attempt.id, number: attempt.attempt_number, submittedAt: attempt.submitted_at },
        grade: { id: grade.id, finalGrade: fixedHundredths(hundredths(grade.final_grade)), publishedAt: grade.published_at,
          rubricSnapshot: grade.rubric_snapshot ?? null, rubricMarks: grade.rubric_marks ?? [],
          suggestedGrade: grade.suggested_grade == null ? null : fixedHundredths(hundredths(grade.suggested_grade)),
          finalGradeOverride: grade.final_grade_override == null ? null : fixedHundredths(hundredths(grade.final_grade_override)),
          calculatedGrade: grade.calculated_grade == null ? null : fixedHundredths(hundredths(grade.calculated_grade)),
          overallFeedback: grade.overall_feedback, isEffective: attempt.effective_grade_id === grade.id },
        questions: questions.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, points: q.points,
          answer: { text: q.text, selectedOptions: q.selectedOptions },
          earned: scoreJson({ numerator: BigInt(q.numerator), denominator: BigInt(q.denominator) }), feedback: q.feedback })),
        attachments: await this.resultAttachments(tx, attempt.id) };
    });
  }

  private resultAttachments(tx: Transaction, attemptId: string) {
    return this.repository.resultAttachments(tx, { attemptId: attemptId });
  }
}

export interface GradePublicationRepository {
  lockQuestionGrades(tx: Transaction, input: { gradeId: string; activityId: string }): Promise<{ question_id: string; numerator: string | null; denominator: string | null }[]>;
  publishGrade(tx: Transaction, input: { gradeId: string; finalGrade: string }): Promise<GradeRow[]>;
  updateQuestionGrade(tx: Transaction, input: { gradeId: string; questionId: string; numerator: string; denominator: string }): Promise<{ id: string }[]>;
  setEffectiveGrade(tx: Transaction, input: { obligationId: string; gradeId: string }): Promise<{ id: string }[]>;
  notifyPublication(tx: Transaction, input: { studentId: string; classroomId: string; activityId: string; attemptId: string; gradeId: string }): Promise<{ id: string }[]>;
  resultAttempt(tx: Transaction, input: { attemptId: string; classroomId: string }): Promise<{ id: string; activity_id: string; student_activity_id: string; student_id: string;
        attempt_number: number; submitted_at: Date; effective_grade_id: string | null }[]>;
  publishedGrade(tx: Transaction, input: { attemptId: string; obligationId: string; activityId: string }): Promise<(GradeRow & { final_grade: string; published_at: Date })[]>;
  resultQuestions(tx: Transaction, input: { gradeId: string; attemptId: string; activityId: string }): Promise<{ id: string; type: string; prompt: string; points: string; text: string | null;
        selectedOptions: { id: string; text: string }[]; numerator: string; denominator: string; feedback: string | null }[]>;
  resultAttachments(tx: Transaction, input: { attemptId: string }): Promise<{ id: string; name: string; ready: boolean }[]>;
}
