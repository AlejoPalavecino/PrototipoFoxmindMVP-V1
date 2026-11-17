import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const room = { id, role: 'teacher', revision: '2', archived: false, name: 'Contextual', subject: 'Ciencias',
  division: 'A', academicYear: 2026, teacher: 'Synthetic', timezone: 'UTC', coverKey: 'explore', units: [], plans: [] };
for (const [kind, extra, component, expected] of [
  ['classroom', { section: 'plan' }, 'Plan', {}],
  ['material', { materialId: id }, 'Library', { targetMaterialId: id }],
  ['upload-material', {}, 'Library', { openUpload: true }],
  ['create-activity', {}, 'Activities', { openAuthoring: true }],
  ['publish-notice', {}, 'Wall', {}],
  ['submissions', { activityId: id, filter: 'unpublished' }, 'Activities', { submissionFilter: 'unpublished' }],
]) test(`D9 Home ${kind} opens the real contextual ${component} without automatic mutation`, async () => {
  const { ClassroomView } = loadTsModule("apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx");
  const calls = [], view = hookView(ClassroomView, { id, initialCode: null, onExit() {},
    homeTarget: { kind, classroomId: id, ...extra },
    api: { call: async (...args) => { calls.push(args); return args[0] === `/${id}` ? room : []; } } });
  try {
    await view.flush(); const components = descendants(view.tree, node => node.type?.name === component);
    assert.equal(components.length, 1, `${kind} preserves its destination`);
    for (const [key, value] of Object.entries(expected)) assert.equal(components[0].props[key], value);
    assert.equal(calls.filter(([, method]) => method && method !== 'GET').length, 0);
  } finally { view.close(); }
});

test('D9 unpublished history uses explicit publication state and excludes drafts/published/unknown states', async () => {
  const { AttemptHistory } = loadTsModule("apps/web/src/application/workflows/activity-session/AttemptHistory.tsx");
  const attempts = [
    { id: 'private', number: 1, status: 'SUBMITTED', gradePublished: false },
    { id: 'published', number: 2, status: 'SUBMITTED', gradePublished: true },
    { id: 'unknown', number: 3, status: 'SUBMITTED' },
    { id: 'draft', number: 4, status: 'DRAFT', gradePublished: false },
  ].map(x => ({ firstName: 'Synthetic', lastName: x.id, studentId: id, currentMember: true, ...x }));
  const calls = [], view = hookView(AttemptHistory, { room, activityId: id, filter: 'unpublished', onClose() {}, onChanged: async () => {}, onResume() {},
    api: { call: async (...args) => { calls.push(args); return { revision: '2', activity: { title: 'Real activity', deadlineAt: null, zone: 'UTC' }, attempts }; } } });
  try {
    await view.flush(); const items = descendants(view.tree, node => node.type === 'li');
    assert.deepEqual(items.map(x => x.key), ['private']);
    assert.equal(calls.filter(([, method]) => method && method !== 'GET').length, 0);
  } finally { view.close(); }
});
