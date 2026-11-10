import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

test('selecting a calendar day keeps the monthly grid and updates the selected day panel', async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/ui/Agenda.tsx');
  const previousWindow = globalThis.window, previousStorage = globalThis.sessionStorage;
  globalThis.window = new EventTarget();
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-11', day: '2026-11-02', zone: 'UTC' }), setItem() {} };
  let writes = 0;
  const page = { serverTime: '2026-11-01T12:00:00.000Z', items: [], nextCursor: null };
  const api = { async list() { return page; }, async upcoming() { return page; }, async put() { writes++; } };
  const view = hookView(Agenda, { api, onOpen() {} });
  const component = name => descendants(view.tree, node => node.type?.name === name)[0];
  const button = name => descendants(view.tree, node => node.type === 'button' && node.props.children === name)[0];
  try {
    await view.flush();
    assert.equal(component('AgendaMonth').props.selected, '2026-11-02');
    component('AgendaMonth').props.onSelect('2026-11-19');
    await view.flush();
    assert.ok(component('AgendaMonth'), 'The monthly calendar remains visible after selecting a day');
    assert.equal(component('AgendaMonth').props.selected, '2026-11-19');
    assert.equal(component('AgendaDay').props.day, '2026-11-19');
    assert.equal(button('Mes').props['aria-pressed'], true);
    assert.equal(writes, 0, 'Selecting a day never writes an event');
    button('Día').props.onClick(); await view.flush();
    assert.equal(button('Día').props['aria-pressed'], true, 'Explicit day mode remains available');
    assert.equal(component('AgendaPeriod').props.day, '2026-11-19');
  } finally {
    view.close();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage;
  }
});

test('compact Agenda starts on the selected day and keeps an explicit switch to month', async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/ui/Agenda.tsx');
  const previousWindow = globalThis.window, previousStorage = globalThis.sessionStorage;
  globalThis.window = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: true }) });
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-11', day: '2026-11-02', zone: 'UTC' }), setItem() {} };
  const ranges = [];
  const page = { serverTime: '2026-11-01T12:00:00.000Z', items: [], nextCursor: null };
  const api = { async list(range) { ranges.push(range); return page; }, async upcoming() { return page; } };
  const view = hookView(Agenda, { api, onOpen() {} });
  const component = name => descendants(view.tree, node => node.type?.name === name)[0];
  const button = name => descendants(view.tree, node => node.type === 'button' && node.props.children === name)[0];
  try {
    await view.flush();
    assert.equal(button('Día').props['aria-pressed'], true);
    assert.equal(component('AgendaDay').props.day, '2026-11-02');
    assert.deepEqual(ranges.map(({startDate,endDateExclusive})=>({startDate,endDateExclusive})),[
      {startDate:'2026-11-02',endDateExclusive:'2026-11-03'},
      {startDate:'2026-11-03',endDateExclusive:'2026-12-04'},
    ], 'Only the selected day and its subsequent 31 days are requested after hydration');
    button('Mes').props.onClick();
    await view.flush();
    assert.equal(component('AgendaMonth').props.selected, '2026-11-02');
    assert.equal(button('Mes').props['aria-pressed'], true);
  } finally {
    view.close();
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousStorage === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previousStorage;
  }
});
