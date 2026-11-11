import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, nodes, text, ready } from './helpers/wizard-reference/component-harness.mjs';

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
    nodes(f.view, n => n.type === 'input' && n.props.name === 'plan-method' && n.props.value === 'manual')[0].props.onChange();
    await f.view.flush(); await advance(f.view);
    assert.equal(nodes(f.view, n => n.type === 'form')[0].props['data-wizard-step'], 1);
    assert.match(text(f.view.tree), /archivo del plan debe estar aprobado/);
  } finally { resolvePrevious(ready('approved')); f.close(); }
});
