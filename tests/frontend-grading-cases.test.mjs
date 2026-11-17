import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { gradingView } from './helpers/audit-grade-dto.mjs';

const modulePath = 'apps/web/src/features/grading/api.ts';
function fixture() {
  const api = loadTsModule(modulePath), calls = [], result = { revision: '7' };
  const transport = { call: async (...args) => { calls.push(args); return result; }, fileUrl: id => `/files/${id}` };
  return { api, transport, calls, result, signal: new AbortController().signal };
}

test('grading capabilities preserve private save, explicit publication, payload and abort', async () => {
  const { api, transport, calls, result, signal } = fixture();
  const editor = api.createGradingEditingApi(transport, 'room', 'attempt');
  const publication = api.createGradingPublicationApi(transport, 'room', 'attempt');
  const input = { revision: '6', overallGrade: null, overallFeedback: 'Privada', questions: [], rubricMarks: [], finalGradeOverride: '0.00' };
  assert.equal(await editor.load(signal), result);
  assert.equal(await editor.save(input, signal), result);
  assert.equal(await publication.publish('7', signal), result);
  assert.equal(editor.fileUrl('attachment'), '/files/attachment');
  assert.deepEqual(calls, [
    ['/room/attempts/attempt/grading', 'GET', undefined, signal],
    ['/room/attempts/attempt/grading', 'POST', input, signal],
    ['/room/attempts/attempt/publish-grade', 'POST', { revision: '7', confirm: true }, signal],
  ]);
});

test('AI review keeps snapshot, revision and request ID and never publishes', async () => {
  const { api, transport, calls, signal } = fixture();
  const review = api.createGradingAiReviewApi(transport, 'room', 'attempt');
  const proposal = { schemaVersion: 'grading-proposal-v1', overallGrade: '8.00', overallFeedback: 'Revisada', questions: [], warnings: [] };
  const apply = { requestId: 'request', revision: '2', snapshotHash: 'snapshot', proposal };
  const discard = { requestId: 'discard', revision: '3' };
  await review.load(signal); await review.apply('job', apply, signal); await review.discard('job', discard, signal);
  assert.deepEqual(calls, [
    ['/room/attempts/attempt/grading-ai', 'GET', undefined, signal],
    ['/room/attempts/attempt/grading-ai/job/apply', 'POST', apply, signal],
    ['/room/attempts/attempt/grading-ai/job/discard', 'POST', discard, signal],
  ]);
});

test('correction, result, progress and summary expose only their own routes', async () => {
  const { api, transport, calls, signal } = fixture();
  const corrections = api.createGradeCorrectionsApi(transport, 'room', 'attempt');
  const results = api.createGradingResultsApi(transport, 'room', 'attempt');
  const progress = api.createGradingProgressApi(transport, 'room');
  const summary = api.createStudentSummaryApi(transport, 'room', 'student');
  const correction = { revision: '4', newGrade: '9', reason: 'Revisión', confirm: true };
  await corrections.load(signal); await corrections.correct(correction, signal);
  await results.load(signal); await progress.load(undefined, signal); await progress.load('student', signal); await summary.load(signal);
  assert.equal(results.fileUrl('attachment'), '/files/attachment');
  assert.deepEqual(calls, [
    ['/room/attempts/attempt/grade-corrections', 'GET', undefined, signal],
    ['/room/attempts/attempt/grade-corrections', 'POST', correction, signal],
    ['/room/attempts/attempt/result', 'GET', undefined, signal],
    ['/room/progress', undefined, undefined, signal],
    ['/room/members/student/progress', undefined, undefined, signal],
    ['/room/members/student/ai-summary', undefined, undefined, signal],
  ]);
});

test('API entry remains independent of React, CSS, Node and runtime domain imports', () => {
  for (const path of [modulePath, 'apps/web/src/features/grading/model/grading-operations.ts']) {
    const source = readFileSync(path, 'utf8').split('\n').filter(line => !line.startsWith('import type ')).join('\n');
    assert.doesNotMatch(source, /from\s+['"](?:react|node:)|\.css['"]|from\s+['"][^'"]*domain[^'"]*['"]/g,
      'domain contracts must be imported as types only');
  }
});

