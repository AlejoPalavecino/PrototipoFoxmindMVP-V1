import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const input = (context = { kind: 'GENERAL' }) => ({ requestId: randomUUID(), title: 'Conversación', context });
const isCode = (...codes) => error => codes.includes(error?.code);
const visible = value => { assert.deepEqual(Object.keys(value).sort(), ['context','id','revision','title']); };
async function setup(pool) {
  const api = await import('./index.ts'); assert.equal(typeof api.createFoxyConversationService, 'function');
  const query = async (sql, ...args) => (await pool.query(sql, args)).rows, f = await homeFixture(query);
  const database = transactionDatabase(pool), authenticate = async (_tx, request) => {
    if (request.revoked) throw Object.assign(Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' }); return request.id;
  };
  const uow = api.createFoxyUnitOfWork({ database, authenticate });
  const service = api.createFoxyConversationService({ uow, conversations: api.createFoxyConversationRepository() });
  return { f, service, query, owner: { id: f.teacherActor }, other: { id: f.other }, student: { id: f.pupil } };
}

test('conversation service creates general context idempotently and returns only public fields', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const { service, owner } = await setup(pool), request = input();
    const first = await service.create(owner, request); assert.equal(first.created, true); visible(first.conversation);
    const replay = await service.create(owner, { context: { kind: 'GENERAL' }, title: request.title, requestId: request.requestId });
    assert.equal(replay.created, false); assert.equal(replay.conversation.id, first.conversation.id);
    await assert.rejects(service.create(owner, { ...request, title: 'Distinto' }), isCode('CONFLICT'));
    const view = await service.get(owner, first.conversation.id); visible(view); assert.deepEqual(view.context, request.context);
    assert.ok((await service.list(owner, { limit: 20 })).items.some(c => c.id === view.id));
  });
});

test('classroom context requires an active classroom owned by the teacher', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { f, service, owner, student } = await setup(pool);
    const created = await service.create(owner, input({ kind: 'CLASSROOM', classroomId: f.rooms.teach.id }));
    assert.deepEqual(created.conversation.context, { kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
    for (const classroomId of [f.rooms.foreign.id, f.rooms.archived.id, randomUUID()])
      await assert.rejects(service.create(owner, input({ kind: 'CLASSROOM', classroomId })), isCode('FORBIDDEN', 'NOT_FOUND', 'CONFLICT'));
    await assert.rejects(service.create(student, input()), isCode('FORBIDDEN'));
    await assert.rejects(service.create({ ...owner, revoked: true }, input()), isCode('AUTH_REQUIRED', 'FORBIDDEN'));
  });
});

test('owner isolation, revision CAS, and confirmed logical deletion', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, other } = await setup(pool);
    const { conversation: c } = await service.create(owner, input());
    await assert.rejects(service.get(other, c.id), isCode('NOT_FOUND', 'FORBIDDEN'));
    assert.equal((await service.list(other, { limit: 20 })).items.some(item => item.id === c.id), false);
    await assert.rejects(service.rename(other, c.id, { revision: c.revision, title: 'Ajena' }), isCode('NOT_FOUND', 'FORBIDDEN'));
    const renamed = await service.rename(owner, c.id, { revision: c.revision, title: 'Nueva' }); visible(renamed);
    assert.equal(renamed.title, 'Nueva'); assert.notEqual(renamed.revision, c.revision);
    await assert.rejects(service.rename(owner, c.id, { revision: c.revision, title: 'Obsoleta' }), isCode('CONFLICT'));
    await assert.rejects(service.remove(owner, c.id, { revision: renamed.revision, confirm: false }), isCode('INVALID_INPUT'));
    assert.equal((await service.get(owner, c.id)).title, 'Nueva');
    await service.remove(owner, c.id, { revision: renamed.revision, confirm: true });
    await assert.rejects(service.get(owner, c.id), isCode('NOT_FOUND', 'FORBIDDEN'));
  });
});

test('conversation pages use stable millisecond timestamp and ID cursors without cross-owner leakage', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, other, query } = await setup(pool), own = [];
    for (let i = 0; i < 5; i++) own.push((await service.create(owner, input())).conversation.id);
    const foreign = (await service.create(other, input())).conversation.id;
    for (let i = 0; i < own.length; i++) await query(`UPDATE foxy_conversations SET updated_at=$2::timestamptz WHERE id=$1::uuid`,
      own[i], i < 4 ? '2026-01-01T00:00:00.123456Z' : '2026-01-01T00:00:00.122999Z');
    const found = []; let after = null;
    for (let page = 0; page < 4; page++) {
      const result = await service.list(owner, { limit: 2, after });
      assert.ok(Array.isArray(result.items)); assert.ok(result.items.length <= 2);
      for (const item of result.items) { visible(item); found.push(item.id); }
      after = result.next; if (after === null) break;
      assert.match(after.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u);
      assert.ok(own.includes(after.id));
    }
    assert.equal(after, null); assert.equal(found.length, 5); assert.equal(new Set(found).size, 5);
    assert.deepEqual(new Set(found), new Set(own)); assert.equal(found.includes(foreign), false);
    assert.deepEqual(found.slice(0, 4), own.slice(0, 4).sort().reverse());
    for (const bad of [{ updatedAt: '2026-02-30T00:00:00.000Z', id: own[0] },
      { updatedAt: '2026-01-01T00:00:00Z', id: own[0] }, { updatedAt: '2026-01-01T00:00:00.000Z', id: 'bad' },
      { updatedAt: '2026-01-01T00:00:00.000Z', id: own[0], extra: true }])
      await assert.rejects(service.list(owner, { limit: 2, after: bad }), isCode('INVALID_INPUT'));
  });
});

test('idempotent classroom creation replays after archive without resurrecting a deleted conversation', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, f, query } = await setup(pool);
    const request = input({ kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
    const first = await service.create(owner, request);
    await query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid', f.rooms.teach.id);
    const replay = await service.create(owner, request);
    assert.equal(replay.created, false); assert.equal(replay.conversation.id, first.conversation.id);
    await assert.rejects(service.create(owner, input(request.context)), isCode('FORBIDDEN', 'NOT_FOUND', 'CONFLICT'));
    const [count] = await query('SELECT count(*)::int AS n FROM foxy_conversations WHERE owner_id=$1::uuid', f.teacherActor);
    assert.equal(count.n, 1);
    await service.remove(owner, first.conversation.id, { revision: first.conversation.revision, confirm: true });
    await assert.rejects(service.create(owner, request), isCode('CONFLICT', 'NOT_FOUND', 'FORBIDDEN'));
    const [deleted] = await query('SELECT deleted_at FROM foxy_conversations WHERE id=$1::uuid', first.conversation.id);
    assert.ok(deleted.deleted_at);
  });
});
