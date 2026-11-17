import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, nodes, button, text, ready, initialDraft } from './helpers/wizard-reference/component-harness.mjs';

test('Guardar y reabrir conserva el programa pendiente sin permitir avanzar ni iniciar IA', async () => {
  const pending = { ...ready('pending-new'), ready: false, validation: 'PENDING', scan: 'PENDING' };
  const draft = initialDraft();
  const f = await wizard({ draft, upload: async () => pending, fileStatus: async id => id === pending.id ? pending : ready(id) });
  let saved;
  try {
    await advance(f.view);
    nodes(f.view, n => n.type === 'input' && n.props.type === 'file')[0].props.onChange({ target: { files: [new File(['plan'], 'nuevo.pdf')], value: '' } });
    await f.view.flush();
    button(f.view, 'Volver al programa').props.onClick(); await f.view.flush();
    button(f.view, 'Guardar y salir').props.onClick(); await f.view.flush();
    saved = f.calls.filter(([, method]) => method === 'PATCH').at(-1)[2].payload;
    assert.equal(saved.planFileId, pending.id);
    assert.equal(f.exits.length, 1);
  } finally { f.close(); }
  const reopened = await wizard({ draft: { ...draft, payload: saved }, fileStatus: async id => { assert.equal(id, pending.id); return pending; } });
  try {
    button(reopened.view, 'Volver al programa').props.onClick(); await reopened.view.flush();
    assert.equal(nodes(reopened.view, n => n.type === 'button' && n.props.type === 'submit')[0].props.disabled, true);
    await advance(reopened.view);
    assert.equal(nodes(reopened.view, n => n.type === 'form')[0].props['data-wizard-step'], 1);
    assert.ok(reopened.extractionInputs.every(input => input.readyFileId === undefined));
    assert.equal(reopened.uploads.length, 0);
  } finally { reopened.close(); }
});

test('Creación reserva el archivo obligatorio para Cargar plan y evita avanzar con el archivo sin aprobar', async () => {
  const f = await wizard({ draft: { id: 'draft', revision: '1', payload: {
    name: 'Aula', subject: 'Materia', division: 'A', academicYear: 2026, timezone: 'UTC',
  } } });
  try {
    assert.equal(nodes(f.view, n => n.type === 'input' && n.props.type === 'file').length, 0);
    await advance(f.view);
    assert.equal(nodes(f.view, n => n.type === 'form')[0].props['data-wizard-step'], 1);
    assert.equal(nodes(f.view, n => n.type === 'input' && n.props.type === 'file').length, 1);
    await advance(f.view);
    assert.match(text(f.view.tree), /Subí.*archivo.*plan/i);
    assert.equal(nodes(f.view, n => n.type === 'form')[0].props['data-wizard-step'], 1);
    assert.equal(f.calls.some(([path]) => path.endsWith('/publish')), false);
  } finally { f.close(); }
});

test('Una lectura atrasada del archivo anterior no aprueba un reemplazo rechazado', async () => {
  let resolvePrevious;
  const previous = new Promise(resolve => { resolvePrevious = resolve; });
  const f = await wizard({
    fileStatus: () => previous,
    upload: async () => ({ ...ready('rejected'), name: 'replacement.pdf', ready: false, validation: 'REJECTED', scan: 'REJECTED' }),
  });
  try {
    await advance(f.view);
    const file = nodes(f.view, n => n.type === 'input' && n.props.type === 'file')[0];
    file.props.onChange({ target: { files: [new File(['test'], 'replacement.pdf')], value: '' } });
    await f.view.flush();
    resolvePrevious(ready('approved'));
    await f.view.flush();
    assert.equal(nodes(f.view,n=>n.type==='form').length,0);
    button(f.view,'Volver al programa').props.onClick(); await f.view.flush();
    nodes(f.view, n => n.type === 'input' && n.props.name === 'plan-method' && n.props.value === 'manual')[0].props.onChange();
    await f.view.flush(); await advance(f.view);
    assert.equal(nodes(f.view, n => n.type === 'form')[0].props['data-wizard-step'], 1);
    assert.match(text(f.view.tree), /archivo del plan debe estar aprobado/);
  } finally { resolvePrevious(ready('approved')); f.close(); }
});
