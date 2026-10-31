import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64);
const metadata = { model: 'synthetic-model', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const input = (changes = {}) => ({ requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Hola Foxy',
  selection: { topicIds: [], sourceIds: [] }, ...changes });
const generalSnapshot = () => ({ context: { kind: 'GENERAL' }, curriculum: null, sources: [] });

test('F5A turn repository persists owner-scoped, idempotent turns with revision CAS', { timeout: 120000 }, async t => {
  const api = await import('./index.ts');
  assert.equal(typeof api.createFoxyTurnRepository, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), tx = { query }, conversations = api.createFoxyConversationRepository();
      const create = { requestId: randomUUID(), title: 'Chat sintético', context: { kind: 'GENERAL' } };
      const { conversation } = await conversations.create(tx, f.teacherActor, create, hashA);
      const turns = api.createFoxyTurnRepository();
      await operation({ f, tx, query, conversations, conversation, turns });
    }));

    await check('enqueue creates sequence one and increments revision atomically', async ({ f, tx, conversations, conversation, turns }) => {
      const result = await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      assert.equal(result.created, true); assert.ok(result.turn.id); assert.equal(result.turn.sequence, 1); assert.equal(result.turn.state, 'QUEUED');
      assert.equal(result.conversationRevision, '1');
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '1');
      const read = await turns.get(tx, f.teacherActor, conversation.id, result.turn.id);
      assert.equal(read.id, result.turn.id); assert.equal(read.sequence, 1);
      const items = await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 });
      assert.deepEqual(items.map(item => item.id), [result.turn.id]);
    });

    await check('same request and hash replays before revision CAS; different hash conflicts', async ({ f, tx, conversations, conversation, turns }) => {
      const body = input(), snapshot = generalSnapshot();
      const first = await turns.enqueue(tx, f.teacherActor, conversation.id, body, snapshot, hashA, metadata);
      const replay = await turns.enqueue(tx, f.teacherActor, conversation.id, body, snapshot, hashA, metadata);
      assert.equal(replay.created, false); assert.equal(replay.turn.id, first.turn.id); assert.equal(replay.conversationRevision, '1');
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, body, snapshot, hashB, metadata), { code: 'CONFLICT' });
      assert.equal((await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 })).length, 1);
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '1');
    });

    await check('different request cannot bypass stale revision or existing active turn', async ({ f, tx, conversations, conversation, turns }) => {
      await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashB, metadata), { code: 'CONFLICT' });
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, input({ revision: '1' }), generalSnapshot(), hashB, metadata), { code: 'CONFLICT' });
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '1');
      assert.equal((await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 })).length, 1);
    });

    await check('other owner cannot access or enqueue a turn in the conversation', async ({ f, tx, conversation, turns }) => {
      const result = await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      assert.equal(await turns.get(tx, f.other, conversation.id, result.turn.id), null);
      assert.deepEqual(await turns.list(tx, f.other, conversation.id, { afterSequence: 0, limit: 10 }), []);
      await assert.rejects(turns.enqueue(tx, f.other, conversation.id, input({ revision: '1' }), generalSnapshot(), hashB, metadata),
        error => ['NOT_FOUND', 'FORBIDDEN'].includes(error?.code));
    });

    await check('snapshot must match fixed context and full selection with no partial data', async ({ f, tx, conversations, conversation, turns }) => {
      const wrongContext = { context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id }, curriculum: { units: [], selectedTopicIds: [] }, sources: [] };
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, input(), wrongContext, hashA, metadata));
      const missingSource = input({ selection: { topicIds: [], sourceIds: [`material:${randomUUID()}`] } });
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, missingSource, generalSnapshot(), hashA, metadata));
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '0');
      assert.deepEqual(await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 }), []);
    });

    await check('classroom snapshot cannot omit a selected source or selected topic', async ({ f, tx, conversations, turns }) => {
      const { conversation } = await conversations.create(tx, f.teacherActor,
        { requestId: randomUUID(), title: 'Aula', context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id } }, hashA);
      const first = `activity:${randomUUID()}`, second = `activity:${randomUUID()}`;
      const body = input({ selection: { topicIds: [f.rooms.teach.topic], sourceIds: [first, second] } });
      const source = { sourceId: first, title: 'Actividad', kind: 'ACTIVITY', text: 'Texto', files: [] };
      const partial = { context: conversation.context, curriculum: { units: [], selectedTopicIds: [f.rooms.teach.topic] }, sources: [source] };
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, body, partial, hashA, metadata));
      const missingTopic = { ...partial, curriculum: { units: [], selectedTopicIds: [] }, sources: [source, { ...source, sourceId: second }] };
      await assert.rejects(turns.enqueue(tx, f.teacherActor, conversation.id, body, missingTopic, hashA, metadata));
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '0');
    });

    await check('rollback removes turn and restores conversation revision in same transaction', async ({ f, tx, query, conversations, conversation, turns }) => {
      await query('SAVEPOINT before_turn');
      const result = await turns.enqueue(tx, f.teacherActor, conversation.id, input(), generalSnapshot(), hashA, metadata);
      assert.equal(result.conversationRevision, '1');
      await query('ROLLBACK TO SAVEPOINT before_turn');
      assert.equal((await conversations.get(tx, f.teacherActor, conversation.id)).revision, '0');
      assert.equal(await turns.get(tx, f.teacherActor, conversation.id, result.turn.id), null);
      assert.deepEqual(await turns.list(tx, f.teacherActor, conversation.id, { afterSequence: 0, limit: 10 }), []);
    });
  });
});
