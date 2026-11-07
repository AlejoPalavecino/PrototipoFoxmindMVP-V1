import test from 'node:test';
import assert from 'node:assert/strict';
import { wizard, advance, nodes, button, text, initialDraft } from './helpers/wizard-reference/component-harness.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

export async function choose(f, method = 'manual') {
  nodes(f.view, n => n.type === 'input' && n.props.name === 'plan-method' && n.props.value === method)[0].props.onChange();
  await f.view.flush(); await advance(f.view);
}
const published = f => f.calls.filter(([path]) => path.endsWith('/publish'));

test('cuatro pasos, documento y portada visibles antes de elegir IA; abrir y cargar no inicia extracción', async () => {
  const f = await wizard();
  try {
    assert.equal(nodes(f.view, n => n.type === 'ol')[0].props.children.length, 4);
    assert.ok(nodes(f.view, n => n.type === 'input' && n.props.type === 'file').length);
    assert.ok(nodes(f.view, n => n.type === 'input' && n.props.name === 'coverKey').length);
    assert.equal(f.extractionInputs.at(-1).readyFileId, undefined);
    await advance(f.view);
    assert.match(text(f.view.tree), /Elegí cómo cargar/);
    await advance(f.view);
    assert.match(text(f.view.tree), /Elegí.*IA.*manual/i);
    assert.equal(published(f).length, 0);
  } finally { f.close(); }
});

test('manual llega a revisión sin IA ni publicación y confirmar usa la última revisión guardada', async () => {
  const draft = initialDraft();
  const f = await wizard({ draft, call: async (path, method, input) => path.endsWith('/publish') ? { id: 'room', code: null } : { ...draft, revision: '9', payload: input.payload } });
  try {
    await advance(f.view); await choose(f);
    const editor = nodes(f.view, n => n.type === 'textarea' && n.props['aria-label'] === 'Unidades y temas')[0];
    editor.props.onChange({ target: { value: 'Unidad: Revisión final\n- Tema exacto\n- Unidad de longitud' } }); await f.view.flush();
    await advance(f.view);
    assert.match(text(f.view.tree), /Revisión final/); assert.match(text(f.view.tree), /Unidad de longitud/);
    assert.ok(button(f.view, 'Confirmar y crear aula')); assert.equal(published(f).length, 0);
    assert.ok(f.extractionInputs.every(input => input.readyFileId === undefined));
    button(f.view, 'Editar unidades y temas').props.onClick(); await f.view.flush();
    assert.ok(nodes(f.view, n => n.type === 'textarea' && n.props.value.includes('Revisión final')).length);
    await advance(f.view); await advance(f.view);
    assert.deepEqual(f.published, [['room', null]]);
    assert.deepEqual(published(f)[0][2], { revision: '9' });
    assert.deepEqual(f.calls.filter(([,method]) => method === 'PATCH').at(-1)[2].payload.units,
      [{ name: 'Revisión final', topics: [{ name: 'Tema exacto' }, { name: 'Unidad de longitud' }] }]);
  } finally { f.close(); }
});

test('el documento es requerido y el archivo pendiente no permite avanzar', async () => {
  const draft = initialDraft(); delete draft.payload.planFileId;
  const f = await wizard({ draft, upload: async () => ({ id: 'pending', name: 'plan.pdf', ready: false }) });
  try {
    await advance(f.view); assert.match(text(f.view.tree), /Subí.*plan/i);
    const input = nodes(f.view, n => n.type === 'input' && n.props.type === 'file')[0];
    input.props.onChange({ target: { files: [new File(['test'], 'plan.pdf')], value: 'plan.pdf' } }); await f.view.flush();
    await advance(f.view); assert.match(text(f.view.tree), /aprobado|revisión/i);
    assert.equal(nodes(f.view, n => n.type === 'form')[0].props['data-wizard-step'], 0);
    assert.equal(published(f).length, 0);
  } finally { f.close(); }
});

test('IA sólo se activa al confirmar esa ruta; no permite revisar una propuesta sin aplicar', async () => {
  const f = await wizard({ extractionView: { state: 'RUNNING' } });
  try {
    await advance(f.view); await choose(f, 'ai');
    assert.equal(f.extractionInputs.at(-1).readyFileId, 'approved');
    await advance(f.view); assert.match(text(f.view.tree), /aplicá.*propuesta|esperá.*análisis/i);
    assert.equal(published(f).length, 0);
    button(f.view, 'Continuar manualmente').props.onClick(); await f.view.flush();
    assert.equal(f.extractionInputs.at(-1).readyFileId, undefined);
    await advance(f.view); assert.ok(button(f.view, 'Confirmar y crear aula'));
  } finally { f.close(); }
});

