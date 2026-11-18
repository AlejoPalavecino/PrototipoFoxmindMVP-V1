import { gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const text = value => typeof value === 'string' || typeof value === 'number' ? String(value) : Array.isArray(value) ? value.map(text).join('') : text(value?.props?.children ?? '');
const emptyCompletion = { expected: 0, delivered: 0, pending: 0, onTime: 0, late: 0, pendingResubmissions: 0, percentage: null, emptyLabel: 'Sin actividades pendientes de seguimiento' };
const plan = { total: 2, taught: 1, percentage: '50', units: [{ id: 'unit', name: 'Una unidad real', total: 2, taught: 1 }] };
const activity = (id, review, grade = null) => ({ id, title: id, type: 'ASSIGNMENT', expected: true, firstSubmission: { id: `first-${id}`, number: 1, submittedAt: '2026-11-16T12:00:00Z', appliedDeadlineAt: null, late: false }, pendingResubmission: false, grade, review });
const student = activities => ({ studentId: 'student', firstName: 'Ana', lastName: 'Prueba', currentMember: true, completion: { ...emptyCompletion, expected: activities.length, delivered: activities.length, percentage: '100' }, performance: { graded: 1, average: '0' }, activities });
async function viewFor(data, props = {}) {
  const { Progress } = loadTsModule('apps/web/src/features/grading/progress/Progress.tsx');
  const view = hookView(Progress, gradingFixtureProps('Progress', { api: { call: async () => data }, classroomId: 'room', ...props }));
  await view.flush();
  const element = descendants(view.tree, node => node.type?.name === (data.scope === 'classroom' ? 'TeacherOverview' : 'StudentOverview'))[0];
  return { view, tree: element?.type(element.props) ?? view.tree };
}

test('teacher progress keeps its heading through loading, failure and retry', async () => {
  const { Progress } = loadTsModule('apps/web/src/features/grading/progress/Progress.tsx');
  const requests = [];
  const view = hookView(Progress, gradingFixtureProps('Progress', { classroomId: 'room', expectedScope: 'classroom',
    api: { call: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) } }));
  try {
    await view.flush();
    assert.match(text(view.tree), /Una mirada a tu grupo/);
    assert.doesNotMatch(text(view.tree), /Tu recorrido, paso a paso/);
    requests[0].reject(new Error('Sin conexión'));
    await view.flush();
    assert.match(text(view.tree), /Una mirada a tu grupo.*Sin conexión/);
    assert.doesNotMatch(text(view.tree), /Tu recorrido, paso a paso/);
    descendants(view.tree, node => node.type === 'button' && text(node).includes('Reintentar progreso'))[0].props.onClick();
    await view.flush();
    assert.equal(requests.length, 2);
    assert.match(text(view.tree), /Una mirada a tu grupo/);
    assert.doesNotMatch(text(view.tree), /Sin conexión/);
  } finally { view.close(); }
});

test('own empty progress preserves absent denominator and displays real unit progress without private review', async () => {
  const data = { ...student([]), scope: 'self', plan, completion: emptyCompletion, performance: { graded: 0, average: null } };
  const { view, tree } = await viewFor(data);
  try {
    const ring = descendants(tree, node => node.props.className === 'parity-progress-ring')[0];
    assert.doesNotMatch(text(ring), /0%/);
    assert.match(text(ring), /—/);
    assert.match(text(tree), /Todavía no hay notas publicadas/);
    const unit = descendants(view.tree, node => node.type?.name === 'UnitProgress')[0];
    assert.ok(unit, 'the learning path must be visible without opening a second dialog');
    assert.match(text(unit.type(unit.props)), /Una unidad real/);
  } finally { view.close(); }
});

test('teacher distinguishes pending, saved, published and missing; re-submission keeps prior grade but is reviewable', async () => {
  const rows = [activity('Nueva entrega', { attemptId: 'new', state: 'pending' }, '0'), activity('Guardada', { attemptId: 'saved', state: 'saved' }), activity('Publicada', { attemptId: 'published', state: 'published' }, '8'), { ...activity('Pendiente', null), firstSubmission: null }];
  const calls = [];
  const { view, tree } = await viewFor({ scope: 'classroom', plan, students: [student(rows)], completion: { ...emptyCompletion, expected: 4, delivered: 3 }, performance: { average: '5.25', gradedStudents: 1 } }, { onReview: (...args) => calls.push(args) });
  try {
    const labels = descendants(tree, node => node.props.role === 'img').map(node => node.props['aria-label']);
    assert.ok(labels.includes('Nueva entrega: 1 por revisar, 0 revisiones privadas, 0 publicadas, 0 sin entrega'));
    assert.ok(labels.includes('Guardada: 0 por revisar, 1 revisiones privadas, 0 publicadas, 0 sin entrega'));
    assert.ok(labels.some(label => label.includes('0–3,9: 1')), 'previous published zero is retained in performance');
    assert.match(text(tree), /5,25/);
    const review = descendants(tree, node => node.type === 'button' && text(node).includes('Revisar entrega'))[0];
    assert.ok(review); review.props.onClick(); assert.deepEqual(calls, [['Nueva entrega', 'new']]);
  } finally { view.close(); }
});

