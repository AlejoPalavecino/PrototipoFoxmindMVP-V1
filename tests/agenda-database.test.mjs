import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const payload = () => ({ title: 'Persistido', description: '', category: 'CLASS',
  schedule: { kind: 'TIMED', timeZone: 'UTC', startLocal: '2026-11-01T10:00', endLocal: '2026-11-01T11:00' }, repeat: { kind: 'NONE' } });
const range = { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' };
async function seed(query) {
  const ids = [randomUUID(), randomUUID()];
  for (const id of ids) await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Agenda','Fixture','not-a-login',now(),'teacher')`, id, `${id}@example.invalid`);
  return ids;
}
async function updateEvent(query, id, fields) {
  const entries = Object.entries(fields);
  return query(`UPDATE agenda_events SET ${entries.map(([column], i) => `${column}=$${i + 2}`).join(', ')} WHERE id=$1 RETURNING id`,
    id, ...entries.map(([, value]) => value));
}
async function rejectsUpdate(query, id, fields, constraint) {
  const snapshot = () => query('SELECT row_to_json(e) value FROM agenda_events e ORDER BY id');
  const before = await snapshot();
  await query('SAVEPOINT invalid_write');
  await assert.rejects(updateEvent(query, id, fields), error => {
    assert.equal(error.code, '23514');
    assert.equal(error.constraint, constraint);
    return true;
  });
  await query('ROLLBACK TO SAVEPOINT invalid_write');
  assert.deepEqual(await snapshot(), before, `rejection changed stored events: ${JSON.stringify(fields)}`);
  await query('RELEASE SAVEPOINT invalid_write');
}
test('agenda real PostgreSQL persistence, constraints and isolation with per-case rollback', { timeout: 60000 }, async t => {
  const { createAgendaService, createAgendaUnitOfWork } = Object.freeze({createAgendaService: loadTsModule("apps/api/src/modules/agenda/application/agenda-service.ts").createAgendaService,createAgendaUnitOfWork: loadTsModule("apps/api/src/bootstrap/agenda-composition.ts").createAgendaUnitOfWork});
  assert.equal(typeof createAgendaUnitOfWork, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    await t.test('new service reads persisted events; foreign CRUD denied; revision changes survive new instance', async () => transaction(async ({ database, query }) => {
      const [A, B] = await seed(query), id = randomUUID();
      // This auth stub exercises the real owner-bound UoW/SQL; persisted session+CSRF belongs to HTTP integration.
      const make = () => createAgendaService(createAgendaUnitOfWork(database, async (_tx, request) => request.userId));
      const first = await make().put({ userId: A }, id, payload()); assert.equal(first.created, true);
      assert.deepEqual(await make().get({ userId: A }, id), first.event);
      for (const foreign of [id, randomUUID()]) {
        await assert.rejects(make().get({ userId: B }, foreign), { code: 'FORBIDDEN' });
        await assert.rejects(make().replace({ userId: B }, foreign, { revision: '0', event: payload() }), { code: 'FORBIDDEN' });
        await assert.rejects(make().remove({ userId: B }, foreign, { revision: '0' }), { code: 'FORBIDDEN' });
      }
      assert.deepEqual((await make().list({ userId: B }, range)).items, []);
      const updated = await make().replace({ userId: A }, id, { revision: '0', event: { ...payload(), title: 'Cambio' } });
      assert.equal(updated.revision, '1'); assert.equal((await make().get({ userId: A }, id)).title, 'Cambio');
      await assert.rejects(make().replace({ userId: A }, id, { revision: '0', event: payload() }), { code: 'CONFLICT' });
      await make().remove({ userId: A }, id, { revision: '1' });
      assert.equal((await query('SELECT count(*)::int count FROM agenda_events WHERE id=$1::uuid', id))[0].count, 0);
    }));
    await t.test('database rejects invalid title/category/revision independently of application validation', async () => transaction(async ({ database, query }) => {
      const [A] = await seed(query), id = randomUUID();
      const service = createAgendaService(createAgendaUnitOfWork(database, async () => A));
      await service.put({}, id, payload());
      assert.deepEqual(await updateEvent(query, id, { title: 'T'.repeat(160), description: 'D'.repeat(4000), revision: 1 }), [{ id }]);
      for (const category of ['CLASS', 'ACTIVITY', 'EVALUATION'])
        assert.deepEqual(await updateEvent(query, id, { category }), [{ id }]);
      for (const title of ['', '   ', 'T'.repeat(161)])
        await rejectsUpdate(query, id, { title }, 'agenda_events_title_check');
      await rejectsUpdate(query, id, { description: 'D'.repeat(4001) }, 'agenda_events_description_check');
      await rejectsUpdate(query, id, { category: 'OTHER' }, 'agenda_events_category_check');
      await rejectsUpdate(query, id, { revision: -1 }, 'agenda_events_revision_check');
      const before = await query('SELECT row_to_json(e) value FROM agenda_events e WHERE id=$1', id);
      await query('SAVEPOINT invalid_owner');
      await assert.rejects(query('UPDATE agenda_events SET owner_id=$2 WHERE id=$1', id, randomUUID()), error => error.code === '23503');
      await query('ROLLBACK TO SAVEPOINT invalid_owner');
      assert.deepEqual(await query('SELECT row_to_json(e) value FROM agenda_events e WHERE id=$1', id), before);
    }));
    await t.test('SQL schedule rejects invalid kinds, date ranges and mixed all-day fields', async () => transaction(async ({ database, query }) => {
      const [owner] = await seed(query), id = randomUUID();
      const service = createAgendaService(createAgendaUnitOfWork(database, async () => owner));
      await service.put({}, id, { ...payload(), schedule: { kind: 'ALL_DAY', startDate: '2026-11-01', endDateExclusive: '2026-11-02' } });
      const [stored] = await query('SELECT row_to_json(e) value FROM agenda_events e WHERE id=$1', id);
      assert.equal(stored.value.schedule_kind, 'ALL_DAY');
      for (const field of ['start_local', 'end_local', 'time_zone', 'start_offset_minutes', 'end_offset_minutes', 'start_at', 'end_at'])
        assert.equal(stored.value[field], null);
      await rejectsUpdate(query, id, { schedule_kind: 'OTHER' }, 'agenda_event_schedule');
      for (const end_date_exclusive of ['2026-11-01', '2026-10-31'])
        await rejectsUpdate(query, id, { end_date_exclusive }, 'agenda_event_dates');
      for (const fields of [
        { start_local: '2026-11-01T10:00' }, { end_local: '2026-11-01T11:00' }, { time_zone: 'UTC' },
        { start_offset_minutes: 0 }, { end_offset_minutes: 0 },
        { start_at: '2026-11-01T10:00Z' }, { end_at: '2026-11-01T11:00Z' },
        { schedule_kind: 'TIMED' },
      ]) await rejectsUpdate(query, id, fields, 'agenda_event_schedule');
    }));
    await t.test('SQL timed schedule requires coherent local/instant/zone fields and bounded optional offsets', async () => transaction(async ({ database, query }) => {
      const [owner] = await seed(query), id = randomUUID();
      await createAgendaService(createAgendaUnitOfWork(database, async () => owner)).put({}, id, payload());
      // A non-UTC control exercises projection, not just identical UTC/local strings.
      assert.deepEqual(await updateEvent(query, id, {
        time_zone: 'Etc/GMT+3', start_at: '2026-11-01T13:00Z', end_at: '2026-11-01T14:00Z',
        start_offset_minutes: null, end_offset_minutes: null,
      }), [{ id }]);
      for (const offset of [-1440, 1440])
        assert.deepEqual(await updateEvent(query, id, { start_offset_minutes: offset, end_offset_minutes: offset }), [{ id }]);
      // SQL only bounds offsets; it does not require them to equal the zone's actual offset.
      for (const fields of [
        { start_local: null }, { end_local: null }, { time_zone: null }, { time_zone: '' },
        { start_at: null }, { end_at: null },
        { start_local: '2026-11-01 10:00' }, { end_local: '2026-11-01 11:00' },
        { start_date: '2026-10-31' },
        { start_local: '2026-11-01T10:01' }, { end_local: '2026-11-01T11:01' },
        { start_at: '2026-11-01T13:01Z' }, { end_at: '2026-11-01T14:01Z' },
        { end_local: '2026-11-01T10:00', end_at: '2026-11-01T13:00Z' },
        { end_local: '2026-11-01T09:00', end_at: '2026-11-01T12:00Z' },
        { start_offset_minutes: -1441 }, { start_offset_minutes: 1441 },
        { end_offset_minutes: -1441 }, { end_offset_minutes: 1441 },
      ]) await rejectsUpdate(query, id, fields, 'agenda_event_schedule');
    }));
    await t.test('SQL recurrence kinds and inclusive/exclusive date boundaries', async () => transaction(async ({ database, query }) => {
      const [owner] = await seed(query), id = randomUUID();
      await createAgendaService(createAgendaUnitOfWork(database, async () => owner)).put({}, id, payload());
      assert.deepEqual(await query('SELECT repeat_kind,repeat_until FROM agenda_events WHERE id=$1', id), [{ repeat_kind: 'NONE', repeat_until: null }]);
      await rejectsUpdate(query, id, { repeat_until: '2026-11-01' }, 'agenda_event_repeat');
      await rejectsUpdate(query, id, { repeat_kind: 'YEARLY' }, 'agenda_event_repeat');
      for (const [repeat_kind, lastAllowed, firstRejected] of [
        ['DAILY', '2026-12-23', '2026-12-24'], // 52 versus 53 days after start
        ['WEEKLY', '2027-11-06', '2027-11-07'], // 370 versus 371 days
        ['MONTHLY', '2034-10-31', '2034-11-01'], // strictly less than eight years
      ]) {
        for (const repeat_until of ['2026-11-01', lastAllowed]) {
          assert.deepEqual(await updateEvent(query, id, { repeat_kind, repeat_until }), [{ id }]);
          assert.deepEqual(await query('SELECT repeat_kind,repeat_until::text FROM agenda_events WHERE id=$1', id), [{ repeat_kind, repeat_until }]);
        }
        for (const repeat_until of [null, '2026-10-31', firstRejected])
          await rejectsUpdate(query, id, { repeat_kind, repeat_until }, 'agenda_event_repeat');
      }
      assert.deepEqual(await updateEvent(query, id, { repeat_kind: 'NONE', repeat_until: null }), [{ id }]);
    }));
    await t.test('SQL exceptions default to an array with at most 53 entries, without element validation', async () => transaction(async ({ database, query }) => {
      const [owner] = await seed(query), id = randomUUID();
      await createAgendaService(createAgendaUnitOfWork(database, async () => owner)).put({}, id, payload());
      assert.deepEqual(await query('SELECT exceptions FROM agenda_events WHERE id=$1', id), [{ exceptions: [] }]);
      // These are valid to the physical CHECK, not necessarily valid domain exceptions.
      for (const exceptions of [[], Array(53).fill('2026-11-01'), [null, 1, { arbitrary: true }]]) {
        assert.deepEqual(await updateEvent(query, id, { exceptions: JSON.stringify(exceptions) }), [{ id }]);
        assert.deepEqual(await query('SELECT exceptions FROM agenda_events WHERE id=$1', id), [{ exceptions }]);
      }
      for (const exceptions of [Array(54).fill('2026-11-01'), {}, '2026-11-01', null])
        await rejectsUpdate(query, id, { exceptions: JSON.stringify(exceptions) }, 'agenda_event_exceptions_array');
      const before = await query('SELECT row_to_json(e) value FROM agenda_events e WHERE id=$1', id);
      await query('SAVEPOINT null_exceptions');
      await assert.rejects(updateEvent(query, id, { exceptions: null }), error => error.code === '23502' && error.column === 'exceptions');
      await query('ROLLBACK TO SAVEPOINT null_exceptions');
      assert.deepEqual(await query('SELECT row_to_json(e) value FROM agenda_events e WHERE id=$1', id), before);
    }));
    assert.equal((await pool.query('SELECT count(*)::int count FROM agenda_events')).rows[0].count, 0);
    assert.equal((await pool.query('SELECT count(*)::int count FROM users')).rows[0].count, 0);
  });
});

