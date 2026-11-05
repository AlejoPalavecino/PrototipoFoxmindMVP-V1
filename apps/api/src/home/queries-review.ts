import { baseJson, targetJson, instant } from './query-values.ts';
// This is a read projection of persisted publication prerequisites; it never recomputes a student's grade.
export const reviewQuery = `WITH attempts_to_review AS (
  SELECT a.id AS activity_id,t.id AS attempt_id,t.attempt_number,t.submitted_at,
    concat_ws(' ',u.first_name,u.last_name) AS student_name,
    (g.id IS NOT NULL AND g.final_grade IS NOT NULL AND g.final_grade BETWEEN 0 AND 10 AND NOT EXISTS (
      SELECT 1 FROM questions q LEFT JOIN question_grades qg ON qg.question_id=q.id AND qg.attempt_grade_id=g.id
      WHERE q.activity_id=a.id AND (qg.id IS NULL OR qg.earned_numerator IS NULL OR qg.earned_denominator IS NULL
        OR qg.earned_denominator<=0 OR qg.earned_numerator<0 OR qg.earned_numerator<>trunc(qg.earned_numerator)
        OR qg.earned_denominator<>trunc(qg.earned_denominator)
        OR qg.earned_numerator>q.available_points*qg.earned_denominator
        OR (q.type='DEVELOPMENT' AND mod(qg.earned_numerator*100,qg.earned_denominator)<>0)))) AS ready
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='PUBLISHED'
  JOIN attempts t ON t.activity_id=a.id AND t.status='SUBMITTED'
  JOIN student_activities sa ON sa.id=t.student_activity_id AND sa.activity_id=a.id
  JOIN enrollments e ON e.id=sa.enrollment_id AND e.classroom_id=c.id
  JOIN users u ON u.id=e.student_id
  LEFT JOIN attempt_grades g ON g.attempt_id=t.id
  WHERE c.role='teacher' AND c.archived_at IS NULL AND NOT COALESCE(g.is_published,false)
), individual AS (SELECT *,submitted_at AS oldest,
  CASE WHEN ready THEN 0 ELSE 1 END AS needs_review,CASE WHEN ready THEN 1 ELSE 0 END AS ready_to_publish
  FROM attempts_to_review)
SELECT r.attempt_id AS id, ${baseJson('r.attempt_id', 'a.title', targetJson('submissions', ",'activityId',a.id,'attemptId',r.attempt_id,'filter','unpublished'"))}
  || jsonb_build_object('activityType',a.type,'needsReview',r.needs_review,'readyToPublish',r.ready_to_publish,
    'studentName',r.student_name,'attemptNumber',r.attempt_number,
    'oldestSubmittedAt',${instant('r.oldest')}) AS item,
  ${instant('r.oldest')} || '|' || r.attempt_id::text AS sort_key,
  r.needs_review,r.ready_to_publish
  FROM individual r JOIN activities a ON a.id=r.activity_id JOIN rooms c ON c.id=a.classroom_id`;
