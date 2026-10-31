import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const teacher = randomUUID(), other = randomUUID(), conversationId = randomUUID(), classroomId = randomUUID();
const general = { kind: 'GENERAL' }, classroom = { kind: 'CLASSROOM', classroomId };
const forbidden = error => error?.code === 'FORBIDDEN';
const unitsFixture = () => [
  { id: randomUUID(), name: 'Unidad uno', position: 0, topics: [
    { id: randomUUID(), name: 'Ya enseñado', position: 0, status: 'TAUGHT' },
    { id: randomUUID(), name: 'Próximo', position: 1, status: 'NEXT' },
    { id: randomUUID(), name: 'Pendiente', position: 2, status: 'PENDING' }] },
  { id: randomUUID(), name: 'Unidad dos', position: 1, topics: [] }
];
function makeFake({ role = 'teacher', scope = classroom, owner = teacher, roomOwner = teacher,
  archived = false, deleted = false, units = unitsFixture() } = {}) {
  const calls = [], actor = { id: teacher, account_role: role }, request = { syntheticSession: true };
  const tx = { query: async (sql, ...params) => {
    calls.push({ operation: 'query', sql, params });
    if (/\bFROM\s+units\b/i.test(sql)) return units;
    if (/\bFROM\s+topics\b/i.test(sql)) return units.flatMap(u => u.topics.map(t => ({ ...t, unit_id: u.id })));
    throw new Error('Unexpected SQL');
  } };
  const context = {
    run: async (actualRequest, write, operation) => {
      calls.push({ operation: 'run', request: actualRequest, write });
      return operation(tx, actor);
    },
    classroom: async (actualTx, actualActor, id, write, mustBeTeacher) => {
      calls.push({ operation: 'classroom', tx: actualTx, actor: actualActor, id, write, mustBeTeacher });
      if (id !== classroomId || actor.id !== roomOwner || mustBeTeacher !== true) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
      return { id, teacher_id: roomOwner, name: 'Aula sintética', revision: 7n, archived_at: archived ? new Date('2026-01-01') : null };
    }
  };
  const conversations = { get: async (actualTx, actualOwner, id) => {
    calls.push({ operation: 'conversation', tx: actualTx, owner: actualOwner, id });
    return actualOwner === owner && id === conversationId && !deleted
      ? { id, ownerId: owner, context: scope, revision: '0', title: 'Sintética' } : null;
  } };
  return { context, conversations, calls, request, tx, actor, units };
}

async function makeService(fake) {
  const { FoxyContextCatalogService } = await import('./index.ts');
  assert.equal(typeof FoxyContextCatalogService, 'function');
  return new FoxyContextCatalogService(fake.context, fake.conversations);
}

test('general context returns empty curriculum and performs no classroom or plan query', async () => {
  const f = makeFake({ scope: general }), service = await makeService(f);
  const result = await service.curriculum(f.request, conversationId);
  assert.deepEqual(result.context, general); assert.deepEqual(result.units, []);
  assert.equal(result.classroomRevision, null); assert.equal(result.classroomTitle, null);
  assert.equal(result.archived, false); assert.equal(result.canGenerate, true);
  assert.equal(f.calls.filter(c => c.operation === 'run')[0].write, false);
  assert.equal(f.calls.some(c => c.operation === 'classroom' || c.operation === 'query'), false);
  assert.deepEqual(f.calls.find(c => c.operation === 'conversation'), { operation: 'conversation', tx: f.tx, owner: teacher, id: conversationId });
});

test('requires teacher and own active conversation before reading classroom', async () => {
  for (const changes of [{ role: 'student' }, { owner: other }, { deleted: true }]) {
    const f = makeFake(changes), service = await makeService(f);
    await assert.rejects(service.curriculum(f.request, conversationId), forbidden);
    assert.equal(f.calls.some(c => c.operation === 'classroom' || c.operation === 'query'), false);
  }
});

test('revalidates teacher ownership and returns only ordered plan facts', async () => {
  const denied = makeFake({ roomOwner: other }), deniedService = await makeService(denied);
  await assert.rejects(deniedService.curriculum(denied.request, conversationId), forbidden);
  assert.equal(denied.calls.some(c => c.operation === 'query'), false);
  const f = makeFake(), service = await makeService(f);
  const result = await service.curriculum(f.request, conversationId);
  assert.deepEqual(result.context, classroom);
  assert.equal(result.classroomRevision, '7'); assert.equal(result.classroomTitle, 'Aula sintética');
  assert.equal(result.archived, false); assert.equal(result.canGenerate, true);
  const checked = f.calls.find(c => c.operation === 'classroom');
  assert.equal(checked.tx, f.tx); assert.equal(checked.actor, f.actor); assert.equal(checked.id, classroomId);
  assert.equal(checked.write, false); assert.equal(checked.mustBeTeacher, true);
  assert.deepEqual(result.units.map(u => u.name), f.units.map(u => u.name));
  assert.deepEqual(result.units[0].topics.map(t => t.status), ['TAUGHT', 'NEXT', 'PENDING']);
  assert.equal(Object.hasOwn(result, 'currentTopic'), false);
});

test('archived classroom remains readable and disallows generation', async () => {
  const f = makeFake({ archived: true }), service = await makeService(f);
  const result = await service.curriculum(f.request, conversationId);
  assert.equal(result.archived, true); assert.equal(result.canGenerate, false);
  assert.deepEqual(result.units[0].topics.map(t => t.status), ['TAUGHT', 'NEXT', 'PENDING']);
});

test('catalogue bounds do not silently truncate 101 units or 501 topics', async () => {
  const tooManyUnits = Array.from({ length: 101 }, (_, position) => ({ id: randomUUID(), name: `Unidad ${position}`, position, topics: [] }));
  const tooManyTopics = [{ id: randomUUID(), name: 'Unidad', position: 0,
    topics: Array.from({ length: 501 }, (_, position) => ({ id: randomUUID(), name: `Tema ${position}`, position, status: 'PENDING' })) }];
  for (const units of [tooManyUnits, tooManyTopics]) {
    const f = makeFake({ units }), service = await makeService(f);
    await assert.rejects(service.curriculum(f.request, conversationId), { code: 'AI_INPUT_LIMIT' });
  }
});

test('catalogue accepts the documented exact 100-unit and 500-topic boundaries', async () => {
  const units = Array.from({ length: 100 }, (_, position) => ({ id: randomUUID(), name: `Unidad ${position}`, position, topics: [] }));
  units[0].topics = Array.from({ length: 500 }, (_, position) => ({ id: randomUUID(), name: `Tema ${position}`, position, status: 'PENDING' }));
  const f = makeFake({ units }), service = await makeService(f);
  const result = await service.curriculum(f.request, conversationId);
  assert.equal(result.units.length, 100); assert.equal(result.units[0].topics.length, 500);
});
