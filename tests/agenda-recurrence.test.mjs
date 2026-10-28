import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseAgendaEvent, expandAgendaEvent } from '../src/core/domain/index.ts';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const payload = (kind, start, until) => ({ title: 'Lectura', description: 'Traer el libro', category: 'CLASS', color: 'ORANGE',
  schedule: { kind: 'ALL_DAY', startDate: start, endDateExclusive: new Date(Date.parse(start) + 86400000).toISOString().slice(0, 10) }, repeat: { kind, untilDate: until } });
const dates = input => expandAgendaEvent({ ...parseAgendaEvent(input), id: 'fixture', revision: '0', createdAt: '', updatedAt: '' },
  { startDate: '2026-01-01', endDateExclusive: '2027-12-31', timeZone: 'UTC' }).map(x => x.startDate);
test('daily recurrence is inclusive, bounded and preserves consecutive calendar dates', () => {
  assert.deepEqual(dates(payload('DAILY', '2026-12-30', '2027-01-02')), ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);
  assert.equal(dates(payload('DAILY', '2026-01-01', '2026-02-22')).length, 53);
  assert.throws(() => parseAgendaEvent(payload('DAILY', '2026-01-01', '2026-02-23')), { code: 'INVALID_INPUT' });
});
test('monthly recurrence skips missing day numbers without drifting or duplicating', () => {
  assert.deepEqual(dates(payload('MONTHLY', '2026-01-31', '2026-07-31')), ['2026-01-31', '2026-03-31', '2026-05-31', '2026-07-31']);
  assert.deepEqual(dates(payload('MONTHLY', '2026-01-15', '2026-03-15')), ['2026-01-15', '2026-02-15', '2026-03-15']);
  assert.throws(() => parseAgendaEvent(payload('MONTHLY', '2026-01-01', '2030-06-01')), { code: 'INVALID_INPUT' });
});
test('new recurrences retain future DST ambiguity rejection', () => {
  assert.throws(() => parseAgendaEvent({ ...payload('DAILY', '2026-10-31', '2026-11-02'), schedule: {
    kind: 'TIMED', timeZone: 'America/New_York', startLocal: '2026-10-31T01:30', endLocal: '2026-10-31T02:30' } }), { code: 'INVALID_INPUT' });
});
test('new recurrence kinds persist, reload, expand and remain owner-isolated', { timeout: 60000 }, async () => {
  const { createAgendaService, createAgendaUnitOfWork } = loadTsModule('apps/api/src/agenda/index.ts');
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ database, query }) => {
    const owner = randomUUID();
    await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,'Synthetic','Teacher','fixture-only',now())`, owner, `${owner}@example.test`);
    const make = () => createAgendaService(createAgendaUnitOfWork(database, async (_tx, request) => request.userId));
    for (const kind of ['DAILY', 'MONTHLY']) {
      const id = randomUUID(), input = payload(kind, '2026-11-01', '2026-11-03');
      await make().put({ userId: owner }, id, input);
      assert.deepEqual((await make().get({ userId: owner }, id)).repeat, input.repeat);
      await assert.rejects(make().get({ userId: randomUUID() }, id), { code: 'FORBIDDEN' });
    }
    assert.equal((await make().list({ userId: owner }, { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' })).items.length, 4);
  }));
});
