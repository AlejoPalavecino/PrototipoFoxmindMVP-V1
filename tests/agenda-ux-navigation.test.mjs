import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('upcoming deadlines open on demand and close before navigating to the selected activity', async () => {
  const { Upcoming } = loadTsModule('apps/web/src/features/agenda/ui/Upcoming.tsx');
  const opened = [];
  const items = [1, 2, 3].map(id => ({ id: String(id), target: { kind: 'activity', activityId: String(id) } }));
  const view = hookView(Upcoming, { items, loading: false, error: '', busy: false, onRetry() {}, onOpen: target => opened.push(target) });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type?.name === 'DeadlineCard').length, 1);
    const trigger = descendants(view.tree, node => node.type === 'button' && node.props['aria-haspopup'] === 'dialog')[0];
    assert.ok(trigger, 'remaining deadlines have an explicit dialog trigger');
    trigger.props.onClick(); await view.flush();
    let dialog = descendants(view.tree, node => node.type?.name === 'Dialog')[0];
    const cards = descendants(dialog, node => node.type?.name === 'DeadlineCard');
    assert.deepEqual(cards.map(card => card.props.item.id), ['2', '3']);
    dialog.props.onClose(); await view.flush();
    assert.deepEqual(opened, []);
    trigger.props.onClick(); await view.flush();
    dialog = descendants(view.tree, node => node.type?.name === 'Dialog')[0];
    descendants(dialog, node => node.type?.name === 'DeadlineCard')[1].props.onOpen(items[2].target);
    await view.flush();
    assert.deepEqual(opened, [items[2].target]);
    assert.equal(descendants(view.tree, node => node.type?.name === 'Dialog').length, 0);
  } finally { view.close(); }
});

test('upcoming query failure uses error feedback and exposes the retry action', async () => {
  const { Upcoming } = loadTsModule('apps/web/src/features/agenda/ui/Upcoming.tsx');
  let retried = 0;
  const view = hookView(Upcoming, { items: [], loading: false, error: 'Unavailable', busy: false, onOpen() {}, onRetry: () => retried++ });
  try {
    await view.flush();
    const notice = descendants(view.tree, node => node.type?.name === 'Notice')[0];
    assert.equal(notice?.props.error, true);
    descendants(notice, node => node.type === 'button')[0].props.onClick();
    assert.equal(retried, 1);
  } finally { view.close(); }
});

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

test('compact month selection reveals the inline day and creates on that exact date', async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/ui/Agenda.tsx');
  const priorWindow = globalThis.window, priorStorage = globalThis.sessionStorage;
  globalThis.window = Object.assign(new EventTarget(), { matchMedia: () => ({ matches: true }) });
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-11', day: '2026-11-12', zone: 'UTC' }), setItem() {} };
  const api = { async list() { return { items: [], nextCursor: null }; }, async upcoming() { return { items: [] }; } };
  const view = hookView(Agenda, { api, onOpen() {} });
  const component = name => descendants(view.tree, node => node.type?.name === name)[0];
  try {
    await view.flush();
    assert.ok(component('AgendaMonth'), 'mobile starts in month view without a selection override');
    descendants(view.tree, node => node.type === 'button' && node.props.children === 'Mes')[0].props.onClick();
    await view.flush(); component('AgendaMonth').props.onSelect('2026-11-23'); await view.flush();
    assert.equal(component('Dialog'), undefined);
    const day = component('AgendaDay');
    assert.equal(day.props.day, '2026-11-23'); day.props.onCreate(); await view.flush();
    assert.equal(component('EventForm').props.day, '2026-11-23');
  } finally { view.close(); globalThis.window = priorWindow; globalThis.sessionStorage = priorStorage; }
});
