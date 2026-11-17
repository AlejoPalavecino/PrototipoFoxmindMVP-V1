import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Wall exposes conversation operations without inbox responsibilities', () => {
 const wall = readFileSync('apps/api/src/modules/communication/wall/application/wall.ts', 'utf8');
 const read = readFileSync('apps/api/src/modules/communication/wall/application/read-ports.ts', 'utf8');
 assert.doesNotMatch(wall, /listNotifications|openNotification|notificationAction/);
 assert.doesNotMatch(read, /legacyNotifications|notificationPage|ProjectedNotification/);
});


import { NotificationInboxService } from './inbox.ts';
const id = '11111111-1111-4111-8111-111111111111';
function fixture(kind: 'wall' | 'academic' | 'grade' | 'revoked' | 'foreign' = 'wall') {
 const tx = {}, events: string[] = [], now = new Date('2026-01-01');
 const records = { wall: { id, classroomId: 'room', postId: 'post', replyId: null },
  academic: { id, classroomId: 'room', activityId: 'activity', attemptId: 'attempt', eventType: 'SUBMISSION_RECEIVED' },
  grade: { id, classroomId: 'room', activityId: 'activity', attemptId: 'attempt', gradeId: 'grade', eventType: 'GRADE_PUBLISHED' } };
 const check = (seen: unknown) => assert.equal(seen, tx);
 const context = { run: async (_request: unknown, write: boolean, action: Function) => { events.push(write ? 'write' : 'read'); return action(tx, { id: 'recipient', now }); },
  classroom: async (seen: unknown, actor: { id: string }, classroom: string) => { check(seen); assert.equal(actor.id, 'recipient'); assert.equal(classroom, 'room'); events.push('classroom-lock'); } };
 const repository = { findRecipientClassroom: async (seen: unknown, input: unknown) => { check(seen); assert.deepEqual(input, { notificationId: id, actorId: 'recipient' }); events.push('recipient'); return kind === 'foreign' ? [] : [{ classroom_id: 'room' }]; },
  lockWallNotification: async (seen: unknown) => { check(seen); events.push('wall'); return kind === 'wall' ? [records.wall] : []; },
  lockAcademicNotification: async (seen: unknown) => { check(seen); events.push('academic'); return kind === 'academic' ? [records.academic] : []; },
  lockGradeNotification: async (seen: unknown) => { check(seen); events.push('grade'); return kind === 'grade' ? [records.grade] : []; },
  setRead: async (seen: unknown, input: unknown) => { check(seen); events.push('mark'); assert.deepEqual(input, { notificationId: id, read: true }); } };
 const read = { setProjectedNotificationRead: async (seen: unknown, input: { actorId: string; id: string; read: boolean }) => { check(seen); assert.equal(input.actorId, 'recipient'); assert.equal(input.id, input.id.toLowerCase()); events.push('projection'); return { kind: 'invitation', invitationId: id }; },
  legacyNotifications: async (seen: unknown, input: unknown) => { check(seen); assert.deepEqual(input, { actorId: 'recipient' }); return []; },
  notificationPage: async (seen: unknown, input: unknown) => { check(seen); assert.deepEqual(input, { actorId: 'recipient', query: { unread: true } }); return { items: [], nextCursor: null, unreadCount: 0 }; },
  readAllVisibleNotifications: async (seen: unknown, input: unknown) => { check(seen); assert.deepEqual(input, { actorId: 'recipient' }); return { read: true, updatedCount: 2 }; } };
 return { service: new NotificationInboxService(context as any, repository as any, read as any), events };
}
test('inbox recipient discovery precedes classroom lock, reauthorization and mark', async () => {
 const f = fixture(); assert.deepEqual(await f.service.openNotification({}, id), { classroomId: 'room', postId: 'post', replyId: null });
 assert.deepEqual(f.events, ['write', 'recipient', 'classroom-lock', 'wall', 'mark']);
});
test('inbox academic and grade opening preserve authoritative targets', async () => {
 for (const kind of ['academic', 'grade'] as const) {
  const f = fixture(kind); const target = await f.service.openNotification({}, id);
  assert.deepEqual(target, kind === 'academic' ? { kind: 'submission', classroomId: 'room', activityId: 'activity', attemptId: 'attempt' }
   : { kind: 'grade', classroomId: 'room', activityId: 'activity', attemptId: 'attempt', gradeId: 'grade' });
  assert.deepEqual(f.events, ['write', 'recipient', 'classroom-lock', 'wall', 'academic', ...(kind === 'grade' ? ['grade'] : []), 'mark']);
 }
});
test('foreign recipients and revoked targets are rejected before marking', async () => {
 for (const kind of ['foreign', 'revoked'] as const) {
  const f = fixture(kind); await assert.rejects(f.service.readNotification({}, id), { code: 'FORBIDDEN' });
  assert.equal(f.events.includes('mark'), false);
  assert.equal(f.events.includes('classroom-lock'), kind !== 'foreign');
 }
});
test('projected IDs use their reauthorizing port without persisted-wall queries', async () => {
 const f = fixture(); const projected = 'invite-' + id.toUpperCase() + '-1';
 assert.deepEqual(await f.service.openNotification({}, projected), { kind: 'invitation', invitationId: id });
 assert.deepEqual(f.events, ['write', 'projection']);
});
test('list keeps read transaction and read-all keeps write transaction and actor', async () => {
 const f = fixture(); assert.deepEqual(await f.service.listNotifications({}), []);
 await f.service.listNotificationPage({}, { unread: true });
 assert.deepEqual(await f.service.readAllNotifications({}), { read: true, updatedCount: 2 });
 assert.deepEqual(f.events, ['read', 'read', 'write']);
});
test('invalid notification IDs fail before opening a transaction', () => {
 const f = fixture(); assert.throws(() => f.service.openNotification({}, 'invalid'), { code: 'FORBIDDEN' }); assert.deepEqual(f.events, []);
});


import type { NotificationInboxRepository } from './notification-repository.ts';
import type { Transaction } from '../../../classrooms/public.ts';
function verifyInboxTypes(repository: NotificationInboxRepository, tx: Transaction) {
 repository.findRecipientClassroom(tx, { notificationId: id, actorId: 'recipient' });
 // @ts-expect-error Recipient scoping cannot be omitted.
 repository.findRecipientClassroom(tx, { notificationId: id });
 // @ts-expect-error Callers cannot choose notification result types.
 repository.lockWallNotification<{ secret: string }>(tx, { notificationId: id, actorId: 'recipient' });
 // @ts-expect-error Wall production is not an inbox responsibility.
 repository.createWallNotifications(tx, {});
}
void verifyInboxTypes;
