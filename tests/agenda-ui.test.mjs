import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants, deferred } from './agenda-ui-helpers.test.mjs';

for (const entryPoint of ['AgendaAfterDay', 'AgendaDay']) test(`opening a revoked deadline from ${entryPoint} removes stale data even when refresh fails`, async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/ui/Agenda.tsx');
  const { AgendaClientError } = loadTsModule('apps/web/src/features/agenda/api/api.ts');
  const target = { classroomId: randomUUID(), activityId: randomUUID() };
  const deadline = { kind: 'ACADEMIC_DEADLINE', id: randomUUID(), target, classroomName: 'Aula acceso perdido',
    title: 'Entrega anteriormente visible', activityType: 'ASSIGNMENT', role: 'student',
    deadlineAt: entryPoint === 'AgendaAfterDay' ? '2026-11-02T18:00:00.000Z' : '2026-11-01T18:00:00.000Z', timeZone: 'UTC', pending: true, resubmission: false };
  const pendingList = deferred(), pendingUpcoming = deferred(), opens = [], navigations = [];
  let phase = 'visible', lists = 0, upcoming = 0;
  const api = {
    async list(range) {
      const after = range.startDate === '2026-11-02';
      if (after) upcoming++; else lists++;
      if (phase === 'refresh-pending') return after ? pendingUpcoming.promise : pendingList.promise;
      const visible = phase === 'visible' && (!after || entryPoint === 'AgendaAfterDay');
      return { serverTime: '2026-11-01T12:00:00.000Z', items: visible ? [deadline] : [], nextCursor: null };
    },
    async upcoming() { return { items: [] }; },
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
    assert.equal(component('AgendaAfterDay').props.items.length, Number(entryPoint === 'AgendaAfterDay'));
    const initialLists = lists, initialUpcoming = upcoming;
    component(entryPoint).props.onOpen(target); await view.flush();
    assert.deepEqual(opens, [target]); assert.deepEqual(navigations, []);
    assert.equal(component('AgendaMonth').props.items.length, 0, 'Revoked content must leave the calendar immediately, before refresh settles');
    assert.equal(component('AgendaAfterDay').props.items.length, 0, 'Revoked upcoming content must leave immediately');
    assert.ok(!renderToStaticMarkup(view.tree).includes(deadline.title));
    assert.ok(lists > initialLists && upcoming > initialUpcoming, 'Access denial must revalidate both projections');
    pendingList.reject(new AgendaClientError('SERVICE_UNAVAILABLE', 503));
    pendingUpcoming.reject(new AgendaClientError('SERVICE_UNAVAILABLE', 503)); await view.flush();
    assert.equal(component('AgendaMonth').props.items.length, 0);
    assert.equal(component('AgendaAfterDay').props.items.length, 0);
    const html = renderToStaticMarkup(view.tree);
    assert.ok(!html.includes(deadline.title)); assert.ok(!html.includes(deadline.classroomName));
    assert.ok(html.includes('role="alert"'), 'An error must remain visible after failed revalidation');
    const retry = descendants(view.tree, node => node.type === 'button' && node.props.children === 'Volver a intentar')[0];
    assert.ok(retry, 'Failed refresh must expose a real retry action');
    const failedReads = lists; phase = 'recovered'; retry.props.onClick(); await view.flush();
    assert.ok(lists > failedReads); assert.equal(component('AgendaMonth').props.items.length, 0);
    assert.equal(component('AgendaAfterDay').props.items.length, 0);
    assert.ok(!renderToStaticMarkup(view.tree).includes(deadline.title));
  } finally {
    view.close();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage;
  }
});

