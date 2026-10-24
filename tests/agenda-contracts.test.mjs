import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const domain = () => loadTsModule('src/core/domain/index.ts');
const payload = () => ({ title: ' Clase de ciencias ', description: '', category: 'CLASS',
  schedule: { kind: 'TIMED', timeZone: 'America/Argentina/Buenos_Aires',
    startLocal: '2026-10-23T10:00', endLocal: '2026-10-23T11:00' }, repeat: { kind: 'NONE' } });
const invalid = { code: 'INVALID_INPUT' };

test('agenda accepts the three categories and preserves plain user text while trimming title', () => {
  const { parseAgendaEvent } = domain();
  for (const category of ['CLASS', 'ACTIVITY', 'EVALUATION']) {
    const event = parseAgendaEvent({ ...payload(), category, description: '<b>Texto propio</b>' });
    assert.equal(event.title, 'Clase de ciencias');
    assert.equal(event.category, category);
    assert.equal(event.description, '<b>Texto propio</b>');
    assert.deepEqual(event.repeat, { kind: 'NONE' });
  }
});

test('agenda rejects forged authority, personal links, extra variant fields and unbounded input', () => {
  const { parseAgendaEvent } = domain();
  for (const change of [{ ownerId: 'forged' }, { role: 'teacher' }, { target: null }, { title: '' },
    { title: ' '.repeat(20) }, { title: 'x'.repeat(161) }, { description: 'x'.repeat(4001) },
    { category: ['CLASS'] }, { category: 'OTHER' }, { repeat: { kind: 'DAILY' } },
    { repeat: { kind: 'NONE', untilDate: '2026-12-01' } },
    { schedule: { ...payload().schedule, startDate: '2026-10-23' } }])
    assert.throws(() => parseAgendaEvent({ ...payload(), ...change }), invalid, JSON.stringify(change));
  assert.equal(parseAgendaEvent({ ...payload(), title: 'x'.repeat(160), description: 'x'.repeat(4000) }).title.length, 160);
  for (const value of [null, [], 'event']) assert.throws(() => parseAgendaEvent(value), invalid);
});

test('agenda rejects impossible dates, non-minute times, invalid zones and nonpositive duration', () => {
  const { parseAgendaEvent } = domain();
  for (const change of [{ startLocal: '2026-02-30T10:00' }, { startLocal: '2026-10-23T10:00:01' },
    { timeZone: '+03:00' }, { timeZone: 'America/Imaginary' }, { endLocal: '2026-10-23T10:00' },
    { endLocal: '2026-10-22T11:00' }, { startOffsetMinutes: 60 }])
    assert.throws(() => parseAgendaEvent({ ...payload(), schedule: { ...payload().schedule, ...change } }), invalid);
});

test('all-day events use real dates and exclusive ends without timed metadata', () => {
  const { parseAgendaEvent } = domain();
  const schedule = { kind: 'ALL_DAY', startDate: '2028-02-29', endDateExclusive: '2028-03-01' };
  assert.deepEqual(parseAgendaEvent({ ...payload(), schedule }).schedule, schedule);
  for (const change of [{ startDate: '2026-02-29' }, { endDateExclusive: '2028-02-29' },
    { timeZone: 'UTC' }, { startLocal: '2028-02-29T00:00' }])
    assert.throws(() => parseAgendaEvent({ ...payload(), schedule: { ...schedule, ...change } }), invalid);
});

test('agenda ranges are strict real date intervals of at most 93 days', () => {
  const { parseAgendaRange } = domain();
  const range = { startDate: '2026-10-01', endDateExclusive: '2027-01-02', timeZone: 'UTC' };
  assert.deepEqual(parseAgendaRange(range), range);
  for (const change of [{ endDateExclusive: '2027-01-03' }, { endDateExclusive: '2026-10-01' },
    { startDate: '2026-02-30' }, { timeZone: 'Unknown/Zone' }, { ownerId: 'forged' }])
    assert.throws(() => parseAgendaRange({ ...range, ...change }), invalid);
});
