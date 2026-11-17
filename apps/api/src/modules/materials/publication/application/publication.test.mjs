import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaterialPublisher } from './library-publication.ts';

const actorId = '11111111-1111-4111-8111-111111111111';
const classroomId = '22222222-2222-4222-8222-222222222222';
const fileId = '33333333-3333-4333-8333-333333333333';
const input = { classroomId, fileId, revision: '2', title: 'Material sintético', unitId: null, topicId: null };

test('publication authorizes file, inserts material and advances classroom revision in the same transaction', async () => {
  const tx = {}, request = {}, calls = [];
  const dependencies = {
    fileId,
    async readyClassroomFile(transaction, actorRequest, room, file, purpose) {
      assert.equal(this, dependencies); assert.equal(transaction, tx); assert.equal(actorRequest, request);
      assert.deepEqual([room, file, purpose], [classroomId, fileId, 'material']);
      calls.push('ready'); return { id: this.fileId, blob_deleted_at: null };
    },
    async advanceRevision(transaction, room, revision) {
      assert.equal(transaction, tx); assert.equal(room, classroomId); assert.equal(revision, 2n);
      calls.push('revision'); return { revision: '3' };
    },
  };
  const repository = {
    async classroom(transaction, room, actor) {
      assert.equal(transaction, tx); assert.deepEqual([room, actor], [classroomId, actorId]);
      calls.push('classroom'); return { revision: 2n };
    },
    async linked(transaction, file) {
      assert.equal(transaction, tx); assert.equal(file, fileId); calls.push('linked'); return false;
    },
    async insert(transaction, material, value, title, file, actor) {
      assert.equal(transaction, tx); assert.deepEqual([material, title, file, actor], ['material', input.title, fileId, actorId]);
      assert.deepEqual(value, input); calls.push('insert');
    },
  };
  assert.deepEqual(await createMaterialPublisher(dependencies, repository, () => 'material').publish(tx, request, actorId, input),
    { materialId: 'material', classroomRevision: '3' });
  assert.deepEqual(calls, ['classroom', 'ready', 'linked', 'insert', 'revision']);
});

test('publication rejects stale revision before file access or mutation', async () => {
  const dependencies = { readyClassroomFile: async () => { throw Error('unexpected file access'); } };
  const repository = { classroom: async () => ({ revision: 3n }) };
  await assert.rejects(createMaterialPublisher(dependencies, repository, () => 'material').publish({}, {}, actorId, input), { code: 'CONFLICT' });
});
