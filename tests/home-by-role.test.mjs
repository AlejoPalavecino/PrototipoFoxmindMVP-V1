import test from 'node:test';
import assert from 'node:assert/strict';
import { homeFoxySuggestion, homeCalendarWeek } from '../apps/web/src/features/home/model/home-presentation.ts';
import { parseHomePage } from '../src/core/domain/home/rows-validation.ts';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
import {descendants} from './agenda-ui-helpers.test.mjs';

test('featured delivery keeps preparation and read-only consultation as distinct destinations',()=>{
 const {HomeRow}=loadTsModule('apps/web/src/features/home/ui/HomeRow.tsx'),calls=[];
 const item={id:'activity',title:'Campo',activityType:'ASSIGNMENT',classroom:{id:'room',name:'Biología',division:'A'},reception:'open',attemptId:null,deadlineAt:null,target:{kind:'activity',classroomId:'room',activityId:'activity'}};
 const node=HomeRow({item,module:'pending',featured:true,timeZone:'UTC',onAction:value=>calls.push(value)}),tree=node.type(node.props);
 const buttons=descendants(tree,n=>n.type==='button');assert.equal(calls.length,0);buttons[0].props.onClick();buttons[1].props.onClick();
 assert.deepEqual(calls,[{...item.target,mode:'respond'},item.target]);
});

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
  assert.equal(week[4].date, '2026-10-30');
  assert.equal(week.some(day=>day.today), false);
  const daylight = homeCalendarWeek('2026-11-01T07:00:00Z', 'America/New_York');
  assert.equal(daylight.filter(day => day.today).length, 0);
  assert.equal(new Set(daylight.map(day => day.date)).size, 5);
});


test('Agenda preview keeps local time and type without technical zone or room metadata', () => {
  const { HomeAgendaRow } = loadTsModule('apps/web/src/features/home/ui/HomeRow.tsx');
  const item = { id: 'event', title: 'Revisar entregas', source: 'PRIVATE_EVENT', allDay: false,
    startAt: '2026-11-16T19:00:00Z', date: '2026-11-16', timeZone: 'America/Argentina/Buenos_Aires',
    classroom: { name: 'No duplicar contexto', division: 'A' }, target: { kind: 'private-event' } };
  const html = renderToStaticMarkup(HomeAgendaRow({ item, timeZone: 'America/Argentina/Buenos_Aires', generatedAt: '2026-11-12T12:00:00Z', onAction() {} }));
  assert.match(html, /16:00/);
  assert.match(html, /16 nov/);
  assert.doesNotMatch(html, /Zona|America\/|No duplicar contexto/);
  const allDay = renderToStaticMarkup(HomeAgendaRow({ item: { ...item, allDay: true }, timeZone: 'UTC', onAction() {} }));
  assert.match(allDay, /Todo el día/);
});

test('Circular classroom progress reports topics taught, preserves zero and avoids empty-plan percentages', () => {
  const { HomeRow } = loadTsModule('apps/web/src/features/home/ui/HomeRow.tsx');
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
