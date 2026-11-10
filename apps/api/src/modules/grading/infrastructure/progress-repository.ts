import { studentSnapshot } from './student-ai/snapshot.ts';
import { displayReferences } from './student-ai/snapshot.ts';
import type { ProgressRepository } from '../application/progress.ts';
export const repository: ProgressRepository = {
 studentSnapshot,
 displayReferences,
 progressRows(tx,...values) {return tx.query<Awaited<ReturnType<ProgressRepository['progressRows']>>[number]>(`SELECT e.student_id AS "studentId",a.id,a.title,a.type::text,sa.is_expected AS expected,
      CASE WHEN first.id IS NULL THEN NULL ELSE jsonb_build_object('id',first.id,'number',first.attempt_number,
        'submittedAt',first.submitted_at,'appliedDeadlineAt',first.applied_deadline_at,'late',first.submitted_late) END AS "firstSubmission",
      (SELECT count(*)::int FROM attempts attempt WHERE attempt.student_activity_id=sa.id AND attempt.activity_id=a.id
        AND attempt.status='SUBMITTED') AS "confirmedAttempts",
      EXISTS(SELECT 1 FROM attempts pending WHERE pending.student_activity_id=sa.id AND pending.activity_id=a.id
        AND pending.status='DRAFT' AND pending.attempt_number>1) AS "pendingResubmission",g.final_grade::text AS grade
      FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id AND e.classroom_id=sa.classroom_id
      JOIN activities a ON a.id=sa.activity_id AND a.classroom_id=sa.classroom_id AND a.status='PUBLISHED'
      LEFT JOIN LATERAL (SELECT attempt.* FROM attempts attempt WHERE attempt.student_activity_id=sa.id
        AND attempt.activity_id=a.id AND attempt.status='SUBMITTED' ORDER BY attempt.submitted_at,attempt.attempt_number,attempt.id LIMIT 1) first ON true
      LEFT JOIN attempt_grades g ON g.id=sa.effective_grade_id AND g.is_published AND g.final_grade IS NOT NULL
        AND g.published_at IS NOT NULL AND EXISTS(SELECT 1 FROM attempts graded WHERE graded.id=g.attempt_id
          AND graded.student_activity_id=sa.id AND graded.activity_id=a.id AND graded.status='SUBMITTED')
      WHERE sa.classroom_id=$1::uuid AND (($2::uuid IS NOT NULL AND e.student_id=$2::uuid)
        OR ($2::uuid IS NULL AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)))
      ORDER BY a.published_at,a.id,e.student_id`,...values);},
 students(tx,...values) {return tx.query<Awaited<ReturnType<ProgressRepository['students']>>[number]>(`SELECT e.student_id AS "studentId",u.first_name AS "firstName",u.last_name AS "lastName",
      EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) AS "currentMember"
      FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.classroom_id=$1::uuid
      AND (($2::uuid IS NOT NULL AND e.student_id=$2::uuid) OR ($2::uuid IS NULL
        AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL))) ORDER BY u.last_name,u.first_name,e.student_id`,...values);},
 topics(tx,...values) {return tx.query<Awaited<ReturnType<ProgressRepository['topics']>>[number]>(`SELECT count(*)::int AS total,
      count(*) FILTER(WHERE status='TAUGHT')::int AS taught FROM topics WHERE classroom_id=$1::uuid`,...values);},
 member(tx,...values) {return tx.query<Awaited<ReturnType<ProgressRepository['member']>>[number]>(`SELECT e.id FROM enrollments e
        JOIN membership_periods m ON m.enrollment_id=e.id AND m.ended_at IS NULL
        WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid FOR SHARE OF e,m`,...values);},
 report(tx,...values) {return tx.query<Awaited<ReturnType<ProgressRepository['report']>>[number]>(`SELECT state,report,updated_at,error_code,reference_map FROM student_ai_reports
        WHERE enrollment_id=$1::uuid AND evidence_hash=$2 ORDER BY created_at DESC,id DESC LIMIT 1`,...values);},
};
