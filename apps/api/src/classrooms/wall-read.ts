import type { Actor, Transaction } from './contracts.ts';
import { fail } from './policy.ts';
import { readWallCursor, signWallCursor, type WallPosition } from './wall-cursor.ts';
import type { WallPageQuery } from '../../../../src/core/domain/index.ts';

type Room = { revision: bigint; teacher_id: string; archived_at: Date | null };
interface Row {
  title?: string | null; id: string; author_id: string; body: string | null; createdAt: Date; editedAt: Date | null; removedAt: Date | null;
  authorName: string; first_name: string; last_name: string; type?: 'NOTICE' | 'QUERY'; stamp: string;
}
const fields = `x.id,x.author_id,x.body,x.created_at AS "createdAt",x.edited_at AS "editedAt",x.removed_at AS "removedAt",
 concat(u.first_name,' ',u.last_name) AS "authorName",u.first_name,u.last_name,
 to_char(x.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS stamp`;
const position = (row: Row): WallPosition => ({ timestamp: row.stamp, id: row.id });
function view(row: Row, room: Room, actor: Actor) {
  return { id: row.id, authorName: row.authorName,
    initials: [row.first_name, row.last_name].map(name => [...name.trim()][0] ?? '').join('').toLocaleUpperCase(),
    body: row.removedAt ? null : row.body, createdAt: row.createdAt, editedAt: row.editedAt, removedAt: row.removedAt,
    canEdit: !room.archived_at && !row.removedAt && row.author_id === actor.id,
    canRemove: !room.archived_at && !row.removedAt && (row.author_id === actor.id || room.teacher_id === actor.id) };
}
function token(key: Buffer, room: string, post: string, direction: 'before' | 'after', row: Row) {
  return signWallCursor(key, { v: 1, kind: 'replies', room, post, direction, position: position(row) });
}
export async function repliesPage(tx: Transaction, actor: Actor, room: Room, key: Buffer, classroomId: string, postId: string, query: WallPageQuery = {}, anchor?: string) {
  const cursor = query.cursor ? readWallCursor(key, query.cursor, 'replies', classroomId, postId) : undefined;
  const limit = query.limit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) return fail('INVALID_INPUT');
  let pos = cursor?.position;
  if (anchor) {
    const [target] = await tx.query<Row>(`SELECT ${fields} FROM wall_replies x JOIN users u ON u.id=x.author_id
      WHERE x.classroom_id=$1::uuid AND x.post_id=$2::uuid AND x.id=$3::uuid`, classroomId, postId, anchor);
    if (!target) return fail('FORBIDDEN');
    pos = position(target);
  }
  const before = cursor?.direction === 'before';
  const comparator = before ? '<' : anchor ? '>=' : '>';
  const rows = await tx.query<Row>(`SELECT ${fields} FROM wall_replies x JOIN users u ON u.id=x.author_id
    WHERE x.classroom_id=$1::uuid AND x.post_id=$2::uuid AND ($3::timestamptz IS NULL OR (x.created_at,x.id) ${comparator} ($3::timestamptz,$4::uuid))
    ORDER BY x.created_at ${before ? 'DESC' : 'ASC'},x.id ${before ? 'DESC' : 'ASC'} LIMIT $5`, classroomId, postId, pos?.timestamp ?? null, pos?.id ?? null, limit + 1);
  const extra = rows.length > limit; const page = rows.slice(0, limit); if (before) page.reverse();
  const first = page[0], last = page[page.length - 1];
  let hasPrevious = before ? extra : !!pos;
  if (anchor && first) {
    const [result] = await tx.query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM wall_replies
      WHERE classroom_id=$1::uuid AND post_id=$2::uuid AND (created_at,id)<($3::timestamptz,$4::uuid)) AS exists`,
      classroomId, postId, first.stamp, first.id);
    hasPrevious = result.exists;
  }
  return { revision: room.revision.toString(), postId, replies: page.map(row => view(row, room, actor)),
    previousCursor: first && hasPrevious ? token(key, classroomId, postId, 'before', first) : null,
    nextCursor: last && (before ? !!pos : extra) ? token(key, classroomId, postId, 'after', last) : null };
}
export async function postView(tx: Transaction, actor: Actor, room: Room, key: Buffer, classroomId: string, row: Row, anchor?: string) {
  const [count] = await tx.query<{ count: bigint }>('SELECT count(*) AS count FROM wall_replies WHERE classroom_id=$1::uuid AND post_id=$2::uuid', classroomId, row.id);
  const page = await repliesPage(tx, actor, room, key, classroomId, row.id, { limit: anchor ? 20 : 2 }, anchor);
  return { ...view(row, room, actor), title: row.removedAt ? null : row.title ?? null, type: row.type, replies: page.replies, replyCount: Number(count.count),
    repliesNextCursor: page.nextCursor, repliesPreviousCursor: page.previousCursor };
}
export async function feed(tx: Transaction, actor: Actor, room: Room, key: Buffer, classroomId: string, query: WallPageQuery = {}) {
  const limit = query.limit ?? 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) return fail('INVALID_INPUT');
  const cursor = query.cursor ? readWallCursor(key, query.cursor, 'feed', classroomId) : undefined;
  if (query.type!==undefined && query.type!=='NOTICE' && query.type!=='QUERY')return fail('INVALID_INPUT');
  if (cursor && cursor.filter!==query.type)return fail('INVALID_INPUT');
  const rows = await tx.query<Row>(`SELECT ${fields},x.type,x.title FROM wall_posts x JOIN users u ON u.id=x.author_id
    WHERE x.classroom_id=$1::uuid AND ($2::timestamptz IS NULL OR x.created_at < $2::timestamptz OR (x.created_at=$2::timestamptz AND x.id>$3::uuid))
    AND ($4::timestamptz IS NULL OR x.created_at < $4::timestamptz OR (x.created_at=$4::timestamptz AND x.id >= $5::uuid))
    AND ($7::text IS NULL OR x.type::text=$7)
    ORDER BY x.created_at DESC,x.id ASC LIMIT $6`, classroomId, cursor?.position.timestamp ?? null, cursor?.position.id ?? null,
    cursor?.high?.timestamp ?? null, cursor?.high?.id ?? null, limit + 1,query.type??null);
  const page = rows.slice(0, limit), high = cursor?.high ?? (page[0] ? position(page[0]) : undefined), last = page[page.length - 1];
  const posts = []; for (const row of page) posts.push(await postView(tx, actor, room, key, classroomId, row));
  return { revision: room.revision.toString(), posts, nextCursor: rows.length > limit && last && high
    ? signWallCursor(key, { v: 1, kind: 'feed', room: classroomId, direction: 'after', position: position(last), high,filter:query.type }) : null };
}
export async function thread(tx: Transaction, actor: Actor, room: Room, key: Buffer, classroomId: string, postId: string, anchor?: string) {
  const [row] = await tx.query<Row>(`SELECT ${fields},x.type,x.title FROM wall_posts x JOIN users u ON u.id=x.author_id
    WHERE x.classroom_id=$1::uuid AND x.id=$2::uuid`, classroomId, postId);
  if (!row) return fail('FORBIDDEN');
  return { revision: room.revision.toString(), post: await postView(tx, actor, room, key, classroomId, row, anchor) };
}
