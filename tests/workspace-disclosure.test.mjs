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
    assert.equal(descendants(view.tree, n => n.type?.name === 'PlanWorkspace')[0].props.onTopicState, undefined);
  } finally { view.close(); }
});

test('focused topic progress uses the classroom revision and reloads after the authorized change', async () => {
  const { Plan } = loadTsModule('apps/classrooms-ui/Plan.tsx');
  const calls = []; let reloaded = 0;
  const view = hookView(Plan, { room, api: { call: async (...args) => calls.push(args) }, reload: async () => { reloaded++; } });
  try {
    await view.flush();
    descendants(view.tree, n => n.type?.name === 'PlanWorkspace')[0].props.onTopicState('topic', 'TAUGHT');
    await view.flush();
    assert.deepEqual(calls, [['/room/plan', 'POST', { revision: '1', operation: { action: 'setTopicState', id: 'topic', status: 'TAUGHT' } }]]);
    assert.equal(reloaded, 1);
    assert.match(text(view.tree), /Tema marcado como dado/);
    assert.match(text(view.tree), /Deshacer avance/);
  } finally { view.close(); }
});

for (const accountRole of ['teacher', 'student']) test(`Brújula keeps ${accountRole} work and permitted contextual navigation visible`, async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  const { Home } = loadTsModule('apps/classrooms-ui/Home.tsx');
  const data = { subjectId: 'subject', version: 1, generatedAt: '2026-10-28T12:00:00Z', timeZone: 'UTC', participation: accountRole === 'teacher' ? 'teach' : 'study',
    memberships: { teach: Number(accountRole === 'teacher'), study: Number(accountRole === 'student'), archived: 0 }, setup: { drafts: 0, invitations: 0 },
    modules: Object.fromEntries(['pending','review','feedback','agenda','queries','materials','classrooms','drafts','submitted'].map(name => [name,
      { status: 'ready', items: [], totalItems: 0, nextCursor: null }])) };
  for (const name of accountRole === 'teacher' ? ['pending','feedback'] : ['review','queries']) data.modules[name] = { status:'not-applicable' };
  const actions = [];
  const view = hookView(Home, { accountRole, displayName: 'Alex', subjectId: 'subject', homeClient: { read: async () => data },
    onCreate: () => actions.push('create'), onJoin: () => actions.push('join'), onClassrooms: () => actions.push('classrooms'), onAction() {} });
  try {
    await view.flush();
    const resources = descendants(view.tree, n => n.type === 'details' && n.props.className === 'fm-home-resources')[0];
    assert.equal(resources, undefined, 'The previous resources disclosure was retired by the approved design');
    assert.equal(descendants(view.tree, n => n.type?.name === 'HomeModule' && ['pending','review'].includes(n.props.name)).length, 1);
    assert.equal(descendants(view.tree, n => n.type?.name === 'HomeModule' && n.props.name === 'materials').length, 0);
    const shortcuts = descendants(view.tree, n => n.type?.name === 'HomeShortcuts');
    const tools = descendants(view.tree, n => n.type?.name === 'HomeTeacherTools');
    assert.equal(shortcuts.length, Number(accountRole === 'student'));
    assert.equal(tools.length, Number(accountRole === 'teacher'));
    const contextual = [...shortcuts, ...tools][0];
    assert.equal(contextual.props.data, data);
    contextual.props.onClassrooms();
    assert.deepEqual(actions, ['classrooms']);
    assert.equal(typeof contextual.props.onRetry, 'function');
    assert.deepEqual(descendants(view.tree, n => n.type?.name === 'HomeModule').map(n => n.props.name),
      accountRole === 'teacher' ? ['review', 'queries'] : ['pending', 'feedback']);
    const agenda = descendants(view.tree, n => n.type?.name === 'HomeMiniagenda')[0];
    assert.ok(agenda, 'The approved mixed miniagenda remains visible independently of work modules');
    assert.equal(agenda.props.teacher, accountRole === 'teacher');
    assert.equal(agenda.props.data, data);
    assert.equal(typeof agenda.props.onRetry, 'function');
    assert.equal(descendants(view.tree, n => n.type?.name === 'HomeFoxyNote').length, 0);
    assert.equal(descendants(view.tree, n => n.type?.name === 'HomeFocus').length, Number(accountRole === 'teacher'));
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
