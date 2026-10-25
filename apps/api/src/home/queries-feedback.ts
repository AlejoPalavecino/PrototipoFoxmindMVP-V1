import { baseJson, targetJson, instant } from './query-values.ts';
export const feedbackQuery = `SELECT g.id, ${baseJson('g.id', 'a.title', targetJson('grade', ",'activityId',a.id,'attemptId',t.id,'gradeId',g.id"))}
  || jsonb_build_object('activityType',a.type,'attemptNumber',t.attempt_number,'finalGrade',g.final_grade::text,
    'publishedAt',${instant('g.published_at')},'changedAt',${instant('g.updated_at')},'availability','available') AS item,
    ${instant('g.updated_at')} || '|' || g.id::text AS sort_key
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='PUBLISHED'
  JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid
  JOIN student_activities sa ON sa.enrollment_id=e.id AND sa.activity_id=a.id
  JOIN attempt_grades g ON g.id=sa.effective_grade_id AND g.student_activity_id=sa.id AND g.is_published
  JOIN attempts t ON t.id=g.attempt_id WHERE c.archived_at IS NULL AND c.role='student'`;
