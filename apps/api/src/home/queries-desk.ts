import { baseJson, targetJson, instant } from './query-values.ts';
export const draftsQuery = `SELECT a.id, ${baseJson('a.id', "COALESCE(NULLIF(a.title,''),'Actividad sin título')", targetJson('activity', ",'activityId',a.id"))}
  || jsonb_build_object('activityType',a.type,'updatedAt',${instant('a.updated_at')}) AS item,
  COALESCE(a.title,'') || '|' || a.id::text AS sort_key
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='DRAFT'
  WHERE c.role='teacher' AND c.archived_at IS NULL`;
// Only the latest attempt of each owned activity: an opened resubmission belongs to pending.
// No private grade columns enter this projection.
export const submittedQuery = `SELECT t.id, ${baseJson('t.id', 'a.title', targetJson('activity', ",'activityId',a.id"))}
  || jsonb_build_object('activityType',a.type,'attemptNumber',t.attempt_number,'submittedAt',${instant('t.submitted_at')}) AS item,
  ${instant('t.submitted_at')} || '|' || t.id::text AS sort_key
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='PUBLISHED'
  JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid
  JOIN student_activities sa ON sa.enrollment_id=e.id AND sa.activity_id=a.id
  JOIN LATERAL (SELECT id,attempt_number,status,submitted_at FROM attempts WHERE student_activity_id=sa.id
    ORDER BY attempt_number DESC LIMIT 1) t ON t.status='SUBMITTED'
  WHERE c.role='student' AND c.archived_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM attempt_grades g WHERE g.attempt_id=t.id AND g.is_published)`;
