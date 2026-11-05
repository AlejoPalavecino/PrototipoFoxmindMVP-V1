import test from 'node:test';
import assert from 'node:assert/strict';
import { homeFoxySuggestion, homeCalendarWeek } from '../apps/classrooms-ui/home-presentation.ts';
import { parseHomePage } from '../src/core/domain/home-rows-validation.ts';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { renderToStaticMarkup } from 'react-dom/server';

test('Foxy suggests the first actionable delivery and ignores closed reception', () => {
  const modules = { pending: { status: 'ready', items: [
    { title: 'Cerrada', reception: 'closed' }, { title: 'Geometría', reception: 'open' }
  ] } };
  assert.match(homeFoxySuggestion('student', modules).detail, /Geometría/);
  assert.doesNotMatch(homeFoxySuggestion('student', modules).detail, /Cerrada/);
});

test('Foxy prioritizes reviews and falls back to unanswered questions', () => {
  const queries = { status: 'ready', items: [{ classroom: { name: 'Historia' } }] };
  const review = { status: 'ready', items: [{ title: 'Mapas', needsReview: 2 }] };
  assert.match(homeFoxySuggestion('teacher', { review, queries }).detail, /Mapas/);
  assert.match(homeFoxySuggestion('teacher', { review: { status: 'error' }, queries }).detail, /Historia/);
  assert.equal(homeFoxySuggestion('student', { review, queries }).title, 'Cada paso cuenta.');
});

test('Classroom summaries accept optional progress for active teacher and student rooms', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const classroom = { id, name: 'Historia', division: 'A', subject: 'Historia', role: 'teacher',
    coverKey: 'general', archived: false, timeZone: 'UTC' };
  const item = { id, title: classroom.name, classroom, target: { kind: 'classroom', classroomId: id, section: 'plan' } };
  const read = row => parseHomePage('classrooms', { status: 'ready', items: [row], totalItems: 1, nextCursor: null });
  assert.deepEqual(read(item).items[0], item);
  const planProgress = { taught: 1, total: 3 };
  assert.deepEqual(read({ ...item, planProgress }).items[0].planProgress, planProgress);
  assert.deepEqual(read({ ...item, classroom: { ...classroom, role: 'student' }, planProgress }).items[0].planProgress, planProgress);
  for (const patch of [{ archived: true }]) {
    assert.throws(() => read({ ...item, classroom: { ...classroom, ...patch }, planProgress }), { code: 'INVALID_INPUT' });
  }
  assert.throws(() => read({ ...item, planProgress: { taught: 4, total: 3 } }), { code: 'INVALID_INPUT' });
});

test('The calendar week follows the display zone, crossing months and daylight saving', () => {
  const week = homeCalendarWeek('2026-11-02T01:00:00Z', 'America/Argentina/Buenos_Aires');
  assert.equal(week[0].date, '2026-10-26');
  assert.equal(week[6].date, '2026-11-01');
  assert.equal(week[6].today, true);
  const daylight = homeCalendarWeek('2026-11-01T07:00:00Z', 'America/New_York');
  assert.equal(daylight.filter(day => day.today).length, 1);
  assert.equal(new Set(daylight.map(day => day.date)).size, 7);
});

test('Foxy opens the exact authorized target or the classroom fallback', () => {
  const { HomeFoxyNote } = loadTsModule('apps/classrooms-ui/HomeFoxyNote.tsx');
  const descendants = node => !node || typeof node !== 'object' ? [] :
    [node, ...[node.props?.children].flat(Infinity).flatMap(descendants)];
  const target = { kind: 'wall', classroomId: 'classroom', postId: 'post' };
  const calls = [];
  const modules = { queries: { status: 'ready', items: [{ title: 'Consulta', classroom: { name: 'Historia' }, target }] } };
  const props = { role: 'teacher', modules, onAction: value => calls.push(value), onClassrooms: () => calls.push('classrooms') };
  const action = descendants(HomeFoxyNote(props)).find(node => node.type === 'button');
  action.props.onClick();
  assert.strictEqual(calls[0], target);
  const fallback = descendants(HomeFoxyNote({ ...props, role: 'student', busy: true })).find(node => node.type === 'button');
  assert.equal(fallback.props.disabled, true);
  descendants(HomeFoxyNote({ ...props, role: 'student' })).find(node => node.type === 'button').props.onClick();
  assert.equal(calls[1], 'classrooms');
});

test('Agenda preview keeps local time and type without technical zone or room metadata', () => {
  const { HomeAgendaRow } = loadTsModule('apps/classrooms-ui/HomeRow.tsx');
  const item = { id: 'event', title: 'Revisar entregas', source: 'PRIVATE_EVENT', allDay: false,
    startAt: '2026-11-16T19:00:00Z', date: '2026-11-16', timeZone: 'America/Argentina/Buenos_Aires',
    classroom: { name: 'No duplicar contexto', division: 'A' }, target: { kind: 'private-event' } };
  const html = renderToStaticMarkup(HomeAgendaRow({ item, timeZone: 'America/Buenos_Aires', onAction() {} }));
  assert.match(html, /16:00/);
  assert.match(html, /Evento personal/);
  assert.doesNotMatch(html, /Zona|America\/|No duplicar contexto/);
  const allDay = renderToStaticMarkup(HomeAgendaRow({ item: { ...item, allDay: true }, timeZone: 'UTC', onAction() {} }));
  assert.match(allDay, /Todo el día/);
});

test('Circular classroom progress reports topics taught, preserves zero and avoids empty-plan percentages', () => {
  const { HomeRow } = loadTsModule('apps/classrooms-ui/HomeRow.tsx');
  const base = { id: 'room', title: 'Historia', classroom: { name: 'Historia', division: 'A', role: 'teacher', coverKey: 'general' }, target: { kind: 'classroom' } };
  const render = planProgress => renderToStaticMarkup(HomeRow({ item: { ...base, planProgress }, module: 'classrooms', timeZone: 'UTC', onAction() {} }));
  const partial = render({ taught: 1, total: 4 });
  assert.match(partial, /role="progressbar"/);
  assert.match(partial, /aria-valuenow="25"/);
  assert.match(partial, /1 de 4 temas dados/);
  assert.match(render({ taught: 0, total: 4 }), /aria-valuenow="0"/);
  assert.match(render({ taught: 4, total: 4 }), /aria-valuenow="100"/);
  for (const progress of [undefined, { taught: 0, total: 0 }]) assert.doesNotMatch(render(progress), /role="progressbar"|\d+%/);
});
