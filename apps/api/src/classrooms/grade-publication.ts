import { GradingService } from './grading.ts';
import { revision } from './drafts.ts';
import { fail, object, uuid } from './policy.ts';
import { fixedHundredths, hundredths, scoreJson } from './scoring.ts';
import type { Transaction } from './contracts.ts';

export function publicationInput(input: unknown) {
  const body = object(input, ['revision', 'confirm']);
  if (Object.keys(body).length !== 2 || body.confirm !== true) return fail('INVALID_INPUT');
  return { revision: revision(body.revision), confirm: true as const };
}

export class GradePublicationService extends GradingService {
  publishAttemptGrade(request: unknown, classroomId: string, attemptId: string, input: unknown) {
    const body = publicationInput(input);
    return this.run(request, true, async (tx, actor) => {
      const context = await this.gradingContext(tx, actor, classroomId, attemptId, true);
      const { room, grade, attempt, activity } = context;
      if (room.revision.toString() !== body.revision || !grade || grade.is_published) return fail('CONFLICT');
      const rows = await tx.query<{ question_id: string; numerator: string | null; denominator: string | null }>(
        `SELECT question_id,earned_numerator::text AS numerator,earned_denominator::text AS denominator
         FROM question_grades WHERE attempt_grade_id=$1::uuid AND activity_id=$2::uuid FOR UPDATE`, grade.id, activity.id);
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
        overallGrade: activity.type === 'ASSIGNMENT' ? grade.final_grade : null,
        overallFeedback: grade.overall_feedback, questions });
      if (correction.finalGrade === null || hundredths(correction.finalGrade) > 1000n) return fail('CONFLICT');
      // One source transaction owns grade, effective pointer, revision and event. Any failure rolls all of them back.
      const [published] = await tx.query<typeof grade>(`UPDATE attempt_grades SET final_grade=$2::numeric,is_published=true,
        published_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid AND NOT is_published
        RETURNING id,final_grade::text,overall_feedback,is_published,published_at`, grade.id, correction.finalGrade);
      if (!published) return fail('CONFLICT');
      for (const row of correction.questions) await tx.query(`UPDATE question_grades SET earned_numerator=$3::numeric,
        earned_denominator=$4::numeric,updated_at=clock_timestamp() WHERE attempt_grade_id=$1::uuid AND question_id=$2::uuid RETURNING id`,
      grade.id, row.questionId, row.score!.numerator.toString(), row.score!.denominator.toString());
      await tx.query(`UPDATE student_activities SET effective_grade_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, attempt.student_activity_id, grade.id);
      await this.advanceRevision(tx, classroomId, room.revision);
      await tx.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id,attempt_grade_id)
        VALUES(gen_random_uuid(),clock_timestamp(),$1::uuid,$2::uuid,'GRADE_PUBLISHED',$3::uuid,$4::uuid,$5::uuid) RETURNING id`,
      attempt.student_id, classroomId, activity.id, attempt.id, grade.id);
      return this.gradingView(tx, { ...context, grade: published, room: { ...room, revision: room.revision + 1n } });
    });
  }

  getAttemptResult(request: unknown, classroomId: string, attemptId: string) {
    if (!uuid(attemptId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      const [attempt] = await tx.query<{ id: string; activity_id: string; student_activity_id: string; student_id: string;
        attempt_number: number; submitted_at: Date; effective_grade_id: string | null }>(`SELECT a.id,a.activity_id,a.student_activity_id,
        a.attempt_number,a.submitted_at,e.student_id,sa.effective_grade_id FROM attempts a
        JOIN student_activities sa ON sa.id=a.student_activity_id AND sa.activity_id=a.activity_id
        JOIN enrollments e ON e.id=sa.enrollment_id AND e.classroom_id=sa.classroom_id
        WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid AND a.status='SUBMITTED' FOR SHARE OF a,sa,e`, attemptId, classroomId);
      if (!attempt || (actor.id !== room.teacher_id && actor.id !== attempt.student_id)) return fail('FORBIDDEN');
      const activity = await this.activity(tx, classroomId, attempt.activity_id);
      if (activity.status !== 'PUBLISHED') return fail('FORBIDDEN');
      const [grade] = await tx.query<{ id: string; final_grade: string; published_at: Date; overall_feedback: string | null }>(
        `SELECT id,final_grade::text,published_at,overall_feedback FROM attempt_grades WHERE attempt_id=$1::uuid
         AND student_activity_id=$2::uuid AND activity_id=$3::uuid AND is_published AND published_at IS NOT NULL`,
        attempt.id, attempt.student_activity_id, activity.id);
      if (!grade) return { status: 'pending' as const, attemptId: attempt.id };
      const questions = await tx.query<{ id: string; type: string; prompt: string; points: string; text: string | null;
        selectedOptions: { id: string; text: string }[]; numerator: string; denominator: string; feedback: string | null }>(
        `SELECT q.id,q.type::text,q.prompt,q.available_points::text AS points,a.development_text AS text,
          COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'text',o.text) ORDER BY o.position,o.id)
            FROM answer_selections s JOIN question_options o ON o.id=s.option_id AND o.question_id=q.id WHERE s.answer_id=a.id),'[]'::jsonb) AS "selectedOptions",
          g.earned_numerator::text AS numerator,g.earned_denominator::text AS denominator,g.feedback
         FROM questions q JOIN question_grades g ON g.question_id=q.id AND g.activity_id=q.activity_id AND g.attempt_grade_id=$1::uuid
         LEFT JOIN answers a ON a.question_id=q.id AND a.attempt_id=$2::uuid
         WHERE q.activity_id=$3::uuid ORDER BY q.position,q.id`, grade.id, attempt.id, activity.id);
      return { status: 'published' as const, activity: { id: activity.id, title: activity.title, type: activity.type },
        attempt: { id: attempt.id, number: attempt.attempt_number, submittedAt: attempt.submitted_at },
        grade: { id: grade.id, finalGrade: fixedHundredths(hundredths(grade.final_grade)), publishedAt: grade.published_at,
          overallFeedback: grade.overall_feedback, isEffective: attempt.effective_grade_id === grade.id },
        questions: questions.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, points: q.points,
          answer: { text: q.text, selectedOptions: q.selectedOptions },
          earned: scoreJson({ numerator: BigInt(q.numerator), denominator: BigInt(q.denominator) }), feedback: q.feedback })),
        attachments: await this.resultAttachments(tx, attempt.id) };
    });
  }

  private resultAttachments(tx: Transaction, attemptId: string) {
    return tx.query<{ id: string; name: string; ready: boolean }>(`SELECT f.id,f.original_name AS name,
      (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED'
       AND f.scan_status='CLEAN' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready
      FROM attempt_attachments a JOIN files f ON f.id=a.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
      WHERE a.attempt_id=$1::uuid ORDER BY a.position,f.id`, attemptId);
  }
}
