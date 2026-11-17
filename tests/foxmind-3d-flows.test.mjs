import { authoringFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const room = role => ({ id, revision: '2', role, archived: false, name: 'Ciencias', subject: 'Ciencias',
  division: 'A', academicYear: 2026, teacher: 'Docente sintético', timezone: 'UTC', coverKey: 'explore', plans: [], units: [] });

test('D2 settings is the only new literal auth continuation; unsafe variants stay closed', () => {
  const { classroomDestination, classroomAuthHref } = ({...loadTsModule("apps/web/src/application/clients/classroom-client.ts"),classroomDestination:loadTsModule('apps/web/src/application/navigation/destinations.ts').safeDestination,classroomAuthHref:loadTsModule('apps/web/src/application/navigation/destinations.ts').authHref,classroomHomeHref:loadTsModule('apps/web/src/application/navigation/destinations.ts').classroomHomeHref,classroomHomeDestination:loadTsModule('apps/web/src/application/navigation/destinations.ts').classroomHomeDestination});
  assert.equal(classroomDestination('/settings'), '/settings');
  for (const view of ['sign-in', 'register', 'verify-email'])
    assert.equal(classroomAuthHref(view, '/settings'), `/${view}?next=%2Fsettings`);
  for (const unsafe of ['/settings/', '/settings?tab=password', '/settings#token=x', '//settings',
    'https://example.test/settings', '/%73ettings', '/profile', ['/settings']]) {
    assert.equal(classroomDestination(unsafe), null, String(unsafe));
    assert.equal(classroomAuthHref('sign-in', unsafe), '/sign-in');
  }
  assert.equal(classroomDestination('/inicio'), '/inicio');
  assert.equal(classroomDestination(`/mis-aulas?aula=${id}`), `/mis-aulas?aula=${id}`);
});

for (const role of ['teacher', 'student']) test(`D3 ordinary ${role} classroom entry opens Plan without an academic write`, async () => {
  const { ClassroomView } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx");
  const calls = [], api = { call: async (...args) => { calls.push(args); return args[0] === `/${id}` ? room(role) : []; } };
  const view = hookView(ClassroomView, { api, id, initialCode: null, onExit() {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type?.name === 'Plan').length, 1);
    assert.equal(descendants(view.tree, node => node.type?.name === 'Activities').length, 0);
    assert.ok(calls.every(([, method]) => !method || method === 'GET'), 'Opening Plan never creates an attempt or saves anything');
  } finally { view.close(); }
});

test('a confirmed archived departure cannot navigate after the classroom view unmounts', async () => {
  const { ClassroomView } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx");
  let finish;
  const departures = [];
  const api = { call: async path => {
    if (path.endsWith('/leave')) return new Promise(resolve => { finish = resolve; });
    return path === `/${id}` ? { ...room('student'), archived: true } : [];
  } };
  const view = hookView(ClassroomView, { api, id, initialCode: null, onExit() {},
    onMembershipEnded: confirmed => departures.push(confirmed) });
  await view.flush();
  const [navigation] = descendants(view.tree, node => node.type?.name === 'ClassroomNavigation');
  navigation.props.onSelect('members');
  await view.flush();
  const [leave] = descendants(view.tree, node => node.type === 'button' && node.props.children === 'Salir de esta aula');
  leave.props.onClick();
  await view.flush();
  const [dialogs] = descendants(view.tree, node => node.type?.name === 'ClassroomDialogs');
  const departure = dialogs.props.confirm.run();
  view.close();
  finish({ ok: true });
  await departure;
  assert.deepEqual(departures, []);
});

for (const [name, destination, component] of [
  ['wall', { classroomId: id, postId: id }, 'Wall'],
  ['activity', { kind: 'ACTIVITY', classroomId: id, activityId: id }, 'Activities'],
  ['result', { kind: 'GRADE', classroomId: id, activityId: id, attemptId: id, gradeId: id }, 'Activities'],
]) test(`D3 explicit ${name} destination retains priority over ordinary Plan`, async () => {
  const { ClassroomView } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx");
  const view = hookView(ClassroomView, { api: { call: async path => path === `/${id}` ? room('student') : [] },
    id, initialCode: null, wallTarget: destination, onExit() {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type?.name === component).length, 1);
    assert.equal(descendants(view.tree, node => node.type?.name === 'Plan').length, 0);
  } finally { view.close(); }
});

test('D3 API draft validation preserves three legacy cover keys and accepts seven new persisted keys', () => {
  const { draftPayload } = loadTsModule("apps/api/src/modules/classrooms/infrastructure/policy.ts");
  for (const coverKey of ['explore', 'create', 'discover', 'literature', 'math', 'biology', 'society', 'science', 'creative', 'general'])
    assert.deepEqual(draftPayload({ coverKey }, false), { coverKey });
  for (const coverKey of ['unknown', '', 'GENERAL', null, ['general']])
    assert.throws(() => draftPayload({ coverKey }, false), { code: 'INVALID_INPUT' });
});

test('D5 each question subtype permits thirty without the old ten-item UI restriction', () => {
  const { ActivityGenerationForm, defaultGenerationForm } = loadTsModule("apps/web/src/features/activity-authoring/generation/ActivityGenerationForm.tsx");
  for (const key of ['development', 'singleChoice', 'multipleChoice']) {
    const value = { ...defaultGenerationForm(), type: 'QUESTIONNAIRE', counts: { assignment: 0, development: 0, singleChoice: 0, multipleChoice: 0, [key]: 30 } };
    const tree = ActivityGenerationForm({ room: room('teacher'), value, update() {}, sources: [], disabled: false });
    const selected = descendants(tree, node => node.type === 'input' && node.props.type === 'number' && node.props.value === 30);
    assert.equal(selected.length, 1); assert.equal(selected[0].props.max, 30, key);
  }
});

test('D5 a combined thirty-one-question request never dispatches generation', async () => {
  const { ActivityGeneration } = loadTsModule("apps/web/src/features/activity-authoring/generation/ActivityGeneration.tsx");
  const calls = [], view = hookView(ActivityGeneration, authoringFixtureProps('ActivityGeneration', { room: room('teacher'), onApplied: async () => {}, onClose() {},
    api: { call: async (...args) => { calls.push(args); return args[0].endsWith('/sources') ? { revision: '2', sources: [] } : { jobs: [] }; } } }));
  try {
    await view.flush();
    const fields = descendants(view.tree, node => node.type?.name === 'GenerationSetup')[0];
    fields.props.update({ ...fields.props.value, type: 'QUESTIONNAIRE', counts: { assignment: 0, development: 16, singleChoice: 15, multipleChoice: 0 } });
    await view.flush();
    const setup = descendants(view.tree, node => node.type?.name === 'GenerationSetup')[0];
    await setup.props.generate(setup.props.value); await view.flush();
    assert.equal(calls.filter(([, method]) => method === 'POST').length, 0, 'The total limit is enforced before consuming a generation');
  } finally { view.close(); }
});
