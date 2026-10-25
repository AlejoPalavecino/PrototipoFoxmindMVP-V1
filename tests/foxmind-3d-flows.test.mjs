import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const room = role => ({ id, revision: '2', role, archived: false, name: 'Ciencias', subject: 'Ciencias',
  division: 'A', academicYear: 2026, teacher: 'Docente sintético', timezone: 'UTC', coverKey: 'explore', plans: [], units: [] });

test('D2 settings is the only new literal auth continuation; unsafe variants stay closed', () => {
  const { classroomDestination, classroomAuthHref } = loadTsModule('apps/web/src/lib/classroom-client.ts');
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
  const { ClassroomView } = loadTsModule('apps/classrooms-ui/ClassroomView.tsx');
  const calls = [], api = { call: async (...args) => { calls.push(args); return args[0] === `/${id}` ? room(role) : []; } };
  const view = hookView(ClassroomView, { api, id, initialCode: null, onExit() {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type?.name === 'Plan').length, 1);
    assert.equal(descendants(view.tree, node => node.type?.name === 'Activities').length, 0);
    assert.ok(calls.every(([, method]) => !method || method === 'GET'), 'Opening Plan never creates an attempt or saves anything');
  } finally { view.close(); }
});

for (const [name, destination, component] of [
  ['wall', { classroomId: id, postId: id }, 'Wall'],
  ['activity', { kind: 'ACTIVITY', classroomId: id, activityId: id }, 'Activities'],
  ['result', { kind: 'GRADE', classroomId: id, activityId: id, attemptId: id, gradeId: id }, 'Activities'],
]) test(`D3 explicit ${name} destination retains priority over ordinary Plan`, async () => {
  const { ClassroomView } = loadTsModule('apps/classrooms-ui/ClassroomView.tsx');
  const view = hookView(ClassroomView, { api: { call: async path => path === `/${id}` ? room('student') : [] },
    id, initialCode: null, wallTarget: destination, onExit() {} });
  try {
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type?.name === component).length, 1);
    assert.equal(descendants(view.tree, node => node.type?.name === 'Plan').length, 0);
  } finally { view.close(); }
});

test('D3 API draft validation preserves three legacy cover keys and accepts seven new persisted keys', () => {
  const { draftPayload } = loadTsModule('apps/api/src/classrooms/policy.ts');
  for (const coverKey of ['explore', 'create', 'discover', 'literature', 'math', 'biology', 'society', 'science', 'creative', 'general'])
    assert.deepEqual(draftPayload({ coverKey }, false), { coverKey });
  for (const coverKey of ['unknown', '', 'GENERAL', null, ['general']])
    assert.throws(() => draftPayload({ coverKey }, false), { code: 'INVALID_INPUT' });
});
