import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, button, nodes, text, manualPlan, initialDraft, readStructuredPlan, editStructuredPlan } from './helpers/wizard-reference/component-harness.mjs';

test('structured plan preserves edits and unit removal across back navigation with a saved revision', async () => {
  const f = await wizard();
  try {
    await manualPlan(f);
    const next = [{ name: 'Unidad 1 · Segunda', topics: [{ name: 'Ecosistema' }] }];
    await editStructuredPlan(f.view, next);
    button(f.view, 'Atrás').props.onClick(); await f.view.flush();
    assert.match(text(f.view.tree), /Cómo querés preparar el recorrido/);
    assert.equal(nodes(f.view, n => n.type === 'form')[0].props['data-wizard-step'], 1);
    assert.deepEqual(f.published, []);
    await advance(f.view);
    assert.deepEqual(readStructuredPlan(f.view), next);
    const payload = f.calls.at(-1)[2].payload;
    assert.deepEqual(payload.units, next); assert.equal(payload.wizardStep, 2); assert.equal(payload.wizardMethod, 'manual');
    assert.ok(f.calls.every(([, method]) => method === 'PATCH'));
    assert.deepEqual(f.published, []); assert.deepEqual(f.exits, []);
  } finally { f.close(); }
});

test('an incomplete unit stays editable and cannot publish the classroom', async () => {
  const f = await wizard();
  try {
    await manualPlan(f);
    const incomplete = [{ name: 'Unidad 1 · Incompleta', topics: [{ name: '' }] }];
    await editStructuredPlan(f.view, incomplete);
    await advance(f.view);
    assert.match(text(f.view.tree), /al menos una unidad con un tema.*completá sus nombres/i);
    assert.deepEqual(readStructuredPlan(f.view), incomplete);
    assert.equal(nodes(f.view, n => n.type === 'form')[0].props['data-wizard-step'], 2);
    assert.equal(f.calls.some(([path]) => path.endsWith('/publish')), false);
    assert.deepEqual(f.published, []);
  } finally { f.close(); }
});

test('the four steps preserve existing units while saving navigation metadata without publication', async () => {
  const f = await wizard();
  try {
    await manualPlan(f);
    const original = readStructuredPlan(f.view), count = f.calls.length;
    const back = button(f.view, 'Atrás'); assert.ok(back); assert.equal(back.props.type, 'button');
    back.props.onClick(); await f.view.flush();
    assert.match(text(f.view.tree), /Cómo querés preparar el recorrido/);
    button(f.view, 'Guardar y salir').props.onClick(); await f.view.flush();
    const writes = f.calls.slice(count);
    assert.ok(writes.length > 0);
    for(const [, method, input] of writes){assert.equal(method,'PATCH');assert.deepEqual(input.payload.units,original);}
    const saved = writes.at(-1)[2].payload;
    assert.equal(saved.wizardStep,1);assert.equal(saved.wizardMethod,'manual');
    assert.deepEqual(f.published, []); assert.deepEqual(f.exits, [true]);
    const resumed = await wizard({draft:{...initialDraft(),payload:saved}});
    try {
      assert.equal(nodes(resumed.view,n=>n.type==='form')[0].props['data-wizard-step'],1);
      await advance(resumed.view);
      assert.equal(nodes(resumed.view,n=>n.type==='ol')[0].props.children.length,4);
      assert.deepEqual(readStructuredPlan(resumed.view),original);
      assert.deepEqual(resumed.published,[]);
    } finally {resumed.close();}
  } finally { f.close(); }
});

test('reviewing an unchanged structured plan preserves units and publishes only the latest saved revision', async () => {
  const draft = initialDraft(); let revision=1;
  const f = await wizard({ draft, call:async(path,method,input)=>path.endsWith('/publish')?{id:'created',code:null}:{...draft,revision:String(++revision),payload:input.payload} });
  try {
    await manualPlan(f);
    assert.deepEqual(readStructuredPlan(f.view),draft.payload.units);
    const before = f.calls.length;
    await advance(f.view);
    const reviewWrites=f.calls.slice(before);
    assert.ok(reviewWrites.length>0);
    assert.ok(reviewWrites.every(([path,method])=>method==='PATCH'&&!path.endsWith('/publish')));
    const persisted=reviewWrites.at(-1)[2].payload;
    assert.equal(persisted.wizardStep,3);assert.deepEqual(persisted.units,draft.payload.units);
    assert.deepEqual(f.published,[]);
    const confirmedRevision=String(revision);
    await advance(f.view);
    assert.deepEqual(f.calls.find(call=>call[0].endsWith('/publish'))[2],{revision:confirmedRevision});
    assert.deepEqual(f.published,[['created',null]]);
  } finally { f.close(); }
});
