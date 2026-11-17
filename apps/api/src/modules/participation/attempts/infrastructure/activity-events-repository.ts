
import type { ActivityEventsRepository } from '../application/activity-events.ts';
export const repository: ActivityEventsRepository = {

 insertEvent(tx, input) {return tx.query<Awaited<ReturnType<ActivityEventsRepository['insertEvent']>>[number]>(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id)
    SELECT gen_random_uuid(),clock_timestamp(),u.id,c.id,$3,a.id,$5::uuid
    FROM classrooms c JOIN activities a ON a.classroom_id=c.id CROSS JOIN users u
    WHERE c.id=$1::uuid AND a.id=$2::uuid AND a.status='PUBLISHED'
      AND ($4::uuid IS NULL OR u.id=$4::uuid)
      AND (($3='SUBMISSION_RECEIVED' AND u.id=c.teacher_id) OR ($3<>'SUBMISSION_RECEIVED' AND u.id<>c.teacher_id
        AND EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
          WHERE e.classroom_id=c.id AND e.student_id=u.id AND m.ended_at IS NULL))) RETURNING id`, input.classroomId, input.activityId, input.event, input.recipientId, input.attemptId);},
};
