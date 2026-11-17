import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { privateEvent } from './agenda-event-form-helpers.test.mjs';

async function withAgenda(run) {
  const originalWindow = globalThis.window, originalStorage = globalThis.sessionStorage;
  globalThis.window = Object.assign(new EventTarget(), { matchMedia: query => ({ matches: query.includes('max-width') }) });
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-10', day: '2026-10-27', zone: 'UTC' }), setItem() {} };
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/calendar/Agenda.tsx');
  const event = privateEvent(), ranges = [];
  let failed = false;
  const api = { list: async range => { ranges.push(range); if (failed) throw Error('Consulta no disponible'); return { items: [], nextCursor: null }; },
    upcoming: async () => ({ items: [] }), get: async () => event };
  const view = hookView(Agenda, { api, onOpen() {} });
  const component = name => descendants(view.tree, n => n.type?.name === name)[0];
  try { await view.flush(); await run({ view, component, event, ranges, setFailed: () => { failed = true; } }); }
  finally { view.close(); globalThis.window = originalWindow; globalThis.sessionStorage = originalStorage; }
}

test('month opens a compact day inline; day view queries the whole visible week without a second agenda panel', async () => {
  await withAgenda(async ({ view, component, ranges }) => {
    assert.equal(component('AgendaAfterDay'), undefined);
    assert.equal(ranges.length, 1);
    component('AgendaMonth').props.onSelect('2026-10-28'); await view.flush();
    assert.equal(component('Dialog'), undefined);
    assert.equal(component('AgendaDay').props.day, '2026-10-28');
    descendants(view.tree, n => n.type === 'button' && n.props.children === 'Día')[0].props.onClick(); await view.flush();
    assert.equal(component('AgendaPeriod').props.day, '2026-10-28');
    assert.deepEqual(ranges.at(-1), { startDate: '2026-10-26', endDateExclusive: '2026-11-02', timeZone: 'UTC' });
  });
});

test('event detail and edit keep the calendar mounted; closing edit returns to the same detail', async () => {
  await withAgenda(async ({ view, component, event }) => {
    component('AgendaDay').props.onEdit(event, '2026-10-27'); await view.flush();
    assert.ok(component('AgendaMonth'));
    const detail = component('EventDetails'); assert.ok(detail);
    detail.props.onEdit('series'); await view.flush();
    assert.ok(component('AgendaMonth'));
    assert.equal(component('EventDetails'), undefined);
    component('EventForm').props.onClose(); await view.flush();
    assert.equal(component('EventDetails').props.event.id, event.id);
    component('EventDetails').props.onBack(); await view.flush();
    assert.equal(component('EventDetails'), undefined);
    assert.equal(component('AgendaDay').props.day, '2026-10-27');
  });
});

test('a written event remains confirmed separately from a failed calendar reload', async () => {
  await withAgenda(async ({ view, component, event, setFailed }) => {
    component('AgendaHeader').props.onCreate(); await view.flush(); setFailed();
    component('EventForm').props.onSaved({ kind: 'saved', mode: 'created', event }); await view.flush();
    const html = renderToStaticMarkup(view.tree);
    assert.match(html, /class="[^"]*agenda-success[^"]*" role="status">Evento creado\./);
    assert.match(html, /role="alert">Consulta no disponible/);
    assert.doesNotMatch(html, /Evento creado\. No pudimos/);
  });
});

test('moving an individual event shows the saved date without changing the view', async () => {
  await withAgenda(async ({ view, component, event }) => {
    component('AgendaDay').props.onEdit(event, '2026-10-27'); await view.flush();
    component('EventDetails').props.onEdit('series'); await view.flush();
    const moved = { ...event, schedule: { kind: 'ALL_DAY', startDate: '2026-10-29', endDateExclusive: '2026-10-30' } };
    component('EventForm').props.onSaved({ kind: 'saved', mode: 'updated', event: moved });
    await view.flush();
    assert.equal(component('AgendaMonth').props.selected, '2026-10-29');
    assert.equal(component('AgendaDay').props.focusEventId, event.id);
  });
});