test('progress service removes teacher review metadata from self and AI projection, preserves effective grade, enforces member authorization', async () => {
  const { ProgressService } = loadTsModule('apps/api/src/modules/grading/progress/application/progress.ts');
  const privateRow = { ...activity('activity', { attemptId: 'private-attempt', state: 'saved' }, '0'), studentId: 'student', confirmedAttempts: 2 };
  let actorId = 'teacher'; const authorization = [];
  const context = { ports: {}, run: async (_request, write, fn) => { assert.equal(write, false); return fn({}, { id: actorId }); },
    classroom: async (_tx, actor, _room, _write, teacherOnly) => { authorization.push(teacherOnly); if (teacherOnly && actor.id !== 'teacher') throw new Error('FORBIDDEN'); return { teacher_id: 'teacher', revision: 1n }; } };
  const repository = { students: async () => [{ studentId: 'student', firstName: 'Ana', lastName: 'Prueba', currentMember: true }], progressRows: async () => [privateRow], topics: async () => [{ total: 2, taught: 1 }], units: async () => plan.units };
  const service = new ProgressService(context, repository);
  const teacher = await service.getProgress({}, 'room');
  assert.deepEqual(teacher.students[0].activities[0].review, privateRow.review);
  assert.equal(teacher.students[0].activities[0].grade, '0');
  assert.deepEqual(teacher.plan.units, plan.units);
  actorId = 'student'; const own = await service.getProgress({}, 'room');
  assert.equal(Object.hasOwn(own.activities[0], 'review'), false);
  assert.equal(own.activities[0].grade, '0');
  assert.equal(Object.hasOwn((await service.progressView({}, 'room', 'student')).activities[0], 'review'), false);
  await assert.rejects(service.getStudentProgress({}, 'room', 'a1111111-1111-4111-8111-111111111111'), /FORBIDDEN/);
  assert.equal(authorization.at(-1), true);
});

test('individual journey opens latest review directly and returns to progress without an unrelated profile detour', async () => {
  const { StudentRecord } = loadTsModule('apps/web/src/features/grading/progress/StudentRecord.tsx');
  const calls = [], summary = { firstName: 'Ana', lastName: 'Prueba', studentId: 'student', progress: true, attempts: [] };
  const view = hookView(StudentRecord, gradingFixtureProps('StudentRecord', { api: {}, classroomId: 'room', summary, onBack: () => calls.push('back'), onOpenActivity: (...args) => calls.push(args) }));
  await view.flush();
  try {
    const dialog = descendants(view.tree, node => node.type?.name === 'Dialog')[0];
    assert.equal(dialog.props.title, 'El recorrido de Ana Prueba');
    const progress = descendants(view.tree, node => node.type?.name === 'Progress')[0];
    progress.props.onReview('activity', 'latest');
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Volver al progreso')[0].props.onClick();
    assert.deepEqual(calls, [['activity', 'latest'], 'back']);
  } finally { view.close(); }
});

test('student feedback opens the published attempt behind the displayed zero, never the latest private resubmission', async () => {
  const calls = [];
  const row = { ...activity('Trabajo', undefined, '0'), publishedAttemptId: 'published-first', firstSubmission: { id: 'first', number: 1 }, pendingResubmission: false };
  const { view, tree } = await viewFor({ ...student([row]), scope: 'self', plan }, {
    onOpenActivity: id => calls.push(['activity', id]), onOpenResult: (...args) => calls.push(['result', ...args]),
  });
  try {
    const feedback = descendants(tree, node => node.props.className === 'parity-progress-panel parity-feedback')[0];
    assert.match(text(feedback), /0 \/ 10/);
    descendants(feedback, node => node.type === 'button' && text(node).includes('Ver devolución'))[0].props.onClick();
    assert.deepEqual(calls, [['result', 'Trabajo', 'published-first']]);
  } finally { view.close(); }
});

test('own progress names an actionable resubmission before an ordinary outstanding assignment', async () => {
  const pending = { ...activity('Guía de práctica', undefined), firstSubmission: null };
  const reopening = { ...activity('Experimento de luz', undefined, '0'), pendingResubmission: true, publishedAttemptId: 'published-first' };
  const consultation = { ...activity('Material de consulta', undefined), firstSubmission: null, expected: false };
  const calls = [];
  const { view, tree } = await viewFor({ ...student([consultation, pending, reopening]), scope: 'self', plan }, {
    onShowActivities: () => calls.push('activities'),
  });
  try {
    const summary = descendants(tree, node => node.props.className === 'parity-progress-panel parity-own-summary')[0];
    assert.match(text(summary), /Revisá los cambios para volver a entregar «Experimento de luz»/);
    assert.doesNotMatch(text(summary), /Material de consulta|Guía de práctica/);
    descendants(summary, node => node.type === 'button' && text(node).includes('Seguir con mis actividades'))[0].props.onClick();
    assert.deepEqual(calls, ['activities']);
  } finally { view.close(); }
});

test('an archived classroom suggests reviewing published feedback instead of submitting work', async () => {
  const pending = { ...activity('Guía de práctica', undefined), firstSubmission: null };
  const graded = { ...activity('Experimento de luz', undefined, '0'), publishedAttemptId: 'published-first' };
  const { view, tree } = await viewFor({ ...student([pending, graded]), scope: 'self', archived: true, plan });
  try {
    const summary = descendants(tree, node => node.props.className === 'parity-progress-panel parity-own-summary')[0];
    assert.match(text(summary), /Revisá la devolución publicada de «Experimento de luz»/);
    assert.doesNotMatch(text(summary), /Guía de práctica/);
  } finally { view.close(); }
});
