import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants, deferred } from './agenda-ui-helpers.test.mjs';

for (const entryPoint of ['Upcoming', 'AgendaDay']) test(`opening a revoked deadline from ${entryPoint} removes stale data even when refresh fails`, async () => {
  const { Agenda } = loadTsModule('apps/agenda-ui/Agenda.tsx');
  const { AgendaClientError } = loadTsModule('apps/agenda-ui/api.ts');
  const target = { classroomId: randomUUID(), activityId: randomUUID() };
  const deadline = { kind: 'ACADEMIC_DEADLINE', id: randomUUID(), target, classroomName: 'Aula acceso perdido',
    title: 'Entrega anteriormente visible', activityType: 'ASSIGNMENT', role: 'student',
    deadlineAt: '2026-11-01T18:00:00.000Z', timeZone: 'UTC', pending: true, resubmission: false };
  const pendingList = deferred(), pendingUpcoming = deferred(), opens = [], navigations = [];
  let phase = 'visible', lists = 0, upcoming = 0;
  const api = {
    async list() {
      lists++;
      if (phase === 'refresh-pending') return pendingList.promise;
      return { serverTime: '2026-11-01T12:00:00.000Z', items: phase === 'visible' ? [deadline] : [], nextCursor: null };
    },
    async upcoming() {
      upcoming++;
      if (phase === 'refresh-pending') return pendingUpcoming.promise;
      return { serverTime: '2026-11-01T12:00:00.000Z', items: phase === 'visible' ? [deadline] : [] };
    },
    async open(value) { opens.push(value); phase = 'refresh-pending'; throw new AgendaClientError('FORBIDDEN', 403); },
  };
  const previousWindow = globalThis.window, previousStorage = globalThis.sessionStorage;
  globalThis.window = new EventTarget();
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-11', day: '2026-11-01', zone: 'UTC' }) };
  const view = hookView(Agenda, { api, onOpen: value => navigations.push(value) });
  const component = name => descendants(view.tree, node => node.type.name === name)[0];
  try {
    await view.flush();
    assert.ok(renderToStaticMarkup(view.tree).includes(deadline.title), 'Fixture must be visible before access changes');
    assert.equal(component('AgendaMonth').props.items.length, 1);
    assert.equal(component('AgendaDay').props.items.length, 1);
    assert.equal(component('Upcoming').props.items.length, 1);
    const initialLists = lists, initialUpcoming = upcoming;
    component(entryPoint).props.onOpen(target); await view.flush();
    assert.deepEqual(opens, [target]); assert.deepEqual(navigations, []);
    assert.equal(component('AgendaMonth').props.items.length, 0, 'Revoked content must leave the calendar immediately, before refresh settles');
    assert.equal(component('Upcoming').props.items.length, 0, 'Revoked upcoming content must leave immediately');
    assert.ok(!renderToStaticMarkup(view.tree).includes(deadline.title));
    assert.ok(lists > initialLists && upcoming > initialUpcoming, 'Access denial must revalidate both projections');
    pendingList.reject(new AgendaClientError('SERVICE_UNAVAILABLE', 503));
    pendingUpcoming.reject(new AgendaClientError('SERVICE_UNAVAILABLE', 503)); await view.flush();
    assert.equal(component('AgendaMonth').props.items.length, 0);
    assert.equal(component('Upcoming').props.items.length, 0);
    const html = renderToStaticMarkup(view.tree);
    assert.ok(!html.includes(deadline.title)); assert.ok(!html.includes(deadline.classroomName));
    assert.ok(html.includes('role="alert"'), 'An error must remain visible after failed revalidation');
    const retry = descendants(view.tree, node => node.type === 'button' && node.props.children === 'Volver a intentar')[0];
    assert.ok(retry, 'Failed refresh must expose a real retry action');
    const failedReads = lists; phase = 'recovered'; retry.props.onClick(); await view.flush();
    assert.ok(lists > failedReads); assert.equal(component('AgendaMonth').props.items.length, 0);
    assert.equal(component('Upcoming').props.items.length, 0);
    assert.ok(!renderToStaticMarkup(view.tree).includes(deadline.title));
  } finally {
    view.close();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage;
  }
});