test('typed editor keeps reload discard and cancellation through extracted state', async t => {
  const { GradingEditor } = loadTsModule('apps/web/src/features/grading/editing/GradingEditor.tsx');
  const { api } = fixture();
  const calls = [], data = structuredClone(gradingView);
  Object.assign(data.grade, { finalGrade: '6.00', overallFeedback: 'Guardada' });
  const transport = { call: async (...args) => { calls.push(args); return structuredClone(data); }, fileUrl: () => '' };
  const view = hookView(GradingEditor, {
    operations: api.createGradingEditingApi(transport, 'room', 'attempt'),
    publication: api.createGradingPublicationApi(transport, 'room', 'attempt'),
    aiReview: api.createGradingAiReviewApi(transport, 'room', 'attempt'),
    corrections: api.createGradeCorrectionsApi(transport, 'room', 'attempt'),
    roomId: 'room', attemptId: 'attempt', onClose() {}, onChanged: async () => {},
  });
  t.after(() => view.close()); await view.flush();
  const field = label => descendants(view.tree, node => node.props['aria-label'] === label)[0];
  const button = label => descendants(view.tree, node => node.type === 'button' && node.props.children === label)[0];
  const dialog = () => descendants(view.tree, node => node.type?.name === 'Dialog' && node.props.title === 'Tenés cambios sin guardar')[0];
  field('Calificación general').props.onChange({ target: { value: '9,25' } });
  field('Devolución general opcional').props.onChange({ target: { value: 'Pendiente' } });
  await view.flush(); button('Recargar corrección').props.onClick(); await view.flush();
  assert.ok(dialog()); assert.equal(calls.length, 1);
  button('Volver a la corrección').props.onClick(); await view.flush();
  assert.equal(field('Calificación general').props.value, '9,25');
  assert.equal(field('Devolución general opcional').props.value, 'Pendiente');
  assert.equal(calls.length, 1);
  button('Recargar corrección').props.onClick(); await view.flush();
  button('Descartar cambios').props.onClick(); await view.flush();
  assert.equal(field('Calificación general').props.value, '6,00');
  assert.equal(field('Devolución general opcional').props.value, 'Guardada');
  assert.deepEqual(calls.map(call => call[1]), ['GET', 'GET']);
});

test('draft cancellation preserves every field and revision; confirmed reload restores them together', async t => {
  const { useGradingDraft } = loadTsModule('apps/web/src/features/grading/editing/use-grading-draft.ts');
  const view = hookView(() => useGradingDraft(), {});
  t.after(() => view.close()); await view.flush();
  const server = structuredClone(gradingView);
  server.grade = { ...server.grade, calculatedGrade: '4.00', finalGradeOverride: '5.00', rubricMarks: [{ criterionIndex: 0, score: '6' }], overallFeedback: 'Original' };
  server.activity.questions = [{ id: 'question', manualPoints: '1', feedback: 'Original por pregunta' }];
  view.tree.restore(server); await view.flush();
  view.tree.setOverall('9'); view.tree.setOverride('9.25'); view.tree.setMarks({ 0: '8' });
  view.tree.setPoints({ question: '2' }); view.tree.setComments({ question: 'Comentario local' });
  view.tree.setFeedback({ general: 'General local', strengths: 'Fortaleza', improvements: 'Mejora', nextStep: 'Siguiente' });
  view.tree.change(); await view.flush();
  const before = () => ({ revision: view.tree.data.revision, overall: view.tree.overall, override: view.tree.override,
    marks: view.tree.marks, points: view.tree.points, comments: view.tree.comments, feedback: view.tree.feedback });
  const local = structuredClone(before()); let reloads = 0;
  view.tree.leaveEditor(() => { reloads++; view.tree.restore(server); }); await view.flush();
  assert.equal(reloads, 0); assert.equal(typeof view.tree.leave, 'function');
  view.tree.setLeave(null); await view.flush();
  assert.deepEqual(before(), local); assert.equal(view.tree.dirty, true);
  view.tree.leaveEditor(() => { reloads++; view.tree.restore(server); }); await view.flush();
  const confirm = view.tree.leave; view.tree.setLeave(null); confirm(); await view.flush();
  assert.equal(reloads, 1); assert.equal(view.tree.dirty, false); assert.equal(view.tree.data.revision, server.revision);
  assert.equal(view.tree.overall, '4.00'); assert.equal(view.tree.override, '5.00');
  assert.deepEqual(view.tree.marks, { 0: '6' }); assert.deepEqual(view.tree.points, { question: '1' });
  assert.deepEqual(view.tree.comments, { question: 'Original por pregunta' }); assert.equal(view.tree.feedback.general, 'Original');
});

test('unmount aborts editor load and a late response cannot restore its draft', async () => {
  const { useGradingPersistence } = loadTsModule('apps/web/src/features/grading/editing/use-grading-persistence.ts');
  let signal, resolve, restores = 0;
  const operations = { load: value => { signal = value; return new Promise(done => { resolve = done; }); } };
  const restore = () => restores++, clear = () => {};
  const view = hookView(() => useGradingPersistence(operations, restore, clear), {});
  await view.flush(); assert.equal(signal.aborted, false);
  view.close(); assert.equal(signal.aborted, true);
  resolve(gradingView); await Promise.resolve(); await Promise.resolve();
  assert.equal(restores, 0);
});
