import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const now = '2026-10-23T12:00:00.000Z';
const payload = () => ({ title: 'Evento privado', description: 'Propio', category: 'ACTIVITY',
  schedule: { kind: 'ALL_DAY', startDate: '2026-11-01', endDateExclusive: '2026-11-02' },
  repeat: { kind: 'WEEKLY', untilDate: '2026-11-15' } });
const range = { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' };
const fail = code => Object.assign(new Error(code), { code });
function fixture() {
  const rows = new Map(), calls = [], academicCalls = [], A = { userId: randomUUID() }, B = { userId: randomUUID() };
  let readFailure = false, writeFailure = false, deadlines = [], destination = null;
  const uow = { async run(request, write, operation) {
    calls.push({ request, write });
    if (request.denied) throw fail('FORBIDDEN');
    const key = id => `${request.userId}/${id}`;
    const get = id => structuredClone(rows.get(key(id)) ?? null);
    const events = {
      async list() { if (readFailure) throw fail('SERVICE_UNAVAILABLE'); return [...rows].filter(([id]) => id.startsWith(request.userId + '/')).map(([, value]) => structuredClone(value)); },
      async get(id) { if (readFailure) throw fail('SERVICE_UNAVAILABLE'); return get(id); },
      async create(id, input) {
        if (writeFailure) throw fail('SERVICE_UNAVAILABLE');
        if (rows.has(key(id))) throw fail('CONFLICT');
        const row = { ...structuredClone(input), id, revision: '0', createdAt: now, updatedAt: now };
        rows.set(key(id), row); return structuredClone(row);
      },
      async replace(id, revision, input) {
        const row = get(id); if (!row) throw fail('FORBIDDEN');
        if (row.revision !== revision) throw fail('CONFLICT');
        const updated = { ...row, ...structuredClone(input), revision: String(BigInt(revision) + 1n) };
        rows.set(key(id), updated); return structuredClone(updated);
      },
      async remove(id, revision) {
        const row = get(id); if (!row) throw fail('FORBIDDEN');
        if (row.revision !== revision) throw fail('CONFLICT'); rows.delete(key(id));
      },
    };
    return operation({ actor: { userId: request.userId, now }, events, academic: {
      async list(value) { academicCalls.push(['list', value]); return structuredClone(deadlines); },
      async upcoming(limit) { academicCalls.push(['upcoming', limit]); return structuredClone(deadlines); },
      async resolveTarget(target) { academicCalls.push(['resolveTarget', target]); return destination; },
    } });
  } };
  const { createAgendaService } = loadTsModule("apps/api/src/modules/agenda/events/application/agenda-service.ts");
  return { service: createAgendaService(uow), rows, calls, academicCalls, A, B,
    setReadFailure: value => { readFailure = value; }, setWriteFailure: value => { writeFailure = value; },
    setDeadlines: value => { deadlines = value; }, setDestination: value => { destination = value; } };
}

test('PUT is idempotent by client id and rejects incompatible retries without overwriting', async () => {
  const { service, rows, calls, A } = fixture(), id = randomUUID();
  const first = await service.put(A, id, payload());
  assert.equal(first.created, true); assert.equal(first.event.id, id);
  const retry = await service.put(A, id, payload());
  assert.equal(retry.created, false); assert.deepEqual(retry.event, first.event); assert.equal(rows.size, 1);
  await assert.rejects(service.put(A, id, { ...payload(), title: 'Distinto' }), { code: 'CONFLICT' });
  assert.deepEqual(await service.get(A, id), first.event);
  assert.equal(calls[0].write, true); assert.equal(calls.at(-1).write, false);
});

test('private ownership denies foreign and missing IDs alike and never mutates the owner event', async () => {
  const { service, rows, A, B } = fixture(), id = randomUUID();
  await service.put(A, id, payload()); const before = structuredClone([...rows]);
  for (const candidate of [id, randomUUID()]) {
    await assert.rejects(service.get(B, candidate), { code: 'FORBIDDEN' });
    await assert.rejects(service.replace(B, candidate, { revision: '0', event: payload() }), { code: 'FORBIDDEN' });
    await assert.rejects(service.remove(B, candidate, { revision: '0' }), { code: 'FORBIDDEN' });
  }
  assert.deepEqual((await service.list(B, range)).items, []);
  assert.deepEqual([...rows], before);
});

test('two updates sharing a revision yield one winner and whole-series edit/delete', async () => {
  const { service, rows, A } = fixture(), id = randomUUID(); await service.put(A, id, payload());
  const changed = { ...payload(), title: 'Toda la serie', repeat: { kind: 'WEEKLY', untilDate: '2026-11-08' } };
  const results = await Promise.allSettled([service.replace(A, id, { revision: '0', event: changed }),
    service.replace(A, id, { revision: '0', event: changed })]);
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(results.find(x => x.status === 'rejected').reason.code, 'CONFLICT');
  const items = (await service.list(A, range)).items;
  assert.equal(items.length, 2); assert.ok(items.every(x => x.event.title === changed.title));
  await assert.rejects(service.remove(A, id, { revision: '0' }), { code: 'CONFLICT' });
  await service.remove(A, id, { revision: '1' }); assert.equal(rows.size, 0);
  assert.deepEqual((await service.list(A, range)).items, []);
});

test('bad inputs, forbidden sessions and infrastructure failures are observable instead of empty success', async () => {
  const f = fixture(), { service, A } = f;
  for (const input of [{ ...payload(), ownerId: A.userId }, { ...payload(), title: '' }])
    await assert.rejects(service.put(A, randomUUID(), input), { code: 'INVALID_INPUT' });
  await assert.rejects(service.put(A, 'not-uuid', payload()), { code: 'INVALID_INPUT' });
  await assert.rejects(service.put({ ...A, denied: true }, randomUUID(), payload()), { code: 'FORBIDDEN' });
  f.setWriteFailure(true);
  await assert.rejects(service.put(A, randomUUID(), payload()), { code: 'SERVICE_UNAVAILABLE' });
  assert.equal(f.rows.size, 0); f.setReadFailure(true);
  await assert.rejects(service.list(A, range), { code: 'SERVICE_UNAVAILABLE' });
});

test('academic projection is composed through its public port and open revalidates the current target', async () => {
  const f = fixture(), target = { classroomId: randomUUID(), activityId: randomUUID() };
  const deadline = { kind: 'ACADEMIC_DEADLINE', id: randomUUID(), target, classroomName: 'Aula', title: 'Entrega',
    activityType: 'ASSIGNMENT', role: 'student', deadlineAt: '2026-11-03T12:00:00.000Z', timeZone: 'UTC',
    pending: true, resubmission: false };
  f.setDeadlines([deadline]);
  assert.deepEqual((await f.service.upcoming(f.A, 5)).items, [deadline]);
  assert.deepEqual((await f.service.list(f.A, range)).items, [deadline]);
  assert.ok(f.academicCalls.some(x => x[0] === 'upcoming' && x[1] === 5));
  f.setDestination(target); assert.deepEqual(await f.service.open(f.A, target), target);
  f.setDestination(null); await assert.rejects(f.service.open(f.A, target), { code: 'FORBIDDEN' });
  for (const limit of [0, 21, 1.5, '5']) await assert.rejects(f.service.upcoming(f.A, limit), { code: 'INVALID_INPUT' });
});

test('agenda pagination has no silent loss and cursor cannot cross range or account boundaries', async () => {
  const f = fixture();
  for (let n = 0; n < 205; n++) {
    const id = randomUUID();
    f.rows.set(`${f.A.userId}/${id}`, { ...payload(), repeat: { kind: 'NONE' }, id, revision: '0', createdAt: now, updatedAt: now });
  }
  const first = await f.service.list(f.A, range);
  assert.equal(first.items.length, 200); assert.equal(typeof first.nextCursor, 'string');
  const second = await f.service.list(f.A, range, first.nextCursor);
  assert.equal(second.items.length, 5); assert.equal(second.nextCursor, null);
  assert.equal(new Set([...first.items, ...second.items].map(x => x.occurrenceId)).size, 205);
  assert.deepEqual((await f.service.list(f.A, range)).items.map(x => x.occurrenceId), first.items.map(x => x.occurrenceId));
  await assert.rejects(f.service.list(f.B, range, first.nextCursor), { code: 'INVALID_INPUT' });
  await assert.rejects(f.service.list(f.A, { ...range, startDate: '2026-11-02' }, first.nextCursor), { code: 'INVALID_INPUT' });
  await assert.rejects(f.service.list(f.A, range, 'not-a-cursor'), { code: 'INVALID_INPUT' });
});

test('revision and target schemas reject extra or coercible authority fields', async () => {
  const f = fixture(), id = randomUUID(); await f.service.put(f.A, id, payload());
  for (const revision of [-1, 0, '-1', '1.5']) {
    await assert.rejects(f.service.replace(f.A, id, { revision, event: payload() }), { code: 'INVALID_INPUT' });
    await assert.rejects(f.service.remove(f.A, id, { revision }), { code: 'INVALID_INPUT' });
  }
  await assert.rejects(f.service.replace(f.A, id, { revision: '0', event: payload(), ownerId: f.A.userId }), { code: 'INVALID_INPUT' });
  await assert.rejects(f.service.open(f.A, { classroomId: randomUUID(), activityId: randomUUID(), ownerId: f.A.userId }), { code: 'INVALID_INPUT' });
  assert.equal(f.rows.size, 1);
});
