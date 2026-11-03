import type { ClassroomCore } from './core.ts';
import type { GradingService } from './grading.ts';
import type { ClassroomFileOperations } from './classroom-file.ts';
import { revision } from './revision.ts';
import { fail, object } from './policy.ts';
import { fixedHundredths, hundredths } from './scoring.ts';
import type { Transaction } from './contracts.ts';
import { gradeCorrectionInput as parseCorrection } from '../../../../src/core/domain/index.ts';

export function gradeCorrectionInput(input: unknown) {
  try { return parseCorrection(input); } catch { return fail('INVALID_INPUT'); }
}

/** A correction changes only the same published final grade, never its effective identity or scoring evidence. */
export class GradeCorrectionService {
  private readonly run: ClassroomCore['run'];
  private readonly gradingContext: GradingService['gradingContext'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  constructor(context: Pick<ClassroomCore, 'run'>, dependencies: Pick<GradingService, 'gradingContext'> & Pick<ClassroomFileOperations, 'advanceRevision'>) {
    this.run = context.run.bind(context); this.gradingContext = dependencies.gradingContext; this.advanceRevision = dependencies.advanceRevision;
  }
  private async correctionView(tx: Transaction, context: Awaited<ReturnType<GradeCorrectionService['gradingContext']>>) {
    const { room, grade } = context;
    if (!grade?.is_published || grade.final_grade === null || !grade.published_at) return fail('CONFLICT');
    const corrections = await tx.query<{ id: string; previousGrade: string; newGrade: string; reason: string;
      actor: { id: string; firstName: string; lastName: string }; correctedAt: Date }>(
      `SELECT g.id,g.previous_grade::text AS "previousGrade",g.new_grade::text AS "newGrade",g.reason,
        jsonb_build_object('id',u.id,'firstName',u.first_name,'lastName',u.last_name) AS actor,g.corrected_at AS "correctedAt"
       FROM grade_corrections g JOIN users u ON u.id=g.actor_id WHERE g.attempt_grade_id=$1::uuid
       ORDER BY g.corrected_at,g.id`, grade.id);
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
      await tx.query(`INSERT INTO grade_corrections(id,updated_at,attempt_grade_id,previous_grade,new_grade,reason,actor_id,corrected_at)
        VALUES(gen_random_uuid(),clock_timestamp(),$1::uuid,$2::numeric,$3::numeric,$4,$5::uuid,clock_timestamp()) RETURNING id`,
      grade.id, grade.final_grade, body.newGrade, body.reason, actor.id);
      const [updated] = await tx.query<typeof grade>(`UPDATE attempt_grades SET final_grade=$2::numeric,updated_at=clock_timestamp()
        WHERE id=$1::uuid AND is_published RETURNING id,final_grade::text,overall_feedback,is_published,published_at`, grade.id, body.newGrade);
      if (!updated) return fail('CONFLICT');
      await this.advanceRevision(tx, classroomId, room.revision);
      await tx.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id,attempt_grade_id)
        VALUES(gen_random_uuid(),clock_timestamp(),$1::uuid,$2::uuid,'GRADE_CORRECTED',$3::uuid,$4::uuid,$5::uuid) RETURNING id`,
      attempt.student_id, classroomId, activity.id, attempt.id, grade.id);
      return this.correctionView(tx, { ...context, grade: updated, room: { ...room, revision: room.revision + 1n } });
    });
  }
}