test('a delayed forbidden open after month navigation revalidates the current month without restoring the old range', async () => {
  const { Agenda } = loadTsModule('apps/agenda-ui/Agenda.tsx');
  const { AgendaClientError } = loadTsModule('apps/agenda-ui/api.ts');
  const target = { classroomId: randomUUID(), activityId: randomUUID() };
  const old = { kind: 'ACADEMIC_DEADLINE', id: randomUUID(), target, classroomName: 'Aula revocada noviembre',
    title: 'Entrega revocada noviembre', activityType: 'ASSIGNMENT', role: 'student',
    deadlineAt: '2026-11-01T18:00:00.000Z', timeZone: 'UTC', pending: true, resubmission: false };
  const december = { ...old, id: randomUUID(), target: { classroomId: randomUUID(), activityId: randomUUID() },
    classroomName: 'Aula vigente diciembre', title: 'Entrega vigente diciembre', deadlineAt: '2026-12-01T18:00:00.000Z' };
  const november = { ...old, id: randomUUID(), target: { classroomId: randomUUID(), activityId: randomUUID() },
    classroomName: 'Otra aula noviembre', title: 'Otra entrega noviembre' };
  const opening = deferred(), decemberList = deferred(), latestUpcoming = deferred();
  const queries = [], navigations = [];
  let denied = false, navigated = false;
  const page = items => ({ serverTime: '2026-11-01T12:00:00.000Z', items, nextCursor: null });
  const api = {
    async list(range, _cursor, signal) {
      queries.push({ ...range, signal });
      if (range.startDate === '2026-12-01') return decemberList.promise;
      return page(denied ? [november] : [old]);
    },
    async upcoming() { return navigated ? latestUpcoming.promise : page([old]); },
    async open(value) { assert.deepEqual(value, target); return opening.promise; },
  };
  const previousWindow = globalThis.window, previousStorage = globalThis.sessionStorage;
  globalThis.window = new EventTarget();
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-11', day: '2026-11-01', zone: 'UTC' }) };
  const view = hookView(Agenda, { api, onOpen: value => navigations.push(value) });
  const component = name => descendants(view.tree, node => node.type.name === name)[0];
  try {
    await view.flush();
    assert.ok(renderToStaticMarkup(view.tree).includes(old.title));
    component('Upcoming').props.onOpen(target); await view.flush();
    navigated = true; component('AgendaMonth').props.onMonth(1); await view.flush();
    assert.equal(component('AgendaMonth').props.month, '2026-12');
    assert.equal(queries.at(-1).startDate, '2026-12-01');
    assert.equal(component('AgendaMonth').props.items.length, 0, 'Navigation must clear the previous range while December is pending');
    denied = true; opening.reject(new AgendaClientError('FORBIDDEN', 403)); await view.flush();
    assert.ok(!renderToStaticMarkup(view.tree).includes(old.title), 'A denied target must remain absent while revalidation is pending');
    decemberList.resolve(page([december])); latestUpcoming.resolve(page([december])); await view.flush();
    assert.deepEqual(navigations, []);
    assert.equal(component('AgendaMonth').props.month, '2026-12');
    assert.deepEqual(component('AgendaMonth').props.items.map(item => item.id), [december.id],
      'The late November open handler must not replace the selected December range with November data');
    assert.equal(component('AgendaDay').props.day, '2026-12-01');
    assert.deepEqual(component('AgendaDay').props.items.map(item => item.id), [december.id]);
    assert.deepEqual(component('Upcoming').props.items.map(item => item.id), [december.id]);
    const html = renderToStaticMarkup(view.tree);
    assert.ok(html.includes(december.title)); assert.ok(html.includes('role="alert"'));
    assert.ok(!html.includes(old.title)); assert.ok(!html.includes(old.classroomName));
    assert.ok(!html.includes(november.title));
  } finally {
    view.close();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage;
  }
});
