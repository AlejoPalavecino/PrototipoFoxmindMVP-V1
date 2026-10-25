import { baseJson, targetJson, instant } from './query-values.ts';
export const pendingQuery = `SELECT a.id, ${baseJson('a.id', 'a.title', targetJson('activity', ",'activityId',a.id"))}
  || jsonb_build_object('activityType',a.type,'state',CASE WHEN COALESCE(t.attempt_number,1)>1 THEN 'resubmission' ELSE 'first-submission' END,
  'attemptId',t.id,'deadlineAt',${instant('GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at))')},
  'reception',CASE WHEN GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at)) <= $2::timestamptz
     AND NOT a.allow_late_submissions THEN 'closed' ELSE 'open' END,
  'late',COALESCE(GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at)) <= $2::timestamptz,false)) AS item,
  CASE WHEN GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at)) <= $2::timestamptz THEN '0|'
    WHEN GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at)) IS NOT NULL THEN '1|' ELSE '2|' END
    || COALESCE(${instant('GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at))')},'') || '|' || a.id::text AS sort_key
   ,jsonb_build_object('general',a.deadline_at,'individual',COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at),'allowLate',a.allow_late_submissions) AS policy
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='PUBLISHED'
  JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid
  JOIN student_activities sa ON sa.enrollment_id=e.id AND sa.activity_id=a.id AND sa.is_expected
  LEFT JOIN LATERAL (SELECT id,attempt_number,status,individual_deadline_at FROM attempts WHERE student_activity_id=sa.id
    ORDER BY attempt_number DESC LIMIT 1) t ON true
  WHERE c.archived_at IS NULL AND c.role='student' AND (t.id IS NULL OR t.status='DRAFT')`;
