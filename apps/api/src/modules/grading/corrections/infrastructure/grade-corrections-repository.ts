import type { GradeCorrectionsRepository } from '../application/grade-corrections.ts';
export const grade_correctionsRepository: GradeCorrectionsRepository = {
  corrections(tx, input) { return tx.query<Awaited<ReturnType<GradeCorrectionsRepository['corrections']>>[number]>(`SELECT g.id,g.previous_grade::text AS "previousGrade",g.new_grade::text AS "newGrade",g.reason,
        jsonb_build_object('id',u.id,'firstName',u.first_name,'lastName',u.last_name) AS actor,g.corrected_at AS "correctedAt"
       FROM grade_corrections g JOIN users u ON u.id=g.actor_id WHERE g.attempt_grade_id=$1::uuid
       ORDER BY g.corrected_at,g.id`, input.gradeId); },
  insertCorrection(tx, input) { return tx.query<Awaited<ReturnType<GradeCorrectionsRepository['insertCorrection']>>[number]>(`INSERT INTO grade_corrections(id,updated_at,attempt_grade_id,previous_grade,new_grade,reason,actor_id,corrected_at)
        VALUES(gen_random_uuid(),clock_timestamp(),$1::uuid,$2::numeric,$3::numeric,$4,$5::uuid,clock_timestamp()) RETURNING id`, input.gradeId, input.previousGrade, input.newGrade, input.reason, input.actorId); },
  updatePublishedGrade(tx, input) { return tx.query<Awaited<ReturnType<GradeCorrectionsRepository['updatePublishedGrade']>>[number]>(`UPDATE attempt_grades SET final_grade=$2::numeric,updated_at=clock_timestamp()
        WHERE id=$1::uuid AND is_published RETURNING id,final_grade::text,overall_feedback,is_published,published_at`, input.gradeId, input.newGrade); },
  notifyCorrection(tx, input) { return tx.query<Awaited<ReturnType<GradeCorrectionsRepository['notifyCorrection']>>[number]>(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id,attempt_grade_id)
        VALUES(gen_random_uuid(),clock_timestamp(),$1::uuid,$2::uuid,'GRADE_CORRECTED',$3::uuid,$4::uuid,$5::uuid) RETURNING id`, input.studentId, input.classroomId, input.activityId, input.attemptId, input.gradeId); },
};