const recurringPayload = (kind, start, until) => ({ title: 'Lectura', description: 'Traer el libro', category: 'CLASS', color: 'ORANGE',
  schedule: { kind: 'ALL_DAY', startDate: start, endDateExclusive: new Date(Date.parse(start) + 86400000).toISOString().slice(0, 10) }, repeat: { kind, untilDate: until } });

test('new recurrence kinds persist, reload, expand and remain owner-isolated', { timeout: 60000 }, async () => {
  const { createAgendaService, createAgendaUnitOfWork } = Object.freeze({createAgendaService: loadTsModule("apps/api/src/modules/agenda/application/agenda-service.ts").createAgendaService,createAgendaUnitOfWork: loadTsModule("apps/api/src/bootstrap/agenda-composition.ts").createAgendaUnitOfWork});
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ database, query }) => {
    const owner = randomUUID();
    await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','Teacher','fixture-only',now(),'teacher')`, owner, `${owner}@example.test`);
    const make = () => createAgendaService(createAgendaUnitOfWork(database, async (_tx, request) => request.userId));
    for (const kind of ['DAILY', 'MONTHLY']) {
      const id = randomUUID(), input = recurringPayload(kind, '2026-11-01', '2026-11-03');
      await make().put({ userId: owner }, id, input);
      assert.deepEqual((await make().get({ userId: owner }, id)).repeat, input.repeat);
      await assert.rejects(make().get({ userId: randomUUID() }, id), { code: 'FORBIDDEN' });
    }
    assert.equal((await make().list({ userId: owner }, { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' })).items.length, 4);
    const id=randomUUID(),input=recurringPayload('WEEKLY','2026-11-05','2026-11-26');
    const initial=(await make().put({userId:owner},id,input)).event;
    const moved={...recurringPayload('NONE','2027-01-14','2027-01-14'),repeat:{kind:'NONE'},title:'Clase trasladada'};
    const changed=await make().changeOccurrence({userId:owner},id,'2026-11-12',{revision:initial.revision,event:moved});
    assert.equal(changed.exceptions.length,1);
    const saved=await make().get({userId:owner},id);assert.deepEqual(saved.exceptions,changed.exceptions);
    const movedRange={startDate:'2027-01-14',endDateExclusive:'2027-01-15',timeZone:'UTC'};
    assert.equal((await make().list({userId:owner},movedRange)).items[0].event.title,'Clase trasladada');
    const other=randomUUID();await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role) VALUES($1,now(),$2,$2,'Other','Teacher','fixture-only',now(),'teacher')`,other,`${other}@example.test`);
    assert.deepEqual((await make().list({userId:other},movedRange)).items,[]);
    await assert.rejects(make().changeOccurrence({userId:owner},id,'2026-11-19',{revision:initial.revision},true),{code:'CONFLICT'});
    await assert.rejects(make().changeOccurrence({userId:randomUUID()},id,'2026-11-19',{revision:saved.revision},true),{code:'FORBIDDEN'});
    await assert.rejects(make().changeOccurrence({userId:owner},id,'2026-11-13',{revision:saved.revision},true),{code:'INVALID_INPUT'});
    const cancelled=await make().changeOccurrence({userId:owner},id,'2026-11-19',{revision:saved.revision},true);
    assert.equal(cancelled.exceptions.length,2);
    const renamed=await make().replace({userId:owner},id,{revision:cancelled.revision,event:{...input,title:'Serie con título nuevo'}});
    assert.deepEqual(renamed.exceptions,cancelled.exceptions,'editing series metadata preserves cancelled/moved occurrences');
    const shortened=await make().replace({userId:owner},id,{revision:renamed.revision,event:{...input,repeat:{kind:'WEEKLY',untilDate:'2026-11-12'}}});
    assert.deepEqual(shortened.exceptions,[changed.exceptions[0]],'schedule edits prune exceptions for removed dates');
    const single=await make().replace({userId:owner},id,{revision:shortened.revision,event:{...input,repeat:{kind:'NONE'}}});
    assert.deepEqual(single.exceptions,undefined,'single events cannot retain inaccessible series exceptions');
  }));
});
