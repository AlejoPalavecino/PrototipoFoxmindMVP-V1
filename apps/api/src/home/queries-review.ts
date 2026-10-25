import { baseJson, targetJson, instant } from './query-values.ts';
// This is a read projection of persisted publication prerequisites; it never recomputes a student's grade.
export const reviewQuery = `WITH attempts_to_review AS (
  SELECT a.id AS activity_id,t.submitted_at,
    (g.id IS NOT NULL AND g.final_grade IS NOT NULL AND g.final_grade BETWEEN 0 AND 10 AND NOT EXISTS (
      SELECT 1 FROM questions q LEFT JOIN question_grades qg ON qg.question_id=q.id AND qg.attempt_grade_id=g.id
      WHERE q.activity_id=a.id AND (qg.id IS NULL OR qg.earned_numerator IS NULL OR qg.earned_denominator IS NULL
        OR qg.earned_denominator<=0 OR qg.earned_numerator<0 OR qg.earned_numerator<>trunc(qg.earned_numerator)
        OR qg.earned_denominator<>trunc(qg.earned_denominator)
        OR qg.earned_numerator>q.available_points*qg.earned_denominator
        OR (q.type='DEVELOPMENT' AND mod(qg.earned_numerator*100,qg.earned_denominator)<>0)))) AS ready
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='PUBLISHED'
  JOIN attempts t ON t.activity_id=a.id AND t.status='SUBMITTED'
  LEFT JOIN attempt_grades g ON g.attempt_id=t.id
  WHERE c.role='teacher' AND c.archived_at IS NULL AND NOT COALESCE(g.is_published,false)
), grouped AS (SELECT activity_id,min(submitted_at) AS oldest,
  count(*) FILTER(WHERE NOT ready)::int AS needs_review,count(*) FILTER(WHERE ready)::int AS ready_to_publish
  FROM attempts_to_review GROUP BY activity_id)
SELECT a.id, ${baseJson('a.id', 'a.title', targetJson('submissions', ",'activityId',a.id,'filter','unpublished'"))}
  || jsonb_build_object('activityType',a.type,'needsReview',r.needs_review,'readyToPublish',r.ready_to_publish,
    'oldestSubmittedAt',${instant('r.oldest')}) AS item,
  ${instant('r.oldest')} || '|' || a.id::text AS sort_key,
  r.needs_review,r.ready_to_publish
  FROM grouped r JOIN activities a ON a.id=r.activity_id JOIN rooms c ON c.id=a.classroom_id`;
