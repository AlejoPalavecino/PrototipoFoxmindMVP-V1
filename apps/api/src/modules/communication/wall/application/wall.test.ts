import test from 'node:test';
import assert from 'node:assert/strict';
import { WallService } from './wall.ts';
const id = '11111111-1111-4111-8111-111111111111';
function fixture(revision = 1n, author = 'actor') {
 const tx = {}, events: string[] = [];
 const context = { run: async (_: unknown, write: boolean, action: Function) => { assert.equal(write, true); return action(tx, { id: 'actor' }); },
  classroom: async (seen: unknown, _actor: unknown, classroomId: string, write: boolean) => { assert.equal(seen, tx); assert.equal(classroomId, 'room'); assert.equal(write, true); events.push('classroom-lock'); return { revision, teacher_id: 'teacher' }; } };
 const repository = { createPost: async (seen: unknown, input: unknown) => { assert.equal(seen, tx); assert.deepEqual(input, { postId: id, classroomId: 'room', authorId: 'actor', type: 'QUERY', body: 'Question', title: null }); events.push('post'); },
  createWallNotifications: async (seen: unknown, input: unknown) => { assert.equal(seen, tx); assert.deepEqual(input, { classroomId: 'room', event: 'WALL_QUERY', postId: id, replyId: null, actorId: 'actor', recipientId: 'teacher', teacherId: 'teacher' }); events.push('notify'); },
  lockTarget: async (seen: unknown, input: unknown) => { assert.equal(seen, tx); assert.deepEqual(input, { target: 'post', id, classroomId: 'room' }); events.push('target-lock'); return [{ id, author_id: author, removed_at: null }]; },
  editContent: async () => events.push('edit') };
 const advanceRevision = async (seen: unknown, classroomId: string, previous: bigint) => { assert.equal(seen, tx); assert.equal(classroomId, 'room'); assert.equal(previous, 1n); events.push('revision'); return { revision: '2' }; };
 return { events, service: new WallService(context as any, { advanceRevision }, repository as any, {} as any, () => id) };
}
test('wall publishes and creates notification before revision in the same academic transaction', async () => {
 const f = fixture(); assert.deepEqual(await f.service.changeWall({}, 'room', { revision: '1', operation: { action: 'publish', body: 'Question' } }), { revision: '2' });
 assert.deepEqual(f.events, ['classroom-lock', 'post', 'notify', 'revision']);
});
test('stale wall revision prevents post and notification writes', async () => {
 const f = fixture(2n); await assert.rejects(f.service.changeWall({}, 'room', { revision: '1', operation: { action: 'publish', body: 'Question' } }), { code: 'CONFLICT' }); assert.deepEqual(f.events, ['classroom-lock']);
});
test('editing another author is forbidden before persistence or revision', async () => {
 const f = fixture(1n, 'other'); await assert.rejects(f.service.changeWall({}, 'room', { revision: '1', operation: { action: 'editPost', id, body: 'Edit' } }), { code: 'FORBIDDEN' });
 assert.deepEqual(f.events, ['classroom-lock', 'target-lock']);
});

import type { WallRepository } from './wall-repository.ts';
import type { Transaction } from '../../../classrooms/public.ts';
function verifyWallTypes(repository: WallRepository, tx: Transaction) {
 repository.lockTarget(tx, { target: 'post', id, classroomId: 'room' });
 // @ts-expect-error SQL fragments cannot select a persistence target.
 repository.lockTarget(tx, { target: 'wall_posts; DROP TABLE notifications', id, classroomId: 'room' });
 // @ts-expect-error Callers cannot choose the target row type.
 repository.lockTarget<{ secret: string }>(tx, { target: 'post', id, classroomId: 'room' });
 // @ts-expect-error The inbox has no persistence API on WallRepository.
 repository.setRead(tx, { notificationId: id, read: true });
}
void verifyWallTypes;
