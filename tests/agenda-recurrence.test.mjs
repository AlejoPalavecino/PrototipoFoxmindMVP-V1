import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAgendaEvent, expandAgendaEvent } from '../src/core/domain/index.ts';

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
test('a cancelled or moved occurrence leaves the remaining private series unchanged', () => {
  const event={id:'series',revision:'1',createdAt:'2026-11-01T00:00:00Z',updatedAt:'2026-11-01T00:00:00Z',title:'Clase',description:'',category:'CLASS',schedule:{kind:'ALL_DAY',startDate:'2026-11-05',endDateExclusive:'2026-11-06'},repeat:{kind:'WEEKLY',untilDate:'2026-11-26'}};
  const range={startDate:'2026-11-01',endDateExclusive:'2026-12-01',timeZone:'UTC'};
  const replacement={title:'Clase trasladada',description:'',category:'CLASS',schedule:{kind:'ALL_DAY',startDate:'2026-11-14',endDateExclusive:'2026-11-15'},repeat:{kind:'NONE'}};
  const items=expandAgendaEvent({...event,exceptions:[{date:'2026-11-05',replacement:null},{date:'2026-11-12',replacement}]},range);
  assert.deepEqual(items.map(item=>item.startDate),['2026-11-14','2026-11-19','2026-11-26']);
  assert.equal(items[0].event.title,'Clase trasladada');assert.equal(items[0].occurrenceId,'series:2026-11-12');
  assert.equal(expandAgendaEvent({...event,exceptions:[{date:'2026-11-12',replacement}]},{...range,startDate:'2026-11-14',endDateExclusive:'2026-11-15'}).length,1);
});