test('error de publicación conserva revisión y reintentar no pierde unidades', async () => {
  let attempts = 0;
  const draft = initialDraft();
  const f = await wizard({ draft, call: async path => {
    if (path.endsWith('/publish')) { if (++attempts === 1) throw new Error('No se pudo crear el aula. Intentá nuevamente.'); return { id: 'room', code: null }; }
    return draft;
  } });
  try {
    await advance(f.view); await choose(f); await advance(f.view); await advance(f.view);
    assert.match(text(f.view.tree), /No se pudo crear/); assert.match(text(f.view.tree), /Primera/);
    assert.ok(button(f.view, 'Confirmar y crear aula'));
    await advance(f.view); assert.equal(f.published.length, 1);
  } finally { f.close(); }
});

test('edición estructurada se normaliza antes de revisión y publicar resiste doble confirmación', async () => {
  const draft = initialDraft(); let release;
  const pending = new Promise(resolve => { release = resolve; });
  const f = await wizard({ draft, call: async (path, method, input) => path.endsWith('/publish') ? pending : { ...draft, revision: '4', payload: input.payload } });
  try {
    await advance(f.view); await choose(f);
    const field = nodes(f.view, n => n.type === 'input' && n.props.value === 'Primera')[0];
    field.props.onChange({ target: { value: '  Unidad editada  ' } }); await f.view.flush();
    button(f.view, 'Agregar tema a unidad 1').props.onClick(); await f.view.flush();
    const empty = nodes(f.view, n => n.type === 'input' && n.props.value === '')[0];
    empty.props.onChange({ target: { value: '  Tema nuevo  ' } }); await f.view.flush();
    await advance(f.view);
    assert.match(text(f.view.tree), /Unidad editada/);
    const last = f.calls.filter(([,method]) => method === 'PATCH').at(-1)[2].payload;
    assert.equal(last.units[0].name, 'Unidad editada'); assert.equal(last.units[0].topics.at(-1).name, 'Tema nuevo');
    const form = nodes(f.view, n => n.type === 'form')[0];
    form.props.onSubmit({ preventDefault() {} }); form.props.onSubmit({ preventDefault() {} }); await f.view.flush();
    assert.equal(published(f).length, 1); assert.equal(button(f.view, 'Creando aula…').props.disabled, true);
    release({ id: 'once', code: null }); await f.view.flush(); assert.equal(f.published.length, 1);
  } finally { release({ id: 'once', code: null }); f.close(); }
});

for (const origin of ['home', 'classrooms']) test(`publicar desde ${origin} regresa a Mis Aulas y recarga la colección`, async () => {
  const { ClassroomsApp } = loadTsModule('apps/classrooms-ui/Classrooms.tsx');
  const calls = [], navigations = [], draft = initialDraft();
  const view = hookView(ClassroomsApp, { initialPresentation: origin, displayName: 'Docente sintético', accountRole: 'teacher',
    api: { call: async (path, method) => { calls.push([path, method]); return path === '' ? { teach: [], study: [] } : path === '/drafts' && method === 'POST' ? draft : []; } },
    onNavigate: (...args) => navigations.push(args),
  });
  try {
    await view.flush();
    descendants(view.tree, node => node.type?.name === (origin === 'home' ? 'Home' : 'ClassroomCollectionHero'))[0].props.onCreate();
    await view.flush();
    const activeWizard = descendants(view.tree, node => typeof node.props.onPublished === 'function')[0];
    assert.ok(activeWizard);
    const readsBefore = calls.filter(([path]) => path === '').length;
    activeWizard.props.onPublished('created-room', 'code'); await view.flush();
    assert.equal(descendants(view.tree, node => typeof node.props.onPublished === 'function').length, 0);
    assert.ok(descendants(view.tree, node => node.type?.name === 'ClassroomCollection').length);
    assert.match(text(view.tree), /Aula creada/);
    assert.ok(calls.filter(([path]) => path === '').length > readsBefore);
    assert.equal(navigations.length, origin === 'home' ? 1 : 0);
    if (origin === 'home') assert.equal(navigations[0][0], 'classrooms');
  } finally { view.close(); }
});
