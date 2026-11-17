import { signPageCursor, readPageCursor } from '../../../../platform/pagination/signed-page-cursor.ts';
import { fail, type Transaction } from '../../../classrooms/public.ts';
import { academicNotificationSelection } from './academic-notifications.ts';
import { gradeNotificationSelection } from './grade-notifications.ts';
import { notificationProjections, projectedAgendaNotices, type AgendaNoticeSource } from './notification-projections.ts';
import { isProjectedNotificationId, NOTIFICATION_KINDS } from '../../../../../../../src/core/domain/home/notifications.ts';
import type { ClassroomNotification, InboxNotification, NotificationKind, NotificationPageQuery } from '../../../../../../../src/core/domain/home/notifications.ts';

interface Cursor { v: 2; actor: string; unread: boolean; kind: NotificationKind; timestamp: string; id: string }
const purpose = 'notification-cursor-v1:';
function read(key: Buffer, token: string, actor: string, unread: boolean, kind: NotificationKind): Cursor {
  try {
    const value = readPageCursor(key, purpose, token, fail) as Cursor;
    if (value.v !== 2 || value.actor !== actor || value.unread !== unread || value.kind !== kind ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value.timestamp) ||
      !(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.id) || isProjectedNotificationId(value.id))) return fail('INVALID_INPUT');
    return value;
  } catch { return fail('INVALID_INPUT'); }
}
function liveSelections(wallSelection: string) {
  return [wallSelection, academicNotificationSelection, gradeNotificationSelection];
}
/** The original collection endpoint keeps its classroom-only contract. */
export async function legacyNotifications(tx: Transaction, actor: string, wallSelection: string) {
  const source = liveSelections(wallSelection).map(selection =>
    `SELECT to_jsonb(v) AS item,v.id,v."createdAt" FROM (${selection}) v`).join(' UNION ALL ');
  const rows = await tx.query<{ item: ClassroomNotification }>(`SELECT item FROM (${source}) visible
    ORDER BY "createdAt" DESC,id ASC LIMIT 50`, actor);
  return rows.map(row => row.item);
}

export async function notificationPage(tx: Transaction, key: Buffer, actor: string, wallSelection: string, query: NotificationPageQuery = {}, listAgendaNotices?: AgendaNoticeSource) {
  const limit = query.limit ?? 50, unread = query.unread ?? false, kind = query.kind ?? 'all';
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || typeof unread !== 'boolean' ||
    !NOTIFICATION_KINDS.includes(kind)) return fail('INVALID_INPUT');
  const cursor = query.cursor ? read(key, query.cursor, actor, unread, kind) : undefined;
  const source = liveSelections(wallSelection).map((selection, index) =>
    `SELECT to_jsonb(v) AS item,v.id::text,v."createdAt" AS created_at,v."readAt" AS read_at,
      '${index === 0 ? 'classroom' : 'activity'}' AS kind FROM (${selection}) v`).join(' UNION ALL ');
  const events = listAgendaNotices ? await projectedAgendaNotices(tx, actor, listAgendaNotices) : '[]';
  const cte = `WITH visible AS (${source}
      UNION ALL SELECT (to_jsonb(p)-'target'-'sourceReadAt') ||
        CASE WHEN p.target ? 'startsAt' THEN jsonb_build_object('startsAt',p.target->'startsAt') ELSE '{}'::jsonb END,
        p.id,p."createdAt",p."readAt",CASE WHEN p."classroomId" IS NULL THEN 'agenda' ELSE 'classroom' END
        FROM (${notificationProjections('$2')}) p)`;
  const [summary] = await tx.query<{ count: bigint; total: bigint }>(`${cte}
    SELECT count(*) FILTER (WHERE read_at IS NULL) AS count, count(*) AS total FROM visible`, actor, events);
  const rows = await tx.query<{ item: InboxNotification; id: string; stamp: string }>(`${cte}
    SELECT item,id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS stamp FROM visible
    WHERE ($3::boolean=false OR read_at IS NULL) AND ($4::text='all' OR kind=$4)
      AND ($5::timestamptz IS NULL OR created_at<$5 OR (created_at=$5 AND id>$6::text))
    ORDER BY created_at DESC,id ASC LIMIT $7`, actor, events, unread, kind, cursor?.timestamp ?? null, cursor?.id ?? null, limit + 1);
  const page = rows.slice(0, limit), last = page[page.length - 1];
  return { items: page.map(row => row.item), totalCount: Number(summary.total ?? summary.count), unreadCount: Number(summary.count),
    nextCursor: rows.length > limit && last
    ? signPageCursor(key, purpose, { v: 2, actor, unread, kind, timestamp: last.stamp, id: last.id }) : null };
}

export async function readAllVisibleNotifications(tx: Transaction, actor: string, wallSelection: string, listAgendaNotices: AgendaNoticeSource) {
  const visible = liveSelections(wallSelection).map(selection =>
    `SELECT v.id::text,v."classroomId",v."readAt" FROM (${selection}) v`).join(' UNION ALL ');
  const events = await projectedAgendaNotices(tx, actor, listAgendaNotices);
  const projected = notificationProjections('$2');
  const rooms = await tx.query<{ id: string }>(`WITH visible AS (${visible}
    UNION ALL SELECT id,"classroomId","readAt" FROM (${projected}) p)
    SELECT DISTINCT visible."classroomId" AS id FROM visible
    WHERE "readAt" IS NULL AND "classroomId" IS NOT NULL ORDER BY id`, actor, events);
  const ids = rooms.map(room => room.id);
  // Global room order matches membership and individual mutations; recheck visibility after locks.
  if (ids.length) await tx.query('SELECT id FROM classrooms WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', ids);
  const [{ count }] = await tx.query<{ count: bigint }>(`WITH visible AS (${visible}),
    projections AS (SELECT * FROM (${projected}) p WHERE p."readAt" IS NULL
      AND (p."classroomId" IS NULL OR p."classroomId"=ANY($3::uuid[]))),
    marked_classroom AS (
      UPDATE notifications n SET read_at=clock_timestamp(),updated_at=clock_timestamp()
      FROM visible v WHERE n.id::text=v.id AND n.recipient_id=$1::uuid AND n.read_at IS NULL
        AND n.classroom_id=ANY($3::uuid[]) RETURNING n.id
    ), marked_review AS (
      UPDATE study_review_sessions s SET read_at=clock_timestamp() FROM projections p
      WHERE p.id='review-'||s.id AND s.owner_id=$1::uuid AND s.read_at IS NULL
        AND s.cancelled_at IS NULL AND s.notified_at IS NOT NULL RETURNING s.id
    ), marked_projected AS (
      INSERT INTO notification_projection_reads(user_id,notification_id,read_at)
      SELECT $1::uuid,id,clock_timestamp() FROM projections WHERE "eventType"<>'STUDY_REVIEW_REMINDER'
      ON CONFLICT (user_id,notification_id) DO NOTHING RETURNING notification_id
    )
    SELECT (SELECT count(*) FROM marked_classroom)+(SELECT count(*) FROM marked_review)
      +(SELECT count(*) FROM marked_projected) AS count`, actor, events, ids);
  return { read: true, updatedCount: Number(count) };
}
