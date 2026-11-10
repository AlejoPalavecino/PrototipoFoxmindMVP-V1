import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const helper = () => loadTsModule('apps/web/src/features/home/model/home-presentation.ts');
const names = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'];
const empty = { status: 'ready', items: [], totalItems: null, nextCursor: null };

test('Each recoverable module retains a working retry action', () => {
  const { HomeModule } = loadTsModule('apps/web/src/features/home/ui/HomeModule.tsx');
  const walk = value => !value || typeof value !== 'object' ? [] :
    [value, ...[value.props?.children].flat(Infinity).flatMap(walk)];
  for (const name of names) {
    let calls = 0;
    const tree = HomeModule({ name, page: { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true }, timeZone: 'UTC', onAction() {}, onRetry() { calls++; } });
    const retry = walk(tree).find(node => node.type === 'button' && node.props.onClick);
    assert.ok(retry, `${name}: retry is exposed`);
    retry.props.onClick();
    assert.equal(calls, 1, `${name}: retry dispatches once`);
  }
});

test('Home preserves applicable work, personal agenda, archived history and recoverable errors', () => {
  const { shouldShowHomeModule: show } = helper();
  for (const participation of ['none', 'study', 'teach', 'mixed']) {
    for (const name of names) {
      assert.equal(show(participation, name, { status: 'not-applicable' }), false, `${participation}/${name}: inapplicable`);
      assert.equal(show(participation, name, { status: 'error', code: 'UNAVAILABLE' }), true, `${participation}/${name}: error remains recoverable`);
      assert.equal(show(participation, name, empty), participation !== 'none' || name === 'agenda', `${participation}/${name}: empty`);
      assert.equal(show(participation, name, { ...empty, items: [{ id: 'archived', classroom: { archived: true } }] }), true, `${participation}/${name}: authorized history`);
    }
  }
});

test('Home greeting follows the response display zone across UTC midnight', () => {
  const { homeGreetingDate } = helper();
  const value = homeGreetingDate('2026-10-26T01:30:00.000Z', 'America/Argentina/Buenos_Aires');
  assert.match(value.toLowerCase(), /domingo/);
  assert.match(value, /25/);
  assert.match(value.toLowerCase(), /octubre/);
});

test('Agenda date tiles keep all-day calendar dates stable and timed events in the display zone', () => {
  const { homeAgendaDate } = helper();
  const allDay = { id: 'day', allDay: true, date: '2026-10-26', startAt: null, timeZone: 'UTC' };
  for (const zone of ['America/Argentina/Buenos_Aires', 'Pacific/Kiritimati']) {
    const value = homeAgendaDate(allDay, zone);
    assert.equal(value.day, '26');
    assert.match(value.weekday.toLowerCase(), /lun/);
    assert.equal(value.dateTime, '2026-10-26');
  }
  const timed = { ...allDay, allDay: false, date: null, startAt: '2026-10-26T01:30:00.000Z' };
  const value = homeAgendaDate(timed, 'America/Argentina/Buenos_Aires');
  assert.equal(value.day, '25');
  assert.match(value.weekday.toLowerCase(), /dom/);
  assert.equal(value.dateTime, timed.startAt);
});
