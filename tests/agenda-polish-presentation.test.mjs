import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const presentation = () => loadTsModule('apps/agenda-ui/agenda-presentation.ts');

test('date-only headings retain their calendar date across browser zones and year boundaries', () => {
  const { selectedDayHeading } = presentation();
  const prior = process.env.TZ;
  try {
    for (const zone of ['Pacific/Kiritimati', 'America/Los_Angeles', 'UTC']) {
      process.env.TZ = zone;
      assert.deepEqual(selectedDayHeading('2026-10-28'), { title: 'Miércoles 28', subtitle: 'Octubre de 2026' });
      assert.deepEqual(selectedDayHeading('2027-01-01'), { title: 'Viernes 1', subtitle: 'Enero de 2027' });
    }
  } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
});

test('deadline tile and clock use the supplied classroom zone across midnight, month and year', () => {
  const { deadlineParts } = presentation();
  assert.deepEqual(deadlineParts('2026-10-27T01:00:00Z', 'America/Argentina/Buenos_Aires'), { day: '26', month: 'OCT', time: '22:00' });
  assert.deepEqual(deadlineParts('2027-01-01T01:05:00Z', 'America/Argentina/Buenos_Aires'), { day: '31', month: 'DIC', time: '22:05' });
  assert.deepEqual(deadlineParts('2026-12-31T15:00:00Z', 'Asia/Tokyo'), { day: '1', month: 'ENE', time: '00:00' });
  assert.deepEqual(deadlineParts('2026-10-27T01:00:00Z', 'UTC'), { day: '27', month: 'OCT', time: '01:00' });
});

test('all-day event label never converts absent instants or a viewer zone', () => {
  const { eventTimeLabel } = presentation();
  const item = { kind: 'PRIVATE_EVENT', startAt: null, endAt: null, startDate: '2026-10-28', endDateExclusive: '2026-10-29', event: { schedule: { kind: 'ALL_DAY' } } };
  assert.equal(eventTimeLabel(item), 'Día completo');
});

test('timed event clock uses saved schedule zone and includes both local dates for multi-day events', () => {
  const { eventTimeLabel } = presentation();
  const occurrence = { kind: 'PRIVATE_EVENT', startAt: '2026-10-28T12:00:00Z', endAt: '2026-10-28T13:00:00Z', event: { schedule: { kind: 'TIMED', timeZone: 'America/Argentina/Buenos_Aires' } } };
  const before = JSON.stringify(occurrence);
  assert.equal(eventTimeLabel(occurrence), '09:00 – 10:00');
  assert.equal(JSON.stringify(occurrence), before, 'Formatting must not mutate the projection');
  assert.equal(eventTimeLabel({ ...occurrence, endAt: '2026-10-29T13:00:00Z' }), '28 oct, 09:00 – 29 oct, 10:00');
  assert.equal(eventTimeLabel({ ...occurrence, startAt: '2026-12-31T23:00:00Z', endAt: '2027-01-01T04:00:00Z' }), '31 dic, 20:00 – 1 ene, 01:00');
});

test('monthly calendar preserves 42 accessible days, separate today/selection, navigation and Today callback', async () => {
  const { AgendaMonth } = loadTsModule('apps/agenda-ui/AgendaMonth.tsx');
  const calls = [];
  const view = hookView(AgendaMonth, { month: '2026-10', selected: '2026-10-28', zone: 'UTC', items: [], loading: false,
    onSelect: value => calls.push(value), onMonth: value => calls.push(value), onToday: () => calls.push('today') });
  await view.flush();
  const tree = view.tree;
  view.close();
  const buttons = descendants(tree, node => node.type === 'button');
  const days = buttons.filter(node => node.props['aria-pressed'] !== undefined);
  assert.equal(days.length, 42);
  assert.equal(days.filter(node => node.props['aria-pressed']).length, 1);
  assert.match(days.find(node => node.props['aria-pressed']).props['aria-label'], /28 de octubre/);
  buttons.find(node => node.props['aria-label'] === 'Mes anterior').props.onClick();
  buttons.find(node => node.props['aria-label'] === 'Mes siguiente').props.onClick();
  buttons.find(node => node.props.children === 'Hoy').props.onClick();
  days.find(node => node.props['aria-pressed']).props.onClick();
  assert.deepEqual(calls, [-1, 1, 'today', '2026-10-28']);
  const html = renderToStaticMarkup(tree);
  assert.match(html, /Evento personal/);
  assert.match(html, /Entrega del aula/);
});

test('deadline card keeps exact classroom zone date, state semantics and real activity target when busy changes', () => {
  const { DeadlineCard } = loadTsModule('apps/agenda-ui/Upcoming.tsx');
  const calls = [], item = { id: 'deadline', kind: 'ACADEMIC_DEADLINE', title: 'Trabajo sintético', classroomName: 'Aula sintética', deadlineAt: '2027-01-01T01:05:00Z', timeZone: 'America/Argentina/Buenos_Aires', role: 'student', pending: false, resubmission: true, target: { classroomId: 'room', activityId: 'activity' } };
  for (const busy of [false, true]) {
    const tree = DeadlineCard({ item, busy, onOpen: target => calls.push(target) });
    const html = renderToStaticMarkup(tree);
    for (const text of ['31', 'DIC', '22:05', item.title, item.classroomName, 'Estudio', 'Reentrega', 'Sin entrega pendiente']) assert.ok(html.includes(text), text);
    const button = descendants(tree, node => node.type === 'button')[0];
    assert.equal(button.props.disabled, busy);
    if (!busy) button.props.onClick();
  }
  assert.deepEqual(calls, [item.target]);
});

test('header preserves create callback without the removed calendar timezone controls', async () => {
  const { AgendaHeader } = loadTsModule('apps/agenda-ui/AgendaHeader.tsx');
  const calls = [], view = hookView(AgendaHeader, { zone: 'UTC', onCreate: () => calls.push('create'), onZone: value => calls.push(value) });
  try {
    await view.flush();
    const buttons = descendants(view.tree, node => node.type === 'button');
    buttons.find(node => node.props.className === 'primary').props.onClick();
    assert.equal(descendants(view.tree, node => node.type === 'select').length, 0);
    assert.deepEqual(calls, ['create']);
  } finally { view.close(); }
});
