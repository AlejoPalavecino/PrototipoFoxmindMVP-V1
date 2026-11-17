export type { GradeNotification } from '../application/notification-targets.ts';
import type { GradeNotification } from '../application/notification-targets.ts';
/** Keep the complete recipient/grade/attempt/obligation chain identical for list, read and open. */
export const gradeNotificationSelection = `SELECT n.id,n.classroom_id AS "classroomId",c.name AS "classroomName",c.division AS "classroomDivision",
  n.event_type AS "eventType",a.id AS "activityId",a.title AS "activityTitle",attempt.id AS "attemptId",
  g.id AS "gradeId",n.created_at AS "createdAt",n.read_at AS "readAt"
  FROM notifications n JOIN classrooms c ON c.id=n.classroom_id
  JOIN activities a ON a.id=n.activity_id AND a.classroom_id=c.id AND a.status='PUBLISHED'
  JOIN attempts attempt ON attempt.id=n.attempt_id AND attempt.activity_id=a.id AND attempt.status='SUBMITTED'
  JOIN student_activities sa ON sa.id=attempt.student_activity_id AND sa.classroom_id=c.id AND sa.activity_id=a.id
  JOIN enrollments e ON e.id=sa.enrollment_id AND e.classroom_id=c.id AND e.student_id=n.recipient_id
  JOIN attempt_grades g ON g.id=n.attempt_grade_id AND g.attempt_id=attempt.id
    AND g.student_activity_id=sa.id AND g.activity_id=a.id AND g.is_published AND g.published_at IS NOT NULL
  WHERE n.recipient_id=$1::uuid AND n.event_type IN ('GRADE_PUBLISHED','GRADE_CORRECTED') AND n.post_id IS NULL AND n.reply_id IS NULL
    AND c.teacher_id<>$1::uuid AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)`;

export { gradeTarget } from '../application/notification-targets.ts';
