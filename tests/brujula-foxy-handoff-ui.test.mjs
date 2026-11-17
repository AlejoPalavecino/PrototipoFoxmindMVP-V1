import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { componentWithPorts } from './foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const roomId = 'a1111111-1111-4111-8111-111111111111', resourceId = 'b1111111-1111-4111-8111-111111111111';
test('Foxy handoff offers both real actions, keeps dirty resources gated and does not claim automatic conversion', async () => {
  const { FoxyActivityHandoffPanel } = componentWithPorts("apps/web/src/application/workflows/foxy-workspace/FoxyActivityHandoffPanel.tsx", {});
  const calls = [], runtime = { activityHandoff: { reset: () => calls.push('reset'), confirm: () => calls.push('confirm') } };
  const resource = { resource: { id: resourceId, title: 'Recurso', markdown: '<script>privado</script>' }, dirty: true, busy: false, pending: null };
  const view = hookView(FoxyActivityHandoffPanel, { runtime, state: {}, resource, classrooms: [], onNavigate() {}, locked: false });
  try {
    await view.flush(); const html = renderToStaticMarkup(view.tree);
    assert.match(html, /Preparar en Actividades/); assert.match(html, /Usar rúbrica en una actividad/); assert.match(html, /Guardá los cambios/);
    for (const button of descendants(view.tree, node => node.type === 'button')) assert.equal(button.props.disabled, true);
    assert.equal(calls.length, 0);
  } finally { view.close(); }
});

test('Foxy handoff requires explicit reviewed checkbox and receipt navigates using IDs only', async () => {
  const { FoxyActivityHandoffPanel } = componentWithPorts("apps/web/src/application/workflows/foxy-workspace/FoxyActivityHandoffPanel.tsx", {});
  const calls = [], payload = { title: 'Trabajo', objective: 'Objetivo', instructions: '<script>Consigna</script>', teacherComment: '', evaluationRubric: [{ name: 'Criterio', description: '', weight: 100 }] };
  const runtime = { activityHandoff: { reset: () => {}, confirm: () => calls.push('confirm') } };
  const state = { review: { input: { payload } }, busy: false, pending: false, receipt: null };
  const resource = { resource: { id: resourceId, title: 'Recurso', markdown: 'Texto' }, dirty: false, busy: false, pending: null };
  const view = hookView(FoxyActivityHandoffPanel, { runtime, state, resource, classrooms: [], onNavigate() {}, initialMode: 'ACTIVITY', locked: false });
  try {
    await view.flush();
    const button = () => descendants(view.tree, node => node.type === 'button' && node.props.children === 'Crear borrador privado')[0];
    assert.equal(button().props.disabled, true); assert.equal(calls.length, 0);
    assert.match(renderToStaticMarkup(view.tree), /&lt;script&gt;Consigna&lt;\/script&gt;/);
    descendants(view.tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ currentTarget: { checked: true } });
    await view.flush(); assert.equal(button().props.disabled, false); button().props.onClick(); assert.deepEqual(calls, ['confirm']);
  } finally { view.close(); }
  const receipt = hookView(FoxyActivityHandoffPanel, { runtime, state: { receipt: { classroomId: roomId, activityId: resourceId } }, resource, classrooms: [], onNavigate: href => calls.push(href), locked: false });
  try {
    await receipt.flush(); descendants(receipt.tree, node => node.type === 'button' && node.props.children === 'Abrir borrador en Actividades')[0].props.onClick();
    assert.equal(calls.at(-1), `/mis-aulas?aula=${roomId}&destino=activity&activityId=${resourceId}`);
    assert.doesNotMatch(calls.at(-1), /Consigna|privado|Texto/);
  } finally { receipt.close(); }
});
