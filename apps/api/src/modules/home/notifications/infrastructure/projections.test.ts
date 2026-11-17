import test from 'node:test';
import assert from 'node:assert/strict';
import { setProjectedNotificationRead } from './notification-projections.ts';
import { readAllVisibleNotifications, notificationPage } from './notification-page.ts';
import { notificationSelection } from './notification-selection.ts';
const id = '11111111-1111-4111-8111-111111111111';

test('projection revocation after classroom lock rejects mutation before marking', async () => {
 const events: string[] = []; let selected = 0;
 const tx = { async query(sql: string, ...args: unknown[]) {
  if (sql.startsWith('SELECT "classroomId", target')) { events.push('select'); assert.deepEqual(args, ['recipient', '[]', 'invite-' + id + '-1']); return ++selected === 1 ? [{ classroomId: 'room', target: { kind: 'invitation', invitationId: id } }] : []; }
  if (sql.includes('FROM classrooms')) { events.push('lock'); assert.deepEqual(args, ['room']); return [{ id: 'room' }]; }
  throw Error('Revoked projection must not mutate state');
 } };
 await assert.rejects(setProjectedNotificationRead(tx as any, 'recipient', 'invite-' + id + '-1', true, async () => []), { code: 'FORBIDDEN' });
 assert.deepEqual(events, ['select', 'lock', 'select']);
});
test('read-all locks visible classrooms in global order before visibility recheck and bulk mutation', async () => {
 const events: string[] = [];
 const tx = { async query(sql: string, ...args: unknown[]) {
  if (sql.startsWith('SELECT statement_timestamp')) { events.push('clock'); return [{ now: new Date('2026-01-01') }]; }
  if (sql.includes('SELECT DISTINCT visible.')) { events.push('rooms'); assert.match(sql, /ORDER BY id/); return [{ id: 'a' }, { id: 'b' }]; }
  if (sql.startsWith('SELECT id FROM classrooms')) { events.push('locks'); assert.match(sql, /ORDER BY id FOR UPDATE/); assert.deepEqual(args, [['a', 'b']]); return []; }
  assert.match(sql, /marked_classroom/); assert.match(sql, /projections AS/); assert.deepEqual(args, ['recipient', '[]', ['a', 'b']]); events.push('recheck-and-mark'); return [{ count: 3n }];
 } };
 assert.deepEqual(await readAllVisibleNotifications(tx as any, 'recipient', notificationSelection, async () => []), { read: true, updatedCount: 3 });
 assert.deepEqual(events, ['clock', 'rooms', 'locks', 'recheck-and-mark']);
});
test('notification cursor binds actor and filters while preserving SQL filtering before limit', async () => {
 const key = Buffer.alloc(32, 4); let queried = 0;
 const tx = { async query(sql: string, ...args: unknown[]) {
  queried++;
  if (sql.includes('SELECT count(*) FILTER')) return [{ count: 2n, total: 4n }];
  assert.match(sql, /\$3::boolean=false OR read_at IS NULL/); assert.match(sql, /\$4::text='all' OR kind=\$4/); assert.deepEqual(args, ['recipient', '[]', true, 'activity', null, null, 2]);
  return [{ item: { id }, id, stamp: '2026-01-01T00:00:00.000000Z' }, { item: { id: 'extra' }, id: 'extra', stamp: '2025-12-31T00:00:00.000000Z' }];
 } };
 const page = await notificationPage(tx as any, key, 'recipient', notificationSelection, { limit: 1, unread: true, kind: 'activity' });
 assert.equal(page.items.length, 1); assert.equal(page.unreadCount, 2); assert.equal(page.totalCount, 4); assert.equal(typeof page.nextCursor, 'string');
 for (const [actor, kind, unread] of [['other', 'activity', true], ['recipient', 'all', true], ['recipient', 'activity', false]] as const) {
  await assert.rejects(notificationPage(tx as any, key, actor, notificationSelection, { cursor: page.nextCursor!, kind, unread }), { code: 'INVALID_INPUT' });
 }
 assert.equal(queried, 2);
});
