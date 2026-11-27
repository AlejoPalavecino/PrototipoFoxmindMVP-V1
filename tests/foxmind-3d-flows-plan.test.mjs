import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { loadPlanWorkspace } from './helpers/plan-workspace.mjs';
import { hookView, descendants, deferred } from './agenda-ui-helpers.test.mjs';

const room = { id: 'room', role: 'teacher', archived: false, units: [{ id: 'unit', name: 'Unidad', topics: [
  { id: 'pending', name: 'Pendiente', status: 'PENDING' }, { id: 'next', name: 'Siguiente', status: 'NEXT' },
] }] };
const text = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.props ? text(value.props.children) : '';

test('D4 contextual Plan filters real multitema activities/materials by the chosen topic and opens explicitly without writes', async () => {
  const { PlanWorkspace } = loadPlanWorkspace();
  const calls = [], opened = [], api = { fileUrl: (id, preview) => `/protected/${id}?preview=${preview}`,
    call: async (...args) => { calls.push(args); return args[0].endsWith('/library') ? [
      { id: 'visible', title: 'Documento visible', topicId: 'next', fileId: 'file', ready: true, deleted: false, previewable: true, extension: 'pdf' },
      { id: 'unsafe', title: 'Archivo inseguro', topicId: 'next', fileId: 'unsafe', ready: false, deleted: false },
      { id: 'other', title: 'Documento otro tema', topicId: 'pending', fileId: 'other', ready: true, deleted: false },
    ] : { activities: [
      { id: 'multi', title: 'Actividad multitema', topicId: 'pending', topicIds: ['pending', 'next'], type: 'ASSIGNMENT', status: 'PUBLISHED' },
      { id: 'unrelated', title: 'Actividad otro tema', topicId: 'pending', topicIds: ['pending'], type: 'ASSIGNMENT', status: 'PUBLISHED' },
    ] }; } };
  const view = hookView(PlanWorkspace, { api, room, onOpenActivity: id => opened.push(id) });
  try {
    await view.flush();
    const nav = descendants(view.tree, node => node.type === 'nav' && node.props['aria-label'] === 'Unidades del plan')[0];
    assert.ok(nav); const selected = descendants(nav, node => node.type === 'button' && node.props['aria-current'] === 'true');
    assert.equal(selected.length, 1); assert.equal(selected[0].props['data-topic-choice'], 'pending');
    descendants(nav, node => node.props['data-topic-choice'] === 'next')[0].props.onClick();
    await view.flush();
    assert.deepEqual(descendants(view.tree, node => node.props['aria-current'] === 'true').map(node => node.props['data-topic-choice']), ['next']);
    const initial = text(view.tree); assert.match(initial, /Documento visible/); assert.match(initial, /Actividad multitema/);
    assert.doesNotMatch(initial, /Archivo inseguro|Documento otro tema|Actividad otro tema/);
    const activity = descendants(view.tree, node => node.type === 'button' && node.props['aria-label'] === 'Abrir actividad: Actividad multitema')[0];
    assert.ok(activity); activity.props.onClick(); assert.deepEqual(opened, ['multi']);
    assert.ok(descendants(view.tree, node => node.type === 'a' && node.props.href === '/protected/file?preview=true').length);
    const pending = descendants(nav, node => node.props['data-topic-choice'] === 'pending')[0];
    pending.props.onClick(); await view.flush();
    assert.match(text(view.tree), /Documento otro tema/); assert.match(text(view.tree), /Actividad otro tema/);
    assert.equal(calls.filter(([, method]) => method && method !== 'GET').length, 0);
  } finally { view.close(); }
});

test('D4 contextual Plan failure is visible and never fabricates empty success', async () => {
  const { PlanWorkspace } = loadPlanWorkspace();
  const view = hookView(PlanWorkspace, { api: { call: async () => { throw new Error('Lectura no disponible'); } }, room, onOpenActivity() {} });
  try { await view.flush(); assert.ok(descendants(view.tree, node => node.props.role === 'alert').length > 0 || /no disponible|No se pudo/i.test(text(view.tree))); }
  finally { view.close(); }
});
