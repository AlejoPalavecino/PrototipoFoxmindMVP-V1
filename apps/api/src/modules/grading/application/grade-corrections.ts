import type { AcademicFeatureContext } from '../../classrooms/public.ts';
import type { GradeRow, GradingService } from './grading.ts';
import type { ClassroomFileOperations } from '../../materials/public.ts';
import { revision } from '../../classrooms/public.ts';
import { fail, object } from '../../classrooms/public.ts';
import { fixedHundredths, hundredths } from '../domain/scoring.ts';
import type { Transaction } from '../../classrooms/public.ts';
import { gradeCorrectionInput as parseCorrection } from '../../../../../../src/core/domain/index.ts';

export function gradeCorrectionInput(input: unknown) {
  try { return parseCorrection(input); } catch { return fail('INVALID_INPUT'); }
}

/** A correction changes only the same published final grade, never its effective identity or scoring evidence. */
export class GradeCorrectionService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly gradingContext: GradingService['gradingContext'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  constructor(context: Pick<AcademicFeatureContext, 'run'>, dependencies: Pick<GradingService, 'gradingContext'> & Pick<ClassroomFileOperations, 'advanceRevision'>, private readonly repository: GradeCorrectionsRepository) {
    this.run = context.run.bind(context); this.gradingContext = dependencies.gradingContext; this.advanceRevision = dependencies.advanceRevision;
  }
  private async correctionView(tx: Transaction, context: Awaited<ReturnType<GradeCorrectionService['gradingContext']>>) {
    const { room, grade } = context;
    if (!grade?.is_published || grade.final_grade === null || !grade.published_at) return fail('CONFLICT');
    const corrections = await this.repository.corrections(tx, grade.id);
    return { revision: room.revision.toString(), archived: !!room.archived_at, canCorrect: !room.archived_at,
      grade: { id: grade.id, finalGrade: fixedHundredths(hundredths(grade.final_grade)), publishedAt: grade.published_at },
      corrections: corrections.map(row => ({ ...row, previousGrade: fixedHundredths(hundredths(row.previousGrade)),
        newGrade: fixedHundredths(hundredths(row.newGrade)) })) };
  }

  getGradeCorrections(request: unknown, classroomId: string, attemptId: string) {
    return this.run(request, false, async (tx, actor) =>
      this.correctionView(tx, await this.gradingContext(tx, actor, classroomId, attemptId, false)));
  }

  correctPublishedGrade(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = gradeCorrectionInput(input);
    return this.run(request, true, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, true);
      const { room, grade, attempt, activity } = context;
      if (room.revision.toString() !== body.revision || !grade?.is_published || grade.final_grade === null
        || !grade.published_at) return fail('CONFLICT');
      await this.repository.insertCorrection(tx, grade.id, grade.final_grade, body.newGrade, body.reason, actor.id);
      const [updated] = await this.repository.updatePublishedGrade(tx, grade.id, body.newGrade);
      if (!updated) return fail('CONFLICT');
      await this.advanceRevision(tx, classroomId, room.revision);
      await this.repository.notifyCorrection(tx, attempt.student_id, classroomId, activity.id, attempt.id, grade.id);
      return this.correctionView(tx, { ...context, grade: updated, room: { ...room, revision: room.revision + 1n } });
    });
  }
}

export interface GradeCorrectionsRepository {
  corrections(tx: Transaction, ...values: unknown[]): Promise<{ id: string; previousGrade: string; newGrade: string; reason: string;
      actor: { id: string; firstName: string; lastName: string }; correctedAt: Date }[]>;
  insertCorrection(tx: Transaction, ...values: unknown[]): Promise<Record<string, unknown>[]>;
  updatePublishedGrade(tx: Transaction, ...values: unknown[]): Promise<GradeRow[]>;
  notifyCorrection(tx: Transaction, ...values: unknown[]): Promise<Record<string, unknown>[]>;
}
