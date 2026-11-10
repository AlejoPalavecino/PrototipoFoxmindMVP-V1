import type { GradePublicationRepository } from '../application/grade-publication.ts';
export const grade_publicationRepository: GradePublicationRepository = {
  lockQuestionGrades(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['lockQuestionGrades']>>[number]>(`SELECT question_id,earned_numerator::text AS numerator,earned_denominator::text AS denominator
         FROM question_grades WHERE attempt_grade_id=$1::uuid AND activity_id=$2::uuid FOR UPDATE`, ...values); },
  publishGrade(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['publishGrade']>>[number]>(`UPDATE attempt_grades SET final_grade=$2::numeric,is_published=true,
        published_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid AND NOT is_published
        RETURNING id,final_grade::text,overall_feedback,is_published,published_at,rubric_snapshot,rubric_marks,
        suggested_grade::text,final_grade_override::text,calculated_grade::text`, ...values); },
  updateQuestionGrade(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['updateQuestionGrade']>>[number]>(`UPDATE question_grades SET earned_numerator=$3::numeric,
        earned_denominator=$4::numeric,updated_at=clock_timestamp() WHERE attempt_grade_id=$1::uuid AND question_id=$2::uuid RETURNING id`, ...values); },
  setEffectiveGrade(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['setEffectiveGrade']>>[number]>(`UPDATE student_activities SET effective_grade_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, ...values); },
  notifyPublication(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['notifyPublication']>>[number]>(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id,attempt_grade_id)
        VALUES(gen_random_uuid(),clock_timestamp(),$1::uuid,$2::uuid,'GRADE_PUBLISHED',$3::uuid,$4::uuid,$5::uuid) RETURNING id`, ...values); },
  resultAttempt(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['resultAttempt']>>[number]>(`SELECT a.id,a.activity_id,a.student_activity_id,
        a.attempt_number,a.submitted_at,e.student_id,sa.effective_grade_id FROM attempts a
        JOIN student_activities sa ON sa.id=a.student_activity_id AND sa.activity_id=a.activity_id
        JOIN enrollments e ON e.id=sa.enrollment_id AND e.classroom_id=sa.classroom_id
        WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid AND a.status='SUBMITTED' FOR SHARE OF a,sa,e`, ...values); },
  publishedGrade(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['publishedGrade']>>[number]>(`SELECT id,final_grade::text,published_at,overall_feedback,rubric_snapshot,rubric_marks,suggested_grade::text,final_grade_override::text,calculated_grade::text FROM attempt_grades WHERE attempt_id=$1::uuid
         AND student_activity_id=$2::uuid AND activity_id=$3::uuid AND is_published AND published_at IS NOT NULL`, ...values); },
  resultQuestions(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['resultQuestions']>>[number]>(`SELECT q.id,q.type::text,q.prompt,q.available_points::text AS points,a.development_text AS text,
          COALESCE((SELECT jsonb_agg(jsonb_build_object('id',o.id,'text',o.text) ORDER BY o.position,o.id)
            FROM answer_selections s JOIN question_options o ON o.id=s.option_id AND o.question_id=q.id WHERE s.answer_id=a.id),'[]'::jsonb) AS "selectedOptions",
          g.earned_numerator::text AS numerator,g.earned_denominator::text AS denominator,g.feedback
         FROM questions q JOIN question_grades g ON g.question_id=q.id AND g.activity_id=q.activity_id AND g.attempt_grade_id=$1::uuid
         LEFT JOIN answers a ON a.question_id=q.id AND a.attempt_id=$2::uuid
         WHERE q.activity_id=$3::uuid ORDER BY q.position,q.id`, ...values); },
  resultAttachments(tx, ...values) { return tx.query<Awaited<ReturnType<GradePublicationRepository['resultAttachments']>>[number]>(`SELECT f.id,f.original_name AS name,
      (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED'
       AND f.scan_status='CLEAN' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready
      FROM attempt_attachments a JOIN files f ON f.id=a.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
      WHERE a.attempt_id=$1::uuid ORDER BY a.position,f.id`, ...values); },
};
