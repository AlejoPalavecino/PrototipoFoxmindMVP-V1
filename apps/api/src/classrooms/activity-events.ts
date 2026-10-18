import type { Transaction } from './contracts.ts';

export type ActivityEvent = 'ACTIVITY_PUBLISHED' | 'ACTIVITY_DEADLINE_CHANGED' | 'FIRST_SUBMISSION_ENABLED' | 'ATTEMPT_REOPENED' | 'SUBMISSION_RECEIVED';

/** Call once inside the locked source transition, never from a subsequent read or retry. */
export async function activityEvent(tx: Transaction, classroomId: string, activityId: string,
  event: ActivityEvent, recipient: string | null = null, attemptId: string | null = null) {
  await tx.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id)
    SELECT gen_random_uuid(),clock_timestamp(),u.id,c.id,$3,a.id,$5::uuid
    FROM classrooms c JOIN activities a ON a.classroom_id=c.id CROSS JOIN users u
    WHERE c.id=$1::uuid AND a.id=$2::uuid AND a.status='PUBLISHED'
      AND ($4::uuid IS NULL OR u.id=$4::uuid)
      AND (($3='SUBMISSION_RECEIVED' AND u.id=c.teacher_id) OR ($3<>'SUBMISSION_RECEIVED' AND u.id<>c.teacher_id
        AND EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
          WHERE e.classroom_id=c.id AND e.student_id=u.id AND m.ended_at IS NULL))) RETURNING id`,
  classroomId, activityId, event, recipient, attemptId);
}

export function deadlineChanged(before: Date | null, after: Date | null, beforeLate: boolean, afterLate: boolean) {
  return before?.getTime() !== after?.getTime() || beforeLate !== afterLate;
}
