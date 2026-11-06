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
    await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','Teacher','fixture-only',now(),'teacher')`, owner, `${owner}@example.test`);
    const make = () => createAgendaService(createAgendaUnitOfWork(database, async (_tx, request) => request.userId));
    for (const kind of ['DAILY', 'MONTHLY']) {
      const id = randomUUID(), input = payload(kind, '2026-11-01', '2026-11-03');
      await make().put({ userId: owner }, id, input);
      assert.deepEqual((await make().get({ userId: owner }, id)).repeat, input.repeat);
      await assert.rejects(make().get({ userId: randomUUID() }, id), { code: 'FORBIDDEN' });
    }
    assert.equal((await make().list({ userId: owner }, { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' })).items.length, 4);
    const id=randomUUID(),input=payload('WEEKLY','2026-11-05','2026-11-26');
    const initial=(await make().put({userId:owner},id,input)).event;
    const moved={...payload('NONE','2027-01-14','2027-01-14'),repeat:{kind:'NONE'},title:'Clase trasladada'};
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
test('a cancelled or moved occurrence leaves the remaining private series unchanged', () => {
  const event={id:'series',revision:'1',createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z',title:'Clase',description:'',category:'CLASS',schedule:{kind:'ALL_DAY',startDate:'2026-11-05',endDateExclusive:'2026-11-06'},repeat:{kind:'WEEKLY',untilDate:'2026-11-26'}};
  const range={startDate:'2026-11-01',endDateExclusive:'2026-12-01',timeZone:'UTC'};
  const replacement={title:'Clase trasladada',description:'',category:'CLASS',schedule:{kind:'ALL_DAY',startDate:'2026-11-14',endDateExclusive:'2026-11-15'},repeat:{kind:'NONE'}};
  const items=expandAgendaEvent({...event,exceptions:[{date:'2026-11-05',replacement:null},{date:'2026-11-12',replacement}]},range);
  assert.deepEqual(items.map(item=>item.startDate),['2026-11-14','2026-11-19','2026-11-26']);
  assert.equal(items[0].event.title,'Clase trasladada');assert.equal(items[0].occurrenceId,'series:2026-11-12');
  assert.equal(expandAgendaEvent({...event,exceptions:[{date:'2026-11-12',replacement}]},{...range,startDate:'2026-11-14',endDateExclusive:'2026-11-15'}).length,1);
});
