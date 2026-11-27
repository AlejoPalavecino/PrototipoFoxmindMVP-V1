import test from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';

const { useResetOnChange } = loadTsModule('apps/shared-ui/use-reset-on-change.ts');
const { useScopedValue } = loadTsModule('apps/web/src/shared/use-scoped-value.ts');

function Resettable({ onMount, initial }) {
  const [id, setId] = useState('a'), [open, setOpen] = useState(initial);
  useResetOnChange([id], () => setOpen(false), onMount);
  return { open, setOpen, setId };
}

test('useResetOnChange resets only when its keys change', async () => {
  const view = hookView(Resettable, { onMount: false, initial: true });
  await view.flush();
  assert.equal(view.tree.open, true, 'without onMount the first render keeps the initial state');
  view.tree.setId('a');
  await view.flush();
  assert.equal(view.tree.open, true, 'the same key keeps the state');
  view.tree.setId('b');
  await view.flush();
  assert.equal(view.tree.open, false, 'a new key resets');
  view.tree.setOpen(true);
  await view.flush();
  assert.equal(view.tree.open, true, 'state changes freely until the key changes again');
  view.close();
});

test('useResetOnChange with onMount also adjusts the first render', async () => {
  const view = hookView(Resettable, { onMount: true, initial: true });
  await view.flush();
  assert.equal(view.tree.open, false);
  view.close();
});

function Scoped({ created }) {
  const [scope, setScope] = useState('u1'), [, setTick] = useState(0);
  const value = useScopedValue(() => { created.push(scope); return { scope }; }, [scope]);
  return { value, setScope, rerender: () => setTick(tick => tick + 1) };
}

test('useScopedValue keeps one instance per scope', async () => {
  const created = [];
  const view = hookView(Scoped, { created });
  await view.flush();
  const first = view.tree.value;
  view.tree.rerender();
  await view.flush();
  assert.equal(view.tree.value, first, 'the same scope keeps the instance');
  view.tree.setScope('u2');
  await view.flush();
  assert.notEqual(view.tree.value, first);
  assert.equal(view.tree.value.scope, 'u2');
  assert.deepEqual(created, ['u1', 'u2']);
  view.close();
});
