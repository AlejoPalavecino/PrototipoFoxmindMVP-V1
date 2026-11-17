import { gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join('') : text(value?.props?.children ?? '');
const completion = { expected: 3, delivered: 2, pending: 1, onTime: 2, late: 0, pendingResubmissions: 0, percentage: '66.67', emptyLabel: null };
const activity = (id, grade, submitted) => ({ id, title: id, type: 'ASSIGNMENT', expected: true, firstSubmission: submitted ? { id: 'receipt-' + id, number: 1, submittedAt: '2026-11-15T12:00:00Z', appliedDeadlineAt: null, late: false } : null, pendingResubmission: false, grade, publishedAttemptId: grade === null ? null : 'receipt-' + id });
const student = { studentId: 'synthetic-student', firstName: 'Ana', lastName: 'Prueba', currentMember: true, completion, performance: { graded: 1, average: '0' }, activities: [activity('zero', '0', true), activity('waiting', null, true), activity('missing', null, false)] };
async function overview(scope, callback) {
  const { Progress } = loadTsModule('apps/web/src/features/grading/progress/Progress.tsx');
  const data = { revision: '1', archived: false, plan: { total: 2, taught: 1, percentage: '50' }, ...(scope === 'self' ? { ...student, scope } : { scope, studentCount: 1, students: [student], completion, performance: { gradedStudents: 1, average: '0' } }) };
  const view = hookView(Progress, gradingFixtureProps('Progress', { api: { call: async () => data }, classroomId: 'synthetic-room', onOpenActivity: callback, onOpenStudent: callback, onOpenResult: callback }));
  await view.flush();
  const component = descendants(view.tree, node => node.type?.name === (scope === 'self' ? 'StudentOverview' : 'TeacherOverview'))[0];
  assert.ok(component);
  return { view, tree: component.type(component.props) };
}
test('student overview includes published zero and never turns a missing grade into a result', async () => {
  const calls = [], { view, tree } = await overview('self', id => calls.push(id));
  try {
    const feedback = descendants(tree, node => node.props.className?.split(' ').includes('parity-feedback'))[0];
    assert.match(text(feedback), /zero/);
    assert.doesNotMatch(text(feedback), /waiting|missing/);
    const open = descendants(feedback, node => node.type === 'button')[0];
    open.props.onClick(); assert.deepEqual(calls, ['zero']);
    assert.match(text(tree), /0 \/ 10/);
  } finally { view.close(); }
});
test('teacher charts distinguish unsubmitted work from work awaiting published feedback and retain zero grades', async () => {
  const calls = [], { view, tree } = await overview('classroom', id => calls.push(id));
  try {
    const images = descendants(tree, node => node.props.role === 'img').map(node => node.props['aria-label']);
    assert.ok(images.some(label => label === 'waiting: 1 sin devolución, 0 publicadas, 0 sin entrega'));
    assert.ok(images.some(label => label === 'missing: 0 sin devolución, 0 publicadas, 1 sin entrega'));
    assert.ok(images.some(label => label.includes('0–3,9: 1')));
    descendants(tree, node => node.type === 'button' && text(node) === 'Ver recorrido')[0].props.onClick();
    assert.deepEqual(calls, ['synthetic-student']);
  } finally { view.close(); }
});