test('a delayed forbidden open after month navigation revalidates the current month without restoring the old range', async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/ui/Agenda.tsx');
  const { AgendaClientError } = loadTsModule('apps/web/src/features/agenda/api/api.ts');
  const target = { classroomId: randomUUID(), activityId: randomUUID() };
  const old = { kind: 'ACADEMIC_DEADLINE', id: randomUUID(), target, classroomName: 'Aula revocada noviembre',
    title: 'Entrega revocada noviembre', activityType: 'ASSIGNMENT', role: 'student',
    deadlineAt: '2026-11-02T18:00:00.000Z', timeZone: 'UTC', pending: true, resubmission: false };
  const december = { ...old, id: randomUUID(), target: { classroomId: randomUUID(), activityId: randomUUID() },
    classroomName: 'Aula vigente diciembre', title: 'Entrega vigente diciembre', deadlineAt: '2026-12-01T18:00:00.000Z' };
  const november = { ...old, id: randomUUID(), target: { classroomId: randomUUID(), activityId: randomUUID() },
    classroomName: 'Otra aula noviembre', title: 'Otra entrega noviembre' };
  const afterDecember = { ...december, id: randomUUID(), title: 'Entrega vigente posterior', deadlineAt: '2026-12-02T18:00:00.000Z' };
  const opening = deferred(), decemberList = deferred(), latestUpcoming = deferred();
  const queries = [], navigations = [];
  let denied = false, navigated = false;
  const page = items => ({ serverTime: '2026-11-01T12:00:00.000Z', items, nextCursor: null });
  const api = {
    async list(range, _cursor, signal) {
      queries.push({ ...range, signal });
      if (range.startDate === '2026-11-30') return decemberList.promise;
      if (range.startDate === '2026-12-02') return latestUpcoming.promise;
      return page(denied ? [november] : [old]);
    },
    async upcoming() { return page([]); },
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
    component('AgendaAfterDay').props.onOpen(target); await view.flush();
    navigated = true; component('AgendaMonth').props.onMonth(1); await view.flush();
    assert.equal(component('AgendaMonth').props.month, '2026-12');
    assert.ok(queries.some(query => query.startDate === '2026-11-30'), 'The December grid includes its visible Monday in November');
    assert.ok(queries.some(query => query.startDate === '2026-12-02' && query.endDateExclusive === '2027-01-02'), 'The after-day projection follows the selected day across the year boundary');
    assert.equal(component('AgendaMonth').props.items.length, 0, 'Navigation must clear the previous range while December is pending');
    denied = true; opening.reject(new AgendaClientError('FORBIDDEN', 403)); await view.flush();
    assert.ok(!renderToStaticMarkup(view.tree).includes(old.title), 'A denied target must remain absent while revalidation is pending');
    decemberList.resolve(page([december])); latestUpcoming.resolve(page([afterDecember])); await view.flush();
    assert.deepEqual(navigations, []);
    assert.equal(component('AgendaMonth').props.month, '2026-12');
    assert.deepEqual(component('AgendaMonth').props.items.map(item => item.id), [december.id],
      'The late November open handler must not replace the selected December range with November data');
    assert.equal(component('AgendaDay').props.day, '2026-12-01');
    assert.deepEqual(component('AgendaDay').props.items.map(item => item.id), [december.id]);
    assert.deepEqual(component('AgendaAfterDay').props.items.map(item => item.id), [afterDecember.id]);
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

for (const failing of ['calendar', 'afterDay']) test(`Agenda isolates a ${failing} failure and retries only that section`, async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/ui/Agenda.tsx');
  const originalWindow = globalThis.window, originalStorage = globalThis.sessionStorage;
  globalThis.window = new EventTarget();
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-11', day: '2026-11-01', zone: 'UTC' }) };
  const calls = { calendar: 0, afterDay: 0 };
  const query = part => {
    if (++calls[part] === 1 && part === failing) throw Error('Error sintético');
    return { items: [{ id: part }], nextCursor: null };
  };
  const view = hookView(Agenda, { api: { list: async range => query(range.startDate === '2026-11-02' ? 'afterDay' : 'calendar'), upcoming: async () => ({ items: [] }) }, onOpen() {} });
  const component = name => descendants(view.tree, node => node.type.name === name)[0];
  try {
    await view.flush();
    if (failing === 'afterDay') {
      assert.equal(component('AgendaDay')?.props.items[0]?.id, 'calendar');
      component('AgendaAfterDay').props.onRetry();
    } else {
      assert.equal(component('AgendaAfterDay').props.items[0]?.id, 'afterDay');
      descendants(view.tree, node => node.type === 'button' && node.props.children === 'Volver a intentar')[0].props.onClick();
    }
    await view.flush();
    assert.deepEqual(calls, { calendar: failing === 'calendar' ? 2 : 1, afterDay: failing === 'afterDay' ? 2 : 1 });
    assert.equal(component('AgendaDay').props.items[0].id, 'calendar');
    assert.equal(component('AgendaAfterDay').props.items[0].id, 'afterDay');
  } finally {
    view.close();
    globalThis.window = originalWindow;
    globalThis.sessionStorage = originalStorage;
  }
});
