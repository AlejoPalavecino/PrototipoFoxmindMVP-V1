import test from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

test('Agenda keeps the next deadline visible and every later deadline accessible without duplicating actions', async () => {
  const { Upcoming } = loadTsModule('apps/web/src/features/agenda/ui/Upcoming.tsx');
  const items = ['first', 'second', 'third'].map(id => ({ id, target: { kind: 'activity', activityId: id, classroomId: 'room' } }));
  const opened = [], onOpen = target => opened.push(target);
  let setBusy;
  const view = hookView(() => {
    const [busy, updateBusy] = useState(true);
    setBusy = updateBusy;
    return Upcoming({ items, loading: false, error: '', busy, onOpen, onRetry() {} });
  }, {});
  const cards = (tree = view.tree) => descendants(tree, node => node.type?.name === 'DeadlineCard');
  const dialog = () => descendants(view.tree, node => node.type?.name === 'Dialog')[0];
  try {
    await view.flush();
    assert.deepEqual(cards().map(card => card.props.item.id), ['first']);
    assert.equal(cards()[0].props.onOpen, onOpen);
    assert.equal(dialog(), undefined);
    const more = descendants(view.tree, node => node.type === 'button' && node.props['aria-haspopup'] === 'dialog')[0];
    assert.ok(more);
    more.props.onClick();
    await view.flush();
    assert.equal(dialog().props.title, 'Tus próximas entregas');
    assert.deepEqual(cards(dialog()).map(card => card.props.item.id), ['second', 'third']);
    assert.deepEqual(cards().map(card => card.props.item.id), ['first', 'second', 'third']);
    assert.ok(cards().every(card => card.props.busy === true));
    assert.deepEqual(opened, []);
    setBusy(false);
    await view.flush();
    cards(dialog())[0].props.onOpen(items[1].target);
    await view.flush();
    assert.deepEqual(opened, [items[1].target]);
    assert.equal(dialog(), undefined);
  } finally { view.close(); }
});
