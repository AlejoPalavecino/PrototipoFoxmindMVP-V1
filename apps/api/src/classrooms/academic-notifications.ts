import type { ActivityEvent } from './activity-events.ts';

export interface AcademicNotification {
  id: string; classroomId: string; classroomName: string; eventType: ActivityEvent;
  activityId: string; activityTitle: string; attemptId: string | null; createdAt: Date; readAt: Date | null;
}

/** The identical current-recipient/target predicate protects list, read and open. */
export const academicNotificationSelection = `SELECT n.id,n.classroom_id AS "classroomId",c.name AS "classroomName",c.division AS "classroomDivision",
  CASE WHEN n.event_type='SUBMISSION_RECEIVED' THEN concat(student.first_name,' ',student.last_name) ELSE NULL END AS "actorName",
  n.event_type AS "eventType",a.id AS "activityId",a.title AS "activityTitle",n.attempt_id AS "attemptId",
  n.created_at AS "createdAt",n.read_at AS "readAt"
  FROM notifications n JOIN classrooms c ON c.id=n.classroom_id
  JOIN activities a ON a.id=n.activity_id AND a.classroom_id=c.id AND a.status='PUBLISHED'
  LEFT JOIN attempts attempt ON attempt.id=n.attempt_id AND attempt.activity_id=a.id
  LEFT JOIN student_activities sa ON sa.id=attempt.student_activity_id AND sa.classroom_id=c.id
  LEFT JOIN enrollments owner ON owner.id=sa.enrollment_id AND owner.classroom_id=c.id
  LEFT JOIN users student ON student.id=owner.student_id
  WHERE n.recipient_id=$1::uuid AND n.post_id IS NULL AND n.reply_id IS NULL AND n.attempt_grade_id IS NULL
    AND ((n.event_type IN ('ACTIVITY_PUBLISHED','ACTIVITY_DEADLINE_CHANGED','FIRST_SUBMISSION_ENABLED') AND n.attempt_id IS NULL)
      OR (n.event_type='ATTEMPT_REOPENED' AND attempt.id IS NOT NULL AND owner.student_id=$1::uuid)
      OR (n.event_type='SUBMISSION_RECEIVED' AND attempt.status='SUBMITTED' AND c.teacher_id=$1::uuid))
    AND ((n.event_type='SUBMISSION_RECEIVED' AND c.teacher_id=$1::uuid) OR
      (n.event_type<>'SUBMISSION_RECEIVED' AND c.teacher_id<>$1::uuid AND EXISTS(SELECT 1 FROM enrollments e
        JOIN membership_periods m ON m.enrollment_id=e.id WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND m.ended_at IS NULL)))`;

export function academicTarget(row: AcademicNotification) {
  return { kind: row.eventType === 'SUBMISSION_RECEIVED' ? 'submission' as const : row.attemptId ? 'attempt' as const : 'activity' as const,
    classroomId: row.classroomId, activityId: row.activityId, attemptId: row.attemptId };
}
