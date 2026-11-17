export const notificationSelection = `SELECT n.id,n.classroom_id AS "classroomId",c.name AS "classroomName",c.division AS "classroomDivision",
  concat(author.first_name,' ',author.last_name) AS "actorName",
  CASE WHEN n.reply_id IS NULL AND p.removed_at IS NULL THEN left(p.body,280)
    WHEN n.reply_id IS NOT NULL AND r.removed_at IS NULL THEN left(r.body,280) ELSE NULL END AS message,
  n.event_type AS "eventType",n.post_id AS "postId",n.reply_id AS "replyId",n.created_at AS "createdAt",n.read_at AS "readAt"
  FROM notifications n JOIN classrooms c ON c.id=n.classroom_id
  JOIN wall_posts p ON p.id=n.post_id AND p.classroom_id=n.classroom_id
  LEFT JOIN wall_replies r ON r.id=n.reply_id AND r.classroom_id=n.classroom_id AND r.post_id=p.id
  JOIN users author ON author.id=coalesce(r.author_id,p.author_id)
  WHERE n.recipient_id=$1::uuid
    AND n.activity_id IS NULL AND n.attempt_id IS NULL AND n.attempt_grade_id IS NULL
    AND ((n.event_type IN ('WALL_NOTICE','WALL_QUERY') AND n.reply_id IS NULL) OR (n.event_type='WALL_REPLY' AND r.id IS NOT NULL))
    AND (c.teacher_id=$1::uuid OR EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
      WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND m.ended_at IS NULL))`;
