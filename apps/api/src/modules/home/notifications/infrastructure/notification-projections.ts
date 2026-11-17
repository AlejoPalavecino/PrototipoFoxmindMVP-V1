import { fail, type Transaction } from '../../../classrooms/public.ts';
import type { ProjectedNotificationTarget } from '../../../../../../../src/core/contracts/notifications.ts';

import type { AgendaNoticeSource } from '../application/read-port.ts';
export type { AgendaNoticeSource } from '../application/read-port.ts';
export async function projectedAgendaNotices(tx: Transaction, actor: string, list: AgendaNoticeSource, id?: string): Promise<string> {
  if (id !== undefined && !id.startsWith('event-')) return '[]';
  const [{ now }] = await tx.query<{ now: Date }>('SELECT statement_timestamp() AS now');
  return JSON.stringify(await list(tx, actor, now.toISOString(), id?.slice(6, 42) ?? null));
}

// Owners are explicit for private sources. Invitation visibility follows pendingInvitations.
const visibleReview = `study_review_sessions s JOIN study_folders f
  ON f.id=s.folder_id AND f.owner_id=s.owner_id AND f.status='ACTIVE'
  JOIN agenda_events e ON e.id=s.agenda_event_id AND e.owner_id=s.owner_id AND e.revision=s.event_revision
  JOIN users student ON student.id=s.owner_id AND student.account_role='student'
  WHERE s.owner_id=$1::uuid AND s.notified_at IS NOT NULL AND s.cancelled_at IS NULL`;

export function notificationProjections(events: '$2') {
  return `SELECT projected.*, COALESCE(projected."sourceReadAt", r.read_at) AS "readAt" FROM (
    SELECT 'invite-'||i.id||'-'||i.generation AS id,c.id AS "classroomId",c.name AS "classroomName",
      'CLASSROOM_INVITATION' AS "eventType",concat(t.first_name,' ',t.last_name) AS "actorName",
      c.name AS title,i.issued_at AS "createdAt",NULL::timestamptz AS "sourceReadAt",
      jsonb_build_object('kind','invitation','invitationId',i.id) AS target
    FROM invitations i
    JOIN users recipient ON recipient.id=$1::uuid AND recipient.account_role='student'
      AND recipient.email_verified_at IS NOT NULL AND recipient.email_normalized=i.recipient_email_normalized
    JOIN classrooms c ON c.id=i.classroom_id JOIN users t ON t.id=c.teacher_id
    WHERE i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.declined_at IS NULL AND i.expires_at>statement_timestamp()
      AND c.archived_at IS NULL AND c.teacher_id<>recipient.id
      AND NOT EXISTS (SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=c.id AND e.student_id=recipient.id AND (m.ended_at IS NULL OR m.ended_at>=i.issued_at))
    UNION ALL
    SELECT 'member-'||m.id,c.id,c.name,'CLASSROOM_JOINED',concat(s.first_name,' ',s.last_name),
      c.name,m.joined_at,NULL,
      jsonb_build_object('kind','members','classroomId',c.id)
    FROM membership_periods m JOIN enrollments e ON e.id=m.enrollment_id AND e.classroom_id=m.classroom_id
    JOIN classrooms c ON c.id=e.classroom_id AND c.teacher_id=$1::uuid
    JOIN users s ON s.id=e.student_id WHERE m.ended_at IS NULL
    UNION ALL
    SELECT 'review-'||s.id,NULL,NULL,'STUDY_REVIEW_REMINDER',NULL,e.title,s.notified_at,s.read_at,
      jsonb_build_object('kind','study','folderId',s.folder_id,'examId',s.exam_id,'startsAt',s.starts_at)
    FROM ${visibleReview}
    UNION ALL
    SELECT e.id,NULL,NULL,'AGENDA_REMINDER',NULL,e.title,e."createdAt",NULL,
      jsonb_build_object('kind','event','eventId',e."eventId",'date',e."occurrenceDate",'startsAt',e."startsAt")
    FROM jsonb_to_recordset(${events}::jsonb) AS e(id text,title text,"createdAt" timestamptz,"startsAt" timestamptz,"eventId" uuid,"occurrenceDate" text)
  ) projected LEFT JOIN notification_projection_reads r ON r.user_id=$1::uuid AND r.notification_id=projected.id`;
}

export async function setProjectedNotificationRead(tx: Transaction, actor: string, id: string, read: boolean, list: AgendaNoticeSource) {
  const events = await projectedAgendaNotices(tx, actor, list, id);
  const select = `SELECT "classroomId", target-'startsAt' AS target
    FROM (${notificationProjections('$2')}) visible WHERE id=$3::text`;
  let [row] = await tx.query<{ classroomId: string | null; target: ProjectedNotificationTarget }>(select, actor, events, id);
  if (!row) return fail('FORBIDDEN');
  if (row.classroomId) {
    // Pending invitations have no membership until accepted. Serialize against their owning room.
    await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', row.classroomId);
    [row] = await tx.query<typeof row>(select, actor, events, id);
    if (!row) return fail('FORBIDDEN');
  }
  if (row.target.kind === 'study') {
    const changed = await tx.query(`UPDATE study_review_sessions s
      SET read_at=CASE WHEN $3::boolean THEN COALESCE(s.read_at,clock_timestamp()) ELSE NULL END
      WHERE s.id=$2::uuid AND s.owner_id=$1::uuid AND s.cancelled_at IS NULL AND s.notified_at IS NOT NULL
        AND EXISTS (SELECT 1 FROM ${visibleReview} AND s.id=$2::uuid)
      RETURNING s.id`, actor, id.slice(7), read);
    if (!changed.length) return fail('FORBIDDEN');
  } else if (read) {
    await tx.query(`INSERT INTO notification_projection_reads(user_id,notification_id,read_at)
      VALUES ($1::uuid,$2,clock_timestamp()) ON CONFLICT (user_id,notification_id) DO NOTHING RETURNING notification_id`, actor, id);
  } else {
    await tx.query('DELETE FROM notification_projection_reads WHERE user_id=$1::uuid AND notification_id=$2 RETURNING notification_id', actor, id);
  }
  return row.target;
}
