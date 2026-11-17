import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const room = { id: 'room-1', name: 'Matemática', division: '3 A', subject: 'Matemática', role: 'student', coverKey: 'blue', archived: false, timeZone: 'UTC' };
const timed = { id: 'event-1', title: 'Clase especial', source: 'ACADEMIC_DEADLINE', startAt: '2026-10-26T01:30:00.000Z', date: '2026-10-26', timeZone: 'UTC', allDay: false, classroom: room, target: { kind: 'activity', classroomId: 'room-1', activityId: 'activity-1' } };
const allDay = { ...timed, id: 'event-2', title: 'Jornada completa', source: 'PRIVATE_EVENT', startAt: null, date: '2026-10-26', allDay: true, classroom: null, target: { kind: 'private-event', eventId: 'event-2', occurrenceId: 'occ-2', date: '2026-10-26' } };

function walk(value) {
  if (Array.isArray(value)) return value.flatMap(walk);
  if (value == null || typeof value === 'boolean') return [];
  if (typeof value !== 'object') return [value];
  if (typeof value.type === 'function') return walk(value.type(value.props));
  return [value, ...walk(value.props?.children)];
}
const textOf = nodes => nodes.filter(node => typeof node === 'string' || typeof node === 'number').join(' ');

test('Teacher agenda uses the date tile once and keeps only local time or all-day below the title', () => {
  const { HomeAgendaRow } = loadTsModule('apps/web/src/features/home/queue/HomeRow.tsx');
  for(const [item,expected] of [[timed,'22:30'],[allDay,'Todo el día']]){
    const nodes=walk(HomeAgendaRow({item,timeZone:'America/Argentina/Buenos_Aires',onAction(){},dateInTileOnly:true,generatedAt:'2026-10-20T12:00:00Z'}));
    const timing=nodes.find(node=>node?.props?.className==='fm-home-agenda-time');
    assert.equal(textOf(walk(timing)),expected);
    assert.equal(nodes.filter(node=>node?.type==='time').length,1);
  }
});

test('Agenda time converts timed events across zones and preserves all-day labels', () => {
  const { homeAgendaTime } = loadTsModule('apps/web/src/features/home/model/home-presentation.ts');
  assert.equal(homeAgendaTime(timed, 'America/Argentina/Buenos_Aires'), '22:30');
  assert.equal(homeAgendaTime(timed, 'UTC'), '01:30');
  for (const zone of ['America/Argentina/Buenos_Aires', 'Pacific/Kiritimati']) {
    assert.equal(homeAgendaTime(allDay, zone), 'Todo el día');
  }
});

test('Agenda preview presents event, converted time and type with the exact action target', () => {
  const { HomeAgendaRow } = loadTsModule('apps/web/src/features/home/queue/HomeRow.tsx');
  const calls = [];
  const nodes = walk(HomeAgendaRow({ item: timed, timeZone: 'America/Argentina/Buenos_Aires', onAction: target => calls.push(target) }));
  const text = textOf(nodes);
  assert.match(text, /Clase especial/);
  assert.match(text, /Matemática/);assert.match(text,/3 A/);
  assert.match(text, /22:30/);
  assert.doesNotMatch(text, /UTC|Zona original/);
  const button = nodes.find(node => node?.type === 'button' && node.props['aria-label'] === 'Abrir: Clase especial');
  assert.ok(button);
  assert.ok(!button.props.disabled);
  button.props.onClick();
  assert.equal(calls.length, 1);
  assert.strictEqual(calls[0], timed.target);
});

test('All-day agenda row exposes its label and respects disabled action state', () => {
  const { HomeAgendaRow } = loadTsModule('apps/web/src/features/home/queue/HomeRow.tsx');
  const nodes = walk(HomeAgendaRow({ item: allDay, timeZone: 'UTC', onAction() {}, busy: true }));
  const text = textOf(nodes);
  assert.match(text, /Jornada completa/);
  assert.match(text, /Todo el día/);
  const button = nodes.find(node => node?.type === 'button' && node.props['aria-label'] === 'Abrir: Jornada completa');
  assert.ok(button);
  assert.equal(button.props.disabled, true);
});
