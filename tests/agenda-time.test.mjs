import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const domain = () => loadTsModule('src/core/domain/index.ts');
const payload = () => ({ title: 'Semanal', description: '', category: 'CLASS',
  schedule: { kind: 'TIMED', timeZone: 'America/New_York',
    startLocal: '2026-03-01T10:00', endLocal: '2026-03-01T11:00' },
  repeat: { kind: 'WEEKLY', untilDate: '2026-03-15' } });
const event = input => ({ ...input, id: '11111111-1111-4111-8111-111111111111', revision: '0',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' });
const range = { startDate: '2026-03-01', endDateExclusive: '2026-04-01', timeZone: 'America/New_York' };

test('weekly expansion retains local wall time across DST and includes the final date', () => {
  const { parseAgendaEvent, validateAgendaSeries, expandAgendaEvent } = domain();
  const input = parseAgendaEvent(payload()); validateAgendaSeries(input);
  const occurrences = expandAgendaEvent(event(input), range);
  assert.deepEqual(occurrences.map(x => x.startAt), ['2026-03-01T15:00:00.000Z',
    '2026-03-08T14:00:00.000Z', '2026-03-15T14:00:00.000Z']);
  assert.deepEqual(occurrences.map(x => x.endAt), ['2026-03-01T16:00:00.000Z',
    '2026-03-08T15:00:00.000Z', '2026-03-15T15:00:00.000Z']);
  assert.equal(new Set(occurrences.map(x => x.occurrenceId)).size, 3);
  assert.ok(occurrences.every(x => x.kind === 'PRIVATE_EVENT' && x.event.id === event(input).id));
  assert.deepEqual(expandAgendaEvent(event(input), { ...range, startDate: '2026-03-08', endDateExclusive: '2026-03-15' })
    .map(x => x.startAt), ['2026-03-08T14:00:00.000Z']);
});

test('future nonexistent or ambiguous weekly occurrences reject the whole series', () => {
  const { parseAgendaEvent, validateAgendaSeries } = domain();
  for (const [startLocal, endLocal, untilDate] of [
    ['2026-03-01T02:30', '2026-03-01T03:30', '2026-03-15'],
    ['2026-10-25T01:30', '2026-10-25T02:30', '2026-11-08'],
  ]) assert.throws(() => {
    const input = parseAgendaEvent({ ...payload(), schedule: { ...payload().schedule, startLocal, endLocal },
      repeat: { kind: 'WEEKLY', untilDate } }); validateAgendaSeries(input);
  }, { code: 'INVALID_INPUT' });
});

test('single ambiguous times require a valid explicit offset and resolve distinct instants', () => {
  const { parseAgendaEvent, expandAgendaEvent } = domain();
  const input = { ...payload(), schedule: { kind: 'TIMED', timeZone: 'America/New_York',
    startLocal: '2026-11-01T01:30', endLocal: '2026-11-01T02:30' }, repeat: { kind: 'NONE' } };
  assert.throws(() => parseAgendaEvent(input), { code: 'INVALID_INPUT' });
  for (const [offset, instant] of [[-240, '2026-11-01T05:30:00.000Z'], [-300, '2026-11-01T06:30:00.000Z']]) {
    const parsed = parseAgendaEvent({ ...input, schedule: { ...input.schedule, startOffsetMinutes: offset } });
    const items = expandAgendaEvent(event(parsed), { startDate: '2026-11-01', endDateExclusive: '2026-11-02', timeZone: 'UTC' });
    assert.equal(items[0].startAt, instant);
  }
});

test('weekly series has at most 53 occurrences and cannot end before its first day', () => {
  const { parseAgendaEvent, validateAgendaSeries, expandAgendaEvent } = domain();
  const input = { ...payload(), schedule: { kind: 'ALL_DAY', startDate: '2026-01-01', endDateExclusive: '2026-01-02' },
    repeat: { kind: 'WEEKLY', untilDate: '2026-12-31' } };
  validateAgendaSeries(parseAgendaEvent(input));
  for (const untilDate of ['2027-01-07', '2025-12-31']) assert.throws(() => {
    validateAgendaSeries(parseAgendaEvent({ ...input, repeat: { kind: 'WEEKLY', untilDate } }));
  }, { code: 'INVALID_INPUT' });
  const items = expandAgendaEvent(event(input), { startDate: '2026-01-01', endDateExclusive: '2026-01-09', timeZone: 'Pacific/Auckland' });
  assert.deepEqual(items.map(x => [x.startDate, x.endDateExclusive, x.startAt, x.endAt]),
    [['2026-01-01', '2026-01-02', null, null], ['2026-01-08', '2026-01-09', null, null]]);
});

test('overlapping all-day events intersect the range using an exclusive end', () => {
  const { expandAgendaEvent } = domain();
  const input = event({ ...payload(), schedule: { kind: 'ALL_DAY', startDate: '2026-02-27', endDateExclusive: '2026-03-02' }, repeat: { kind: 'NONE' } });
  assert.equal(expandAgendaEvent(input, range).length, 1);
  assert.equal(expandAgendaEvent(input, { ...range, startDate: '2026-03-02' }).length, 0);
});

test('monthly grouping preserves original order, zone boundaries and exclusive ends', () => {
  const { groupAgendaItemsByDay, monthDays, onDay } = loadTsModule('apps/agenda-ui/calendar.ts');
  const days = monthDays('2026-03'), zone = 'America/New_York';
  const items = [
    { kind: 'PRIVATE_EVENT', id: 'timed', startAt: '2026-03-08T04:30:00Z', endAt: '2026-03-09T04:00:00Z' },
    { kind: 'ACADEMIC_DEADLINE', id: 'deadline', deadlineAt: '2026-03-08T04:30:00Z' },
    { kind: 'PRIVATE_EVENT', id: 'all-day', startDate: '2026-03-08', endDateExclusive: '2026-03-10' },
    { kind: 'ACADEMIC_DEADLINE', id: 'outside', deadlineAt: '2026-01-01T12:00:00Z' },
  ];
  const grouped = groupAgendaItemsByDay(items, days, zone);
  for (const day of days) assert.deepEqual(grouped.get(day), items.filter(item => onDay(item, day, zone)), day);
  assert.deepEqual(grouped.get('2026-03-07').map(item => item.id), ['timed', 'deadline']);
  assert.deepEqual(grouped.get('2026-03-09').map(item => item.id), ['all-day']);
});
