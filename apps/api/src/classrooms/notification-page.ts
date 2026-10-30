import { signPageCursor, readPageCursor } from './signed-page-cursor.ts';
import { fail } from './policy.ts';
import { academicNotificationSelection } from './academic-notifications.ts';
import { gradeNotificationSelection } from './grade-notifications.ts';
import type { Transaction } from './contracts.ts';
import type { NotificationPageQuery } from '../../../../src/core/domain/index.ts';
interface Cursor { v: 1; actor: string; unread: boolean; timestamp: string; id: string }
function sign(key: Buffer, cursor: Cursor) {
  return signPageCursor(key, 'notification-cursor-v1:', cursor);
}
function read(key: Buffer, token: string, actor: string, unread: boolean): Cursor {
  try {
    const value = readPageCursor(key, 'notification-cursor-v1:', token) as Cursor;
    if (value.v !== 1 || value.actor !== actor || value.unread !== unread ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/.test(value.timestamp) ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value.id)) return fail('INVALID_INPUT');
    return value;
  } catch { return fail('INVALID_INPUT'); }
}
export async function notificationPage(tx: Transaction, key: Buffer, actor: string, wallSelection: string, query: NotificationPageQuery = {}) {
  const limit = query.limit ?? 50, unread = query.unread ?? false;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || typeof unread !== 'boolean') return fail('INVALID_INPUT');
  const cursor = query.cursor ? read(key, query.cursor, actor, unread) : undefined;
  const source = [wallSelection, academicNotificationSelection, gradeNotificationSelection].map(selection =>
    `SELECT to_jsonb(v) AS item,v.id,v."createdAt" AS created_at,v."readAt" AS read_at FROM (${selection}) v`).join(' UNION ALL ');
  const cte = `WITH visible AS (${source})`;
  const [total] = await tx.query<{ count: bigint }>(`${cte} SELECT count(*) AS count FROM visible WHERE read_at IS NULL`, actor);
  const rows = await tx.query<{ item: object; id: string; stamp: string }>(`${cte}
    SELECT item,id,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS stamp FROM visible
    WHERE ($2::boolean=false OR read_at IS NULL) AND ($3::timestamptz IS NULL OR created_at<$3::timestamptz OR (created_at=$3::timestamptz AND id>$4::uuid))
    ORDER BY created_at DESC,id ASC LIMIT $5`, actor, unread, cursor?.timestamp ?? null, cursor?.id ?? null, limit + 1);
  const page = rows.slice(0, limit), last = page[page.length - 1];
  return { items: page.map(row => row.item), unreadCount: Number(total.count), nextCursor: rows.length > limit && last
    ? sign(key, { v: 1, actor, unread, timestamp: last.stamp, id: last.id }) : null };
}
