import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('month navigation preserves selected day and clamps at month end, including leap years', async () => {
  const { useAgendaView } = loadTsModule('apps/web/src/features/agenda/model/useAgendaView.ts');
  const prior = globalThis.sessionStorage;
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-01', day: '2026-01-31', zone: 'UTC' }), setItem() {} };
  const view = hookView(useAgendaView, {});
  try {
    await view.flush(); view.tree.move(1); await view.flush();
    assert.equal(view.tree.day, '2026-02-28');
    view.tree.select('2028-01-31'); await view.flush(); view.tree.move(1); await view.flush();
    assert.equal(view.tree.day, '2028-02-29');
    view.tree.select('2026-12-18'); await view.flush(); view.tree.move(1); await view.flush();
    assert.equal(view.tree.day, '2027-01-18');
    view.tree.move(-1); await view.flush(); assert.equal(view.tree.day, '2026-12-18');
  } finally { view.close(); globalThis.sessionStorage = prior; }
});

test('compact month selection opens daily details and creates on that exact date', async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/ui/Agenda.tsx');
  const priorWindow = globalThis.window, priorStorage = globalThis.sessionStorage;
  globalThis.window = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: true }) });
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-11', day: '2026-11-12', zone: 'UTC' }), setItem() {} };
  const api = { async list() { return { items: [], nextCursor: null }; }, async upcoming() { return { items: [] }; } };
  const view = hookView(Agenda, { api, onOpen() {} });
  const component = name => descendants(view.tree, node => node.type?.name === name)[0];
  try {
    await view.flush();
    descendants(view.tree, node => node.type === 'button' && node.props.children === 'Mes')[0].props.onClick();
    await view.flush(); component('AgendaMonth').props.onSelect('2026-11-23'); await view.flush();
    const sheet = component('Dialog'); assert.equal(sheet.props.title, 'Eventos del día');
    const day = descendants(sheet, node => node.type?.name === 'AgendaDay')[0];
    assert.equal(day.props.day, '2026-11-23'); day.props.onCreate(); await view.flush();
    assert.equal(component('Dialog'), undefined); assert.equal(component('EventForm').props.day, '2026-11-23');
  } finally { view.close(); globalThis.window = priorWindow; globalThis.sessionStorage = priorStorage; }
});
