import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, button, nodes, toggles, text } from './helpers/wizard-reference/component-harness.mjs';

test('unit disclosure preserves content without save and removal cannot transfer collapsed state', async () => {
  const f = await wizard();
  try {
    await advance(f.view); await advance(f.view); assert.equal(toggles(f.view).length, 2);
    const original = nodes(f.view, n => n.type === 'input').map(n => n.props.value), callCount = f.calls.length;
    toggles(f.view)[1].props.onClick(); await f.view.flush(); assert.equal(toggles(f.view)[1].props['aria-expanded'], false);
    toggles(f.view)[1].props.onClick(); await f.view.flush();
    assert.deepEqual(nodes(f.view, n => n.type === 'input').map(n => n.props.value), original); assert.equal(f.calls.length, callCount);
    toggles(f.view)[1].props.onClick(); await f.view.flush();
    button(f.view, 'Quitar unidad 1').props.onClick(); await f.view.flush();
    assert.equal(toggles(f.view).length, 1); assert.equal(toggles(f.view)[0].props['aria-expanded'], true);
  } finally { f.close(); }
});

test('an incomplete collapsed unit reopens for correction and cannot enter review', async () => {
  const f = await wizard();
  try {
    await advance(f.view); await advance(f.view); assert.equal(toggles(f.view).length, 2);
    const input = nodes(f.view, n => n.type === 'input' && n.props.value === 'Célula')[0];
    input.props.onChange({ target: { value: '' } }); await f.view.flush();
    toggles(f.view)[0].props.onClick(); await f.view.flush(); assert.equal(toggles(f.view)[0].props['aria-expanded'], false);
    await advance(f.view); assert.equal(toggles(f.view)[0].props['aria-expanded'], true);
    assert.match(text(f.view.tree), /completá sus nombres/i); assert.equal(button(f.view, 'Crear aula'), undefined);
  } finally { f.close(); }
});

test('review edit controls return to their steps without mutations, publication or data loss', async () => {
  const f = await wizard();
  try {
    await advance(f.view); await advance(f.view); await advance(f.view);
    const edit = button(f.view, 'Editar datos'); assert.ok(edit, 'review offers data editing'); assert.equal(edit.props.type, 'button');
    const count = f.calls.length; edit.props.onClick(); await f.view.flush();
    assert.ok(nodes(f.view, n => n.type === 'input' && n.props.value === 'Ciencias').length);
    await advance(f.view); await advance(f.view); await advance(f.view);
    const units = button(f.view, 'Editar unidades'); assert.ok(units); assert.equal(units.props.type, 'button');
    units.props.onClick(); await f.view.flush(); assert.equal(toggles(f.view).length, 2);
    assert.equal(f.calls.length, count); assert.deepEqual(f.published, []); assert.deepEqual(f.exits, []);
  } finally { f.close(); }
});
