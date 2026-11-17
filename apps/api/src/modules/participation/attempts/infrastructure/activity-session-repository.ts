import { practicalAttachments, questionnaireUnanswered } from './session-readers.ts';
import { isVerifiedRead } from '../../../classrooms/public.ts';
import type { ActivitySessionRepository } from '../application/activity-session.ts';
export const activity_sessionRepository: ActivitySessionRepository = {
 practicalAttachments, questionnaireUnanswered,
  obligation(tx, input) { return tx.query<Awaited<ReturnType<ActivitySessionRepository['obligation']>>[number]>(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
    WHERE sa.classroom_id=$1::uuid AND sa.activity_id=$2::uuid AND e.student_id=$3::uuid FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'} OF e,sa`, input.classroomId, input.activityId, input.studentId); },
  firstAttempt(tx, input) { return tx.query<Awaited<ReturnType<ActivitySessionRepository['firstAttempt']>>[number]>('SELECT id FROM attempts WHERE student_activity_id=$1::uuid LIMIT 1', input.obligationId); },
  answers(tx, input) { return tx.query<Awaited<ReturnType<ActivitySessionRepository['answers']>>[number]>(`SELECT
    a.question_id AS "questionId",a.development_text AS text,a.saved_at AS "savedAt",
    COALESCE((SELECT array_agg(s.option_id ORDER BY s.option_id) FROM answer_selections s WHERE s.answer_id=a.id),'{}'::uuid[]) AS "optionIds"
    FROM answers a WHERE a.attempt_id=$1::uuid ORDER BY a.question_id`, input.attemptId); },
};
