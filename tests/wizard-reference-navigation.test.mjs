import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, button, nodes, text, manualPlan } from './helpers/wizard-reference/component-harness.mjs';
const plan = view => nodes(view, node => node.type === 'textarea' && node.props['aria-label'] === 'Unidades y temas')[0];

test('text plan preserves edits and unit removal across back navigation with an explicit saved revision', async () => {
  const f = await wizard();
  try {
    await manualPlan(f); assert.ok(plan(f.view));
    const next = 'Unidad 1 · Segunda\nEcosistema';
    plan(f.view).props.onChange({ target: { value: next } }); await f.view.flush();
    button(f.view, 'Atrás').props.onClick(); await f.view.flush();
    assert.match(text(f.view.tree), /Elegí cómo cargar/);
    assert.equal(f.calls.length, 0, 'Back navigation does not save or publish');
    await advance(f.view);
    assert.equal(plan(f.view).props.value, next);
    assert.deepEqual(f.calls.at(-1)[2].payload.units, [{ name: 'Unidad 1 · Segunda', topics: [{ name: 'Ecosistema' }] }]);
    assert.ok(f.calls.every(([, method]) => method === 'PATCH'));
    assert.deepEqual(f.published, []); assert.deepEqual(f.exits, []);
  } finally { f.close(); }
});

test('an incomplete written unit stays editable and cannot publish the classroom', async () => {
  const f = await wizard();
  try {
    await manualPlan(f);
    plan(f.view).props.onChange({ target: { value: 'Unidad 1 · Incompleta' } }); await f.view.flush();
    await advance(f.view);
    assert.match(text(f.view.tree), /al menos una unidad con un tema.*completá sus nombres/i);
    assert.equal(plan(f.view).props.value, 'Unidad 1 · Incompleta');
    assert.equal(f.calls.some(([path]) => path.endsWith('/publish')), false);
    assert.deepEqual(f.published, []);
  } finally { f.close(); }
});

test('the four real steps preserve existing data and allow return without writes or publication', async () => {
  const f = await wizard();
  try {
    await manualPlan(f);
    const original = plan(f.view).props.value, count = f.calls.length;
    const back = button(f.view, 'Atrás'); assert.ok(back); assert.equal(back.props.type, 'button');
    back.props.onClick(); await f.view.flush();
    assert.match(text(f.view.tree), /Elegí cómo cargar/);
    await advance(f.view);
    assert.equal(plan(f.view).props.value, original);
    assert.equal(nodes(f.view, node => node.type === 'ol')[0].props.children.length, 4);
    assert.equal(f.calls.length, count); assert.deepEqual(f.published, []); assert.deepEqual(f.exits, []);
  } finally { f.close(); }
});
