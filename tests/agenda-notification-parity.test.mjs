import test from 'node:test';
import assert from 'node:assert/strict';
import * as agenda from '../src/core/domain/agenda/index.ts';
import { parseNotificationQuery } from '../src/core/domain/home/notifications.ts';

const { parseAgendaEvent, agendaEventNotices } = agenda;
const zone = 'America/Argentina/Buenos_Aires';
const base = { title: 'Clase', category: 'CLASS', description: '', repeat: { kind: 'NONE' },
  schedule: { kind: 'ALL_DAY', startDate: '2026-11-16', endDateExclusive: '2026-11-17' } };

test('Agenda persists the explicit all-day reminder zone; malformed or unauthorized options are rejected', () => {
  assert.deepEqual(parseAgendaEvent({ ...base, reminder: { minutes: 30, timeZone: zone } }).reminder, { minutes: 30, timeZone: zone });
  for (const reminder of [{ minutes: 30 }, { minutes: 20, timeZone: zone }, { minutes: 5, timeZone: 'Mars/A' }, { minutes: 5, timeZone: zone, ownerId: 'forged' }])
    assert.throws(() => parseAgendaEvent({ ...base, reminder }), { code: 'INVALID_INPUT' });
});

test('Agenda reminders use effective recurrence dates and ignore cancelled or future occurrences', () => {
  const event = { ...base, id: '5a49b62d-fa91-4d8f-bdeb-be8369d86dfa', revision: '1',
    createdAt: '2026-11-15T00:00:00Z', updatedAt: '2026-11-15T00:00:00Z',
    repeat: { kind: 'DAILY', untilDate: '2026-11-18' }, reminder: { minutes: 30, timeZone: zone },
    exceptions: [{ date: '2026-11-16', replacement: null }] };
  assert.deepEqual(agendaEventNotices(event, '2026-11-17T02:29:59Z'), []);
  const [notice] = agendaEventNotices(event, '2026-11-17T02:30:00Z');
  assert.equal(notice.occurrenceDate, '2026-11-17');
  assert.equal(notice.createdAt, '2026-11-17T02:30:00.000Z');
});

test('Notification query supports one server-side kind and rejects unknown or repeated filters', () => {
  assert.deepEqual(parseNotificationQuery(new URLSearchParams('kind=agenda&unread=true')), { kind: 'agenda', unread: true });
  for (const value of ['kind=admin', 'kind=agenda&kind=classroom', 'kind=', 'recipient=another-user'])
    assert.throws(() => parseNotificationQuery(new URLSearchParams(value)), /INVALID_INPUT/);
});


test('edited occurrences use their actual local start and can disable an inherited reminder', () => {
  const event = { ...base, id: '5a49b62d-fa91-4d8f-bdeb-be8369d86dfa', revision: '1',
    createdAt: '2026-11-13T00:00:00Z', updatedAt: '2026-11-15T00:00:00Z',
    repeat: { kind: 'DAILY', untilDate: '2026-11-18' }, reminder: { minutes: 30, timeZone: zone } };
  const replacement = { ...base, title: 'Clase reprogramada', schedule: { kind: 'TIMED',
    timeZone: 'America/New_York', startLocal: '2026-11-20T10:00', endLocal: '2026-11-20T11:00' } };
  assert.throws(() => parseAgendaEvent({ ...replacement, reminder: { minutes: 5, timeZone: zone } }), { code: 'INVALID_INPUT' });
  const modified = { ...event, exceptions: [
    { date: '2026-11-16', replacement: null },
    { date: '2026-11-17', replacement },
    { date: '2026-11-18', replacement: { ...replacement, reminder: { minutes: 5 } } },
  ] };
  assert.deepEqual(agendaEventNotices(modified, '2026-11-20T14:54:59Z'), []);
  const notices = agendaEventNotices(modified, '2026-11-20T14:55:00Z');
  assert.equal(notices.length, 1);
  assert.deepEqual(notices[0], { occurrenceDate: '2026-11-18', title: 'Clase reprogramada',
    startsAt: '2026-11-20T15:00:00.000Z', createdAt: '2026-11-20T14:55:00.000Z' });
});
