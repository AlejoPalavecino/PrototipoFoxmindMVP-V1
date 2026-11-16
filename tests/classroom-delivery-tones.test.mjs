import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const { AttemptHistory } = loadTsModule('apps/web/src/application/academic-AttemptHistory.tsx');
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
test('student activity cards distinguish received work from published feedback', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/academic-Activities.tsx');
  const states = ['PENDING', 'DRAFT', 'SUBMITTED', 'REVIEWED'];
  const view = hookView(Activities, { room: { id: 'room', role: 'student', timezone: 'UTC', units: [] }, reload: async () => {},
    api: { call: async path => path.endsWith('/progress') ? { scope: 'classroom', students: [] } : path.endsWith('/library') ? [] : {
      activities: states.map(studentState => ({ id: studentState, title: studentState, studentState, type: 'ASSIGNMENT', status: 'PUBLISHED', topicIds: [], zone: 'UTC', deadlineAt: null })) } } });
  try {
    await view.flush();
    const cards = descendants(view.tree, node => node.type === 'article');
    assert.deepEqual(cards.map(card => descendants(card, node => node.type === 'span' && 'data-tone' in node.props)[0].props['data-tone']), ['informational', undefined, 'informational', 'confirmed']);
  } finally { view.close(); }
});
for (const role of ['teacher', 'student']) test(`delivery tones reflect ${role} visibility`, async () => {
  const attempts = ['pending', 'saved', 'published'].map((reviewState, index) => ({ id: reviewState, studentId: reviewState, number: 1,
    status: 'SUBMITTED', currentMember: true, firstName: 'Sintético', lastName: String(index), reviewState, gradePublished: reviewState === 'published' }));
  const view = hookView(AttemptHistory, { room: { id: 'room', role, timezone: 'UTC' }, activityId: 'activity', initialView: 'history',
    onClose() {}, onResume() {}, onChanged: async () => {}, api: { call: async () => ({ activity: { deadlineAt: null, zone: 'UTC' }, attempts }) } });
  try {
    await view.flush();
    const rows = descendants(view.tree, node => node.type === 'li');
    assert.equal(rows.length, 3);
    assert.deepEqual(rows.map(row => descendants(row, node => node.type === 'span' && 'data-tone' in node.props)[0].props['data-tone']),
      role === 'teacher' ? ['pending', 'saved', 'confirmed'] : ['confirmed', 'confirmed', 'confirmed']);
    if (role === 'student') assert.doesNotMatch(text(view.tree), /Revisión privada guardada|Por revisar/);
  } finally { view.close(); }
});
