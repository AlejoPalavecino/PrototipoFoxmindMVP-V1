import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const room = { id: 'room', revision: '1', role: 'teacher', archived: false, plans: [], units: [
  { id: 'unit', name: 'Los seres vivos', topics: [{ id: 'topic', name: 'La célula', status: 'NEXT' }] },
] };

test('Plan keeps teaching tools in a collapsed disclosure without hiding learning or triggering writes', async () => {
  const { Plan } = loadTsModule('apps/classrooms-ui/Plan.tsx');
  const calls = [], view = hookView(Plan, { room, api: { call: async (...args) => calls.push(args) }, reload: async () => {} });
  try {
    await view.flush();
    const management = descendants(view.tree, n => n.type === 'details' && n.props.className === 'fm-plan-management')[0];
    assert.ok(management, 'Teacher administration must be separate from the learning workspace');
    assert.ok(!management.props.open, 'Administration starts collapsed');
    assert.equal(descendants(management, n => n.type?.name === 'PlanWorkspace').length, 0);
    assert.equal(descendants(view.tree, n => n.type?.name === 'PlanWorkspace').length, 1);
    assert.match(text(management), /Nueva versión del archivo/);
    assert.match(text(management).replace(/\s+/g, ' '), /Estado de La célula/);
    assert.match(text(management), /Agregar unidad/);
    assert.equal(calls.length, 0);
  } finally { view.close(); }
});

for (const state of [{ role: 'student' }, { archived: true }]) test(`Read-only Plan never exposes management ${JSON.stringify(state)}`, async () => {
  const { Plan } = loadTsModule('apps/classrooms-ui/Plan.tsx');
  const view = hookView(Plan, { room: { ...room, ...state }, api: {}, reload: async () => {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, n => n.type === 'details' && n.props.className === 'fm-plan-management').length, 0);
    assert.equal(descendants(view.tree, n => n.type?.name === 'PlanWorkspace').length, 1);
  } finally { view.close(); }
});

test('Home keeps pending work visible and places recoverable resources behind an explicit disclosure', async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const { Home } = loadTsModule('apps/classrooms-ui/Home.tsx');
  const data = { subjectId: 'subject', version: 1, generatedAt: '2026-10-28T12:00:00Z', timeZone: 'UTC', participation: 'mixed',
    memberships: { teach: 1, study: 1, archived: 0 }, setup: { drafts: 0, invitations: 0 },
    modules: Object.fromEntries(['pending','review','feedback','agenda','queries','materials','classrooms'].map(name => [name,
      { status: 'ready', items: [], totalItems: 0, nextCursor: null }])) };
  const actions = [];
  const view = hookView(Home, { displayName: 'Alex', subjectId: 'subject', homeClient: { read: async () => data },
    onCreate: () => actions.push('create'), onJoin: () => actions.push('join'), onClassrooms: () => actions.push('classrooms'), onAction() {} });
  try {
    await view.flush();
    const resources = descendants(view.tree, n => n.type === 'details' && n.props.className === 'fm-home-resources')[0];
    assert.ok(resources); assert.ok(!resources.props.open);
    assert.equal(descendants(resources, n => n.type?.name === 'HomeModule' && ['pending','review'].includes(n.props.name)).length, 0);
    assert.equal(descendants(view.tree, n => n.type?.name === 'HomeModule' && ['pending','review'].includes(n.props.name)).length, 2);
    assert.equal(descendants(resources, n => n.type?.name === 'HomeModule' && n.props.name === 'materials').length, 1);
    const toolbar = descendants(view.tree, n => n.props.className === 'fm-home-actions')[0];
    assert.ok(toolbar);
    for (const label of ['Crear aula', 'Unirme con código']) {
      const button = descendants(toolbar, n => n.type === 'button' && text(n).trim() === label)[0];
      assert.ok(button, label); button.props.onClick();
    }
    assert.deepEqual(actions, ['create','join']);
    const greeting = descendants(view.tree, n => n.type?.name === 'HomeGreeting')[0];
    const greetingTree = greeting.type(greeting.props);
    descendants(greetingTree, n => n.type === 'button' && text(n).trim() === 'Ir a mis aulas')[0].props.onClick();
    assert.deepEqual(actions, ['create','join','classrooms'], 'The illustrated entry uses the existing classroom navigation');
  } finally { view.close(); if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});

test('Compact topic chooser uses the same selected context without issuing writes', async () => {
  const { PlanWorkspace } = loadTsModule('apps/classrooms-ui/PlanWorkspace.tsx');
  const calls = [], extended = { ...room, units: [{ ...room.units[0], topics: [...room.units[0].topics, { id: 'second', name: 'Ecosistemas', status: 'PENDING' }] }] };
  const view = hookView(PlanWorkspace, { room: extended, onOpenActivity() {}, api: { call: async (...args) => { calls.push(args); return args[0].endsWith('/library') ? [] : { activities: [] }; } } });
  try {
    await view.flush();
    const chooser = descendants(view.tree, n => n.type === 'select' && n.props['aria-label'] === 'Tema del plan')[0];
    assert.ok(chooser); assert.equal(chooser.props.value, 'topic');
    chooser.props.onChange({ target: { value: 'second' } }); await view.flush();
    const context = descendants(view.tree, n => n.props['aria-label'] === 'Tema seleccionado')[0];
    assert.match(text(context), /Ecosistemas/);
    assert.ok(calls.every(([,method]) => !method || method === 'GET'));
  } finally { view.close(); }
});
