import { baseJson, targetJson, instant } from './query-values.ts';
// ECMAScript String.trim whitespace, matching questionnaireUnanswered's definition of an answer.
const answerWhitespace=String.raw`\0009\000a\000b\000c\000d\0020\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff`;
export const pendingQuery = `SELECT a.id, ${baseJson('a.id', 'a.title', targetJson('activity', ",'activityId',a.id"))}
  || jsonb_build_object('activityType',a.type,'state',CASE WHEN COALESCE(t.attempt_number,1)>1 THEN 'resubmission' ELSE 'first-submission' END,
  'attemptId',t.id,'questionProgress',CASE WHEN a.type='ASSIGNMENT' THEN NULL ELSE jsonb_build_object(
    'total',(SELECT count(*)::int FROM questions q WHERE q.activity_id=a.id),
    'answered',(SELECT count(*)::int FROM answers answer JOIN questions q ON q.id=answer.question_id AND q.activity_id=a.id
      WHERE answer.attempt_id=t.id AND (NULLIF(btrim(answer.development_text,U&'${answerWhitespace}'),'') IS NOT NULL OR EXISTS(SELECT 1 FROM answer_selections s WHERE s.answer_id=answer.id)))) END,
  'deadlineAt',${instant('GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at))')},
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
