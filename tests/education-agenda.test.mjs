import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';

test('Agenda keeps the next deadline visible and every later deadline accessible without duplicating actions', () => {
  const { Upcoming } = loadTsModule('apps/agenda-ui/Upcoming.tsx');
  const items = ['first', 'second', 'third'].map(id => ({ id })), onOpen = () => {};
  const tree = Upcoming({ items, loading: false, error: '', busy: true, onOpen });
  const details = descendants(tree, n => n.type === 'details')[0];
  assert.ok(details); assert.ok(!details.props.open);
  const all = descendants(tree, n => n.type?.name === 'DeadlineCard');
  assert.deepEqual(all.map(n => n.props.item.id), ['first', 'second', 'third']);
  assert.deepEqual(descendants(details, n => n.type?.name === 'DeadlineCard').map(n => n.props.item.id), ['second', 'third']);
  for (const card of all) { assert.equal(card.props.onOpen, onOpen); assert.equal(card.props.busy, true); }
});
