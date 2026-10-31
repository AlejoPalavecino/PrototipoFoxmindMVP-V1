import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const input = (changes = {}) => ({ requestId: randomUUID(), title: 'Conversación sintética', context: { kind: 'GENERAL' }, ...changes });
const hashA = 'a'.repeat(64), hashB = 'b'.repeat(64);
const isCode = expected => error => expected.includes(error?.code);

// The helper creates an exclusively owned temporary PostgreSQL container, applies migrations,
// verifies its name ends in _test and rolls each case back. No retained database is used.
test('F2 real repository: idempotency, owner isolation, fixed context and revision CAS', { timeout: 120000 }, async t => {
  const { createFoxyConversationRepository } = await import('./index.ts');
  assert.equal(typeof createFoxyConversationRepository, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const fixture = await homeFixture(query);
      const tx = { query }, repository = createFoxyConversationRepository();
      await operation({ fixture, tx, repository, query });
    }));

    await check('same owner and request/hash replay one conversation; changed hash conflicts', async ({ fixture: f, tx, repository: r }) => {
      const request = input();
      const first = await r.create(tx, f.teacherActor, request, hashA);
      assert.equal(first.created, true); assert.ok(first.conversation.id);
      assert.equal(first.conversation.title, request.title); assert.deepEqual(first.conversation.context, request.context);
      const replay = await r.create(tx, f.teacherActor, request, hashA);
      assert.equal(replay.created, false); assert.equal(replay.conversation.id, first.conversation.id);
      await assert.rejects(r.create(tx, f.teacherActor, request, hashB), isCode(['CONFLICT']));
      const other = await r.create(tx, f.other, request, hashA);
      assert.equal(other.created, true); assert.notEqual(other.conversation.id, first.conversation.id);
    });

    await check('only owner can retrieve, list, rename or remove; revisions detect stale writes', async ({ fixture: f, tx, repository: r }) => {
      const request = input({ context: { kind: 'CLASSROOM', classroomId: f.rooms.teach.id } });
      const { conversation } = await r.create(tx, f.teacherActor, request, hashA);
      const id = conversation.id, revision = conversation.revision;
      assert.deepEqual((await r.get(tx, f.teacherActor, id)).context, request.context);
      assert.equal(await r.get(tx, f.other, id), null);
      assert.equal((await r.list(tx, f.other, { limit: 10 })).some(item => item.id === id), false);
      await assert.rejects(r.rename(tx, f.other, id, revision, 'Ajena'), isCode(['NOT_FOUND']));
      await assert.rejects(r.remove(tx, f.other, id, revision), isCode(['NOT_FOUND']));
      await r.rename(tx, f.teacherActor, id, revision, 'Renombrada');
      const changed = await r.get(tx, f.teacherActor, id);
      assert.equal(changed.title, 'Renombrada'); assert.notEqual(changed.revision, revision);
      assert.deepEqual(changed.context, request.context);
      await assert.rejects(r.rename(tx, f.teacherActor, id, revision, 'Obsoleta'), isCode(['CONFLICT']));
      await assert.rejects(r.remove(tx, f.teacherActor, id, revision), isCode(['CONFLICT']));
      await r.remove(tx, f.teacherActor, id, changed.revision);
      assert.equal(await r.get(tx, f.teacherActor, id), null);
      assert.equal((await r.list(tx, f.teacherActor, { limit: 10 })).some(item => item.id === id), false);
    });

    await check('logical removal retains an owner-bound record', async ({ fixture: f, tx, repository: r, query }) => {
      const { conversation } = await r.create(tx, f.teacherActor, input(), hashA);
      await r.remove(tx, f.teacherActor, conversation.id, conversation.revision);
      const rows = await query('SELECT owner_id, deleted_at FROM foxy_conversations WHERE id=$1::uuid', conversation.id);
      assert.equal(rows.length, 1); assert.equal(rows[0].owner_id, f.teacherActor); assert.ok(rows[0].deleted_at);
    });

    await check('classroom belongs to conversation owner', async ({ fixture: f, tx, repository: r }) => {
      const foreign = input({ context: { kind: 'CLASSROOM', classroomId: f.rooms.foreign.id } });
      await assert.rejects(r.create(tx, f.teacherActor, foreign, hashA), isCode(['NOT_FOUND', 'FORBIDDEN', 'INVALID_INPUT', '23503']));
    });
  });
});
