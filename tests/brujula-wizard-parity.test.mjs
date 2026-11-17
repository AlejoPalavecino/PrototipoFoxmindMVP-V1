import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, nodes, button, text, initialDraft, manualPlan, readStructuredPlan, editStructuredPlan } from './helpers/wizard-reference/component-harness.mjs';
import { draftPayload } from '../apps/api/src/modules/classrooms/access/infrastructure/policy.ts';
import { parseClassroomPlan, formatClassroomPlan, prepareClassroomPlan } from '../apps/web/src/features/curriculum/plan/WizardPlanText.ts';

test('Crear aula presenta los cuatro pasos aprobados', async () => {
  const f = await wizard();
  try {
    const steps = nodes(f.view, node => node.type === 'ol')[0];
    assert.equal(steps.props.children.length, 4);
    for(const label of ['Tu aula','El programa','El recorrido','Todo listo']) assert.ok(text(steps).includes(label));
    assert.equal(f.calls.length, 0, 'abrir el wizard no publica ni guarda datos sin cambios');
  } finally { f.close(); }
});

test('el tercer paso exige unidades y temas aunque el documento esté aprobado', async () => {
  const draft = initialDraft();
  draft.payload.units = [];
  const f = await wizard({ draft });
  try {
    await manualPlan(f);
    assert.deepEqual(readStructuredPlan(f.view), [{name:'',topics:[{name:''}]}]);
    assert.ok(button(f.view, 'Continuar'));
    await advance(f.view);
    assert.match(text(f.view.tree), /al menos una unidad con un tema/i);
    assert.equal(f.uploads.length, 0);
    assert.ok(f.calls.every(call => !call[0].endsWith('/publish')));
  } finally { f.close(); }
});

test('publicación admite plan manual completo sin archivo y rechaza plan vacío o incompleto', () => {
  const payload = initialDraft().payload;
  delete payload.planFileId;
  assert.deepEqual(draftPayload(payload, true), payload);
  for (const units of [[], [{ name: 'Unidad', topics: [] }], [{ name: 'Unidad', topics: [{ name: '' }] }]]) {
    assert.throws(() => draftPayload({ ...payload, units }, true), { code: 'INVALID_INPUT' });
  }
  assert.throws(() => draftPayload({ ...payload, planFileId: 'invalid' }, true), { code: 'INVALID_INPUT' });
});

test('plan escrito permanece editable al volver y publica la revisión confirmada sin upload', async () => {
  const draft = initialDraft(); draft.payload.units = [];
  const f = await wizard({ draft, call: async (path, _method, input) => path.endsWith('/publish') ? { id: 'classroom', code: 'CODE' } : { ...draft, revision: '2', payload: input.payload } });
  try {
    await manualPlan(f);
    const plan = [{name:'Unidad 1 · Vida',topics:[{name:'Células'},{name:'Ecosistemas'}]}];
    await editStructuredPlan(f.view, plan);
    button(f.view, 'Atrás').props.onClick(); await f.view.flush();
    assert.equal(f.published.length, 0);
    await advance(f.view);
    assert.deepEqual(readStructuredPlan(f.view), plan);
    await advance(f.view);
    await advance(f.view);
    const patch = f.calls.filter(call => call[1] === 'PATCH').at(-1);
    assert.deepEqual(patch[2].payload.units, [{ name: 'Unidad 1 · Vida', topics: [{ name: 'Células' }, { name: 'Ecosistemas' }] }]);
    const publication = f.calls.find(call => call[0].endsWith('/publish'));
    assert.deepEqual(publication[2], { revision: '2' });
    assert.deepEqual(f.published, [['classroom', 'CODE']]); assert.equal(f.uploads.length, 0);
  } finally { f.close(); }
});

test('archivo seleccionado pendiente bloquea creación aunque haya un plan escrito', async () => {
  const f = await wizard({ upload: async () => ({ id: 'pending', ready: false }) });
  try {
    await advance(f.view);
    nodes(f.view, node => node.type === 'input' && node.props.type === 'file')[0].props.onChange({ target: { files: [new File(['fixture'], 'plan.pdf')], value: 'plan.pdf' } });
    await f.view.flush();assert.equal(nodes(f.view,n=>n.type==='form').length,0);button(f.view,'Volver al programa').props.onClick();await f.view.flush();await advance(f.view);
    assert.match(text(f.view.tree), /superar la revisión/i);
    assert.ok(f.calls.every(call => !call[0].endsWith('/publish')));
  } finally { f.close(); }
});

test('extracción de texto prepara un esquema revisable sin inventar temas', () => {
  const plan = prepareClassroomPlan('Unidad 1 · Vida. Células. Ecosistemas. Unidad 2 · Ambiente. Energía');
  const units = parseClassroomPlan(plan);
  assert.equal(units.length, 2); assert.equal(units[0].topics.length, 2); assert.equal(units[1].topics[0].name, 'Energía');
  assert.deepEqual(parseClassroomPlan(formatClassroomPlan(units)), units);
  assert.deepEqual(parseClassroomPlan(''), []);
  assert.deepEqual(parseClassroomPlan('Unidad 1'), [{ name: 'Unidad 1', topics: [] }]);
});
