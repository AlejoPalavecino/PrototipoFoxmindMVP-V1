import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const room = { id: 'room', revision: '1', role: 'teacher', archived: false, plans: [], units: [
  { id: 'unit', name: 'Los seres vivos', topics: [{ id: 'topic', name: 'La célula', status: 'NEXT' }] },
] };

test('Plan exposes the reference learning workspace without retired administration or implicit writes', async () => {
  const { Plan } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/ClassroomPlan.tsx");
  const calls = [], view = hookView(Plan, { room, api: { call: async (...args) => calls.push(args) }, reload: async () => {} });
  try {
    await view.flush();
    const management = descendants(view.tree, n => n.type === 'details' && n.props.className === 'fm-plan-management')[0];
    assert.equal(management,undefined,'The supplied reference retires curriculum maintenance from this screen');
    assert.equal(descendants(view.tree, n => n.type?.name === 'PlanWorkspace').length, 1);
    assert.equal(calls.length, 0);
  } finally { view.close(); }
});

for (const state of [{ role: 'student' }, { archived: true }]) test(`Read-only Plan never exposes management ${JSON.stringify(state)}`, async () => {
  const { Plan } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/ClassroomPlan.tsx");
  const view = hookView(Plan, { room: { ...room, ...state }, api: {}, reload: async () => {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, n => n.type === 'details' && n.props.className === 'fm-plan-management').length, 0);
    assert.equal(descendants(view.tree, n => n.type?.name === 'PlanWorkspace').length, 1);
    assert.equal(descendants(view.tree, n => n.type?.name === 'PlanWorkspace')[0].props.onTopicState, undefined);
  } finally { view.close(); }
});

test('focused topic progress uses the classroom revision and reloads after the authorized change', async () => {
  const { Plan } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/ClassroomPlan.tsx");
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
  const { Home } = loadTsModule("apps/web/src/features/home/dashboard/Home.tsx");
  const data = { subjectId: 'subject', version: 1, generatedAt: '2026-10-28T12:00:00Z', timeZone: 'UTC', participation: accountRole === 'teacher' ? 'teach' : 'study',
    memberships: { teach: Number(accountRole === 'teacher'), study: Number(accountRole === 'student'), archived: 0 }, setup: { drafts: 0, invitations: 0 },
    modules: Object.fromEntries(['pending','review','feedback','agenda','queries','materials','classrooms','drafts','submitted'].map(name => [name,
      { status: 'ready', items: [], totalItems: 0, nextCursor: null }])) };
  for (const name of accountRole === 'teacher' ? ['pending','feedback'] : ['review','queries']) data.modules[name] = { status:'not-applicable' };
  const target = { kind: 'classroom', classroomId: 'allowed', section: 'plan' };
  data.modules.classrooms.items.push({ id: 'allowed', target,
    classroom: { id: 'allowed', name: 'Aula autorizada', role: accountRole, archived: false, subject: 'Ciencias', division: 'A' } });
  data.modules.classrooms.totalItems = 1;
  const actions = [];
  const view = hookView(Home, { accountRole, displayName: 'Alex', subjectId: 'subject', homeClient: { read: async () => data },
    onCreate: () => actions.push('create'), onJoin: () => actions.push('join'), onClassrooms: () => actions.push('classrooms'),
    onAction: destination => actions.push(destination) });
  try {
    await view.flush();
    const resources = descendants(view.tree, n => n.type === 'details' && n.props.className === 'fm-home-resources')[0];
    assert.equal(resources, undefined, 'The previous resources disclosure was retired by the approved design');
    const priorities = descendants(view.tree, node => node.type?.name === 'HomePriorities')[0];
    assert.equal(priorities.props.teacher, accountRole === 'teacher');
    const priorityTree = priorities.type(priorities.props);
    assert.match(text(priorityTree), accountRole === 'teacher' ? /Por acompañar/ : /Tu próximo paso/);
    assert.doesNotMatch(text(priorityTree), accountRole === 'teacher' ? /Ver todas las actividades/ : /Entregas.*Consultas/);
    assert.equal(descendants(view.tree, node => node.type?.name === 'HomeModule' && node.props.name === 'materials').length, 0);
    const classrooms = descendants(view.tree, node => node.type?.name === 'HomeClassCards')[0];
    const cards = classrooms.type(classrooms.props);
    const open = descendants(cards, node => node.type === 'a' && /Aula autorizada/.test(text(node)))[0];
    const all = descendants(cards, node => node.type === 'button' && text(node).trim() === 'Ver mis aulas')[0];
    assert.ok(open);
    assert.ok(all);
    assert.equal(open.props.href, '/mis-aulas?aula=allowed&section=plan');
    assert.deepEqual(actions, [], 'rendering links does not navigate');
    let defaultPrevented = false;
    open.props.onClick({ button: 0, preventDefault() { defaultPrevented = true; } });
    assert.equal(defaultPrevented, true);
    all.props.onClick();
    assert.deepEqual(actions, [target, 'classrooms']);
    assert.equal(typeof classrooms.props.onRetry, 'function');
    const agenda = descendants(view.tree, n => n.type?.name === 'HomeMiniagenda')[0];
    assert.ok(agenda, 'The approved mixed miniagenda remains visible independently of work modules');
    assert.equal(agenda.props.teacher, accountRole === 'teacher');
    assert.equal(agenda.props.data, data);
    assert.equal(typeof agenda.props.onRetry, 'function');
    assert.equal(descendants(view.tree, n => n.type?.name === 'HomeFoxyNote').length, 0);

  } finally { view.close(); if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});

test('Compact topic chooser uses the same selected context without issuing writes', async () => {
  const { PlanWorkspace } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/PlanWorkspace.tsx");
  const calls = [], extended = { ...room, units: [{ ...room.units[0], topics: [...room.units[0].topics, { id: 'second', name: 'Ecosistemas', status: 'PENDING' }] }] };
  const view = hookView(PlanWorkspace, { room: extended, onOpenActivity() {}, api: { call: async (...args) => { calls.push(args); return args[0].endsWith('/library') ? [] : { activities: [] }; } } });
  try {
    await view.flush();
    const chooser = descendants(view.tree, n => n.type === 'button' && n.props['aria-haspopup'] === 'dialog' && /Elegir tema/.test(text(n)))[0];
    assert.ok(chooser); assert.match(text(chooser), /La célula/);
    chooser.props.onClick(); await view.flush();
    const dialog = () => descendants(view.tree, n => n.type?.name === 'Dialog' && n.props.title === 'Elegir tema')[0];
    assert.ok(dialog());
    const choice = descendants(dialog(), n => n.type === 'button' && n.props['data-topic-choice'] === 'second')[0];
    assert.ok(choice);
    choice.props.onClick(); await view.flush();
    assert.equal(dialog(), undefined);
    const context = descendants(view.tree, n => n.props['aria-label'] === 'Tema seleccionado')[0];
    assert.match(text(context), /Ecosistemas/);
    const map = descendants(view.tree, n => n.type === 'nav' && n.props['aria-label'] === 'Unidades del plan')[0];
    assert.equal(descendants(map, n => n.props['aria-current'] === 'true')[0]?.props['data-topic-choice'], 'second');
    assert.ok(calls.every(([,method]) => !method || method === 'GET'));
  } finally { view.close(); }
});
