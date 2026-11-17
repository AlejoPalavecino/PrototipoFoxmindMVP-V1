import test from 'node:test';
import assert from 'node:assert/strict';
import { AgendaService } from '../../events/public.ts';
import { createAgendaUnitOfWork } from '../../events/infrastructure/unit-of-work.ts';

const id = '00000000-0000-0000-0000-000000000001';

test('academic operations retain the caller UoW and selected actor', async () => {
  const request = {}, calls = [], actor = { userId: id, now: '2026-11-16T12:00:00.000Z' };
  const target = { classroomId: id, activityId: null };
  const academic = { upcoming: async limit => { calls.push(limit); return [target]; },
    resolveTarget: async input => { assert.deepEqual(input, target); return target; } };
  const service = new AgendaService({ run: async (actual, write, operation) => {
    assert.equal(actual, request); assert.equal(write, false); calls.push('unit');
    return operation({ actor, academic });
  } });
  assert.deepEqual(await service.upcoming(request, 3), { serverTime: actor.now, items: [target] });
  assert.deepEqual(await service.open(request, target), target);
  assert.deepEqual(calls, ['unit', 3, 'unit']);
});

test('academic destination revocation remains forbidden and invalid limit never opens UoW', async () => {
  let runs = 0;
  const service = new AgendaService({ run: async (request, write, operation) => {
    runs++; return operation({ academic: { resolveTarget: async () => null } });
  } });
  await assert.rejects(service.upcoming({}, 21), { code: 'INVALID_INPUT' });
  assert.equal(runs, 0);
  await assert.rejects(service.open({}, { classroomId: id, activityId: null }), { code: 'FORBIDDEN' });
  assert.equal(runs, 1);
});

test('SQL UoW preserves single transaction, locked reauthentication and shared tx/actor', async () => {
  const rawCalls = [], authentications = [], request = {};
  let transactions = 0, projectionTx, projectionActor;
  const database = { $transaction: async (operation, options) => {
    transactions++; assert.deepEqual(options, { maxWait: 2000, timeout: 6000 });
    return operation({ $queryRawUnsafe: async sql => {
      rawCalls.push(sql);
      if (sql.includes('email_verified_at')) return [{ email_verified_at: new Date() }];
      return [{ now: new Date('2026-11-16T12:00:00Z') }];
    } });
  } };
  const uow = createAgendaUnitOfWork(database, async (tx, actual, write) => {
    assert.equal(actual, request); assert.equal(write, false); authentications.push(tx); return id;
  }, (tx, actor) => {
    projectionTx = tx; projectionActor = actor;
    return { upcoming: async () => [] };
  });
  assert.deepEqual(await new AgendaService(uow).upcoming(request), { serverTime: '2026-11-16T12:00:00.000Z', items: [] });
  assert.equal(transactions, 1);
  assert.equal(authentications.length, 3);
  assert.ok(authentications.every(tx => tx === projectionTx));
  assert.equal(projectionActor.userId, id);
  assert.match(rawCalls[0], /FOR SHARE/);
});
