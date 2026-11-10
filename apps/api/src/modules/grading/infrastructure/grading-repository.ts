import { randomUUID } from 'node:crypto';
import { isVerifiedRead } from '../../classrooms/public.ts';
import type { GradingRepository } from '../application/grading.ts';
export const gradingRepository: GradingRepository = {
  newId: randomUUID,
  lockAttempt(tx, write, ...values) { return tx.query<Awaited<ReturnType<GradingRepository['lockAttempt']>>[number]>(`SELECT a.*,e.student_id,u.first_name,u.last_name
      FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
      JOIN enrollments e ON e.id=sa.enrollment_id JOIN users u ON u.id=e.student_id
      WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid AND e.classroom_id=$2::uuid AND sa.activity_id=a.activity_id
      FOR ${isVerifiedRead(tx) && !write ? 'SHARE' : 'UPDATE'} OF a,sa,e`, ...values); },
  lockGrade(tx, write, ...values) { return tx.query<Awaited<ReturnType<GradingRepository['lockGrade']>>[number]>(`SELECT id,final_grade::text,overall_feedback,is_published,published_at,rubric_snapshot,rubric_marks,suggested_grade::text,final_grade_override::text,calculated_grade::text
      FROM attempt_grades WHERE attempt_id=$1::uuid AND student_activity_id=$2::uuid AND activity_id=$3::uuid FOR ${isVerifiedRead(tx) && !write ? 'SHARE' : 'UPDATE'}`, ...values); },
  answers(tx, ...values) { return tx.query<Awaited<ReturnType<GradingRepository['answers']>>[number]>(`SELECT a.question_id AS "questionId",a.development_text AS text,
      COALESCE(array_agg(s.option_id ORDER BY s.option_id) FILTER(WHERE s.option_id IS NOT NULL),ARRAY[]::uuid[]) AS "optionIds"
      FROM answers a LEFT JOIN answer_selections s ON s.answer_id=a.id WHERE a.attempt_id=$1::uuid GROUP BY a.id ORDER BY a.question_id`, ...values); },
  savedQuestionGrades(tx, ...values) { return tx.query<Awaited<ReturnType<GradingRepository['savedQuestionGrades']>>[number]>(`SELECT question_id,earned_numerator::text AS numerator,
      earned_denominator::text AS denominator,feedback FROM question_grades WHERE attempt_grade_id=$1::uuid`, ...values); },
  attachments(tx, ...values) { return tx.query<Awaited<ReturnType<GradingRepository['attachments']>>[number]>(`SELECT f.id,f.original_name AS name,
      (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED'
       AND f.scan_status='CLEAN' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready
      FROM attempt_attachments a JOIN files f ON f.id=a.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
      WHERE a.attempt_id=$1::uuid ORDER BY a.position,f.id`, ...values); },
  savePrivateGrade(tx, ...values) { return tx.query<Awaited<ReturnType<GradingRepository['savePrivateGrade']>>[number]>(`INSERT INTO attempt_grades(id,updated_at,attempt_id,student_activity_id,activity_id,
        final_grade,overall_feedback,graded_by_id,rubric_snapshot,rubric_marks,suggested_grade,final_grade_override,calculated_grade) VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5::numeric,$6,$7::uuid,$8::jsonb,$9::jsonb,$10::numeric,$11::numeric,$12::numeric)
        ON CONFLICT(attempt_id) DO UPDATE SET updated_at=clock_timestamp(),final_grade=EXCLUDED.final_grade,
          overall_feedback=EXCLUDED.overall_feedback,graded_by_id=EXCLUDED.graded_by_id,
          rubric_snapshot=EXCLUDED.rubric_snapshot,rubric_marks=EXCLUDED.rubric_marks,suggested_grade=EXCLUDED.suggested_grade,
          final_grade_override=EXCLUDED.final_grade_override,calculated_grade=EXCLUDED.calculated_grade WHERE NOT attempt_grades.is_published
        RETURNING id,final_grade::text,overall_feedback,is_published,published_at,rubric_snapshot,rubric_marks,suggested_grade::text,final_grade_override::text,calculated_grade::text`, ...values); },
  saveQuestionGrade(tx, ...values) { return tx.query<Awaited<ReturnType<GradingRepository['saveQuestionGrade']>>[number]>(`INSERT INTO question_grades(id,updated_at,attempt_grade_id,activity_id,
        question_id,earned_numerator,earned_denominator,feedback) VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5::numeric,$6::numeric,$7)
        ON CONFLICT(attempt_grade_id,question_id) DO UPDATE SET updated_at=clock_timestamp(),earned_numerator=EXCLUDED.earned_numerator,
          earned_denominator=EXCLUDED.earned_denominator,feedback=EXCLUDED.feedback RETURNING id`, ...values); },
};
