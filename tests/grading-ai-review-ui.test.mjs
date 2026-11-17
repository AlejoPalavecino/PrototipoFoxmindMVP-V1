import { gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const roomId = '11111111-1111-4111-8111-111111111111', attemptId = '22222222-2222-4222-8222-222222222222';
const path = `/${roomId}/attempts/${attemptId}/grading-ai`;
const proposal = { schemaVersion: 'grading-proposal-v1', overallGrade: '7.00', overallFeedback: 'Devolución sugerida', questions: [], warnings: [] };
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join(' ') : node?.props ? text(node.props.children) : '';
const button = (view, re) => descendants(view.tree, n => n.type === 'button' && re.test(text(n)))[0];
const field = (view, re, type) => descendants(view.tree, n => n.type === 'label' && re.test(text(n)))
  .flatMap(n => descendants(n, child => child.type === type))[0];
async function openSuggestion(view) {
  const open = button(view, /^Revisar sugerencia$/);
  assert.ok(open);
  assert.equal(open.props.disabled, false);
  open.props.onClick();
  await view.flush();
  assert.ok(descendants(view.tree, node => node.type?.name === 'Dialog' && node.props.title === 'Revisar sugerencia').length);
}
async function fixture({ state = 'READY', dirty = false, failure = false } = {}) {
  const { GradingAiReview } = loadTsModule('apps/web/src/features/grading/ai-review/GradingAiReview.tsx');
  const calls = [], applied = [], job = { id: 'job', state, snapshotHash: 'snapshot', proposal: state === 'READY' ? structuredClone(proposal) : null };
  const api = { call: async (...args) => { calls.push(args); if (args[1] === 'GET') { if (failure) throw new Error('Carga fallida'); return job; }
    return { revision: '3' }; } };
  const view = hookView(GradingAiReview, gradingFixtureProps('GradingAiReview', { api, roomId, attemptId, revision: '2', dirty, onApplied: async result => { applied.push(result); } }));
  await view.flush(); return { view, calls, applied, job };
}

test('propuesta lista es privada, muestra nota y devolución editables', async () => {
  const f = await fixture(); try {
    assert.match(text(f.view.tree), /sugerencia|propuesta/i);
    assert.match(text(f.view.tree), /privad/i);
    assert.equal(field(f.view, /nota|calificaci[oó]n/i, 'input'), undefined);
    await openSuggestion(f.view);
    assert.ok(field(f.view, /nota|calificaci[oó]n/i, 'input'));
    assert.ok(field(f.view, /devoluci[oó]n|comentario/i, 'textarea'));
    assert.equal(f.calls.filter(x => x[1] !== 'GET').length, 0);
  } finally { f.view.close(); }
});

test('aceptar envía propuesta editada a apply privado con revisión y snapshot, sin publicar', async () => {
  const f = await fixture(); try {
    await openSuggestion(f.view);
    const note = field(f.view, /nota|calificaci[oó]n/i, 'input'), feedback = field(f.view, /devoluci[oó]n|comentario/i, 'textarea');
    assert.ok(note); assert.ok(feedback); note.props.onChange({ target: { value: '8.25' } }); feedback.props.onChange({ target: { value: 'Editada' } }); await f.view.flush();
    const accept = button(f.view, /usar sugerencia|aceptar sugerencia/i); assert.ok(accept); accept.props.onClick(); await f.view.flush();
    assert.ok(!f.calls.some(call => /\/apply|publish-grade/.test(call[0])));
    const confirmation = button(f.view, /confirmar aplicaci[oó]n/i);
    assert.ok(confirmation);
    confirmation.props.onClick();
    await f.view.flush();
    const call = f.calls.find(x => x[0] === `${path}/job/apply` && x[1] === 'POST'); assert.ok(call);
    assert.equal(call[2].revision, '2'); assert.equal(call[2].snapshotHash, 'snapshot'); assert.ok(call[2].requestId);
    assert.equal(call[2].proposal.overallGrade, '8.25'); assert.equal(call[2].proposal.overallFeedback, 'Editada');
    assert.ok(f.calls.every(x => !x[0].includes('publish-grade')));
  } finally { f.view.close(); }
});

test('descartar requiere acción explícita y nunca publica ni aplica', async () => {
  const f = await fixture(); try {
    await openSuggestion(f.view);
    const discard = button(f.view, /descartar sugerencia/i); assert.ok(discard); discard.props.onClick(); await f.view.flush();
    assert.ok(!f.calls.some(call => /\/discard|\/apply|publish-grade/.test(call[0])));
    const confirmation = button(f.view, /confirmar descarte/i);
    assert.ok(confirmation);
    confirmation.props.onClick();
    await f.view.flush();
    assert.ok(f.calls.some(x => x[0] === `${path}/job/discard` && x[1] === 'POST'));
    assert.ok(!f.calls.some(x => /\/apply|publish-grade/.test(x[0])));
  } finally { f.view.close(); }
});

test('con corrección local modificada no acepta propuesta sin confirmación de reemplazo', async () => {
  const f = await fixture({ dirty: true }); try {
    await openSuggestion(f.view);
    const accept = button(f.view, /usar sugerencia|aceptar sugerencia/i); assert.ok(accept); accept.props.onClick(); await f.view.flush();
    assert.ok(!f.calls.some(x => /\/apply|publish-grade/.test(x[0])));
    assert.match(text(f.view.tree), /(?:cambios|edici[oó]n).*(?:reemplaz|perder|sobrescrib)/i);
  } finally { f.view.close(); }
});

test('pendiente, error y obsoleto no permiten aplicar propuesta', async () => {
  for (const options of [{ state: 'QUEUED' }, { state: 'RUNNING' }, { state: 'FAILED' }, { state: 'STALE' }, { failure: true }]) {
    const f = await fixture(options); try {
      assert.equal(button(f.view, /^Revisar sugerencia$/), undefined);
      assert.equal(button(f.view, /usar sugerencia|aceptar sugerencia/i), undefined);
      assert.ok(!f.calls.some(x => /\/apply|publish-grade/.test(x[0])));
    } finally { f.view.close(); }
  }
});

test('editor de corrección integra el panel para el intento y informa si hay cambios locales', async () => {
  const { GradingEditor } = loadTsModule('apps/web/src/features/grading/editing/GradingEditor.tsx');
  const data = { revision: '2', canSave: true, archived: false, activity: { title: 'Trabajo', type: 'ASSIGNMENT', questions: [] },
    attempt: { number: 1, firstName: 'Alumno', lastName: 'Sintético', attachments: [] }, grade: { id: null, isPublished: false, pending: true, finalGrade: null, overallFeedback: null } };
  const view = hookView(GradingEditor, gradingFixtureProps('GradingEditor', { api: { call: async () => data, fileUrl: () => '' }, roomId, attemptId, onClose() {}, onChanged: async () => {} }));
  try { await view.flush();
    const panel = descendants(view.tree, n => n.type?.name === 'GradingAiReview')[0]; assert.ok(panel);
    assert.equal(panel.props.attemptId, attemptId); assert.equal(panel.props.roomId, roomId); assert.equal(panel.props.dirty, false);
    const note = descendants(view.tree, n => n.type === 'input' && n.props['aria-label'] === 'Calificación general')[0];
    note.props.onChange({ target: { value: '6' } }); await view.flush();
    assert.equal(descendants(view.tree, n => n.type?.name === 'GradingAiReview')[0].props.dirty, true);
  } finally { view.close(); }
});

test('preguntas invertidas se identifican por referencia y la edición se aplica a la pregunta correcta', async () => {
  const { GradingAiReview } = loadTsModule('apps/web/src/features/grading/ai-review/GradingAiReview.tsx');
  const calls = [], reversed = { schemaVersion: 'grading-proposal-v1', overallGrade: null, overallFeedback: '', warnings: [], questions: [
    { ref: 'Q2', points: '2.00', feedback: 'Devolución segunda' }, { ref: 'Q1', points: '1.00', feedback: 'Devolución primera' } ] };
  const api = { call: async (...args) => { calls.push(args); return args[1] === 'GET'
    ? { id: 'job', state: 'READY', snapshotHash: 'snapshot', proposal: structuredClone(reversed) } : { applied: true }; } };
  const view = hookView(GradingAiReview, gradingFixtureProps('GradingAiReview', { api, roomId, attemptId, revision: '2', dirty: false, onApplied: async () => {} }));
  try {
    await view.flush();
    await openSuggestion(view);
    const groups = descendants(view.tree, n => n.type === 'fieldset');
    const second = groups.find(group => descendants(group, n => n.type === 'legend').some(legend => /Pregunta\s+2\b/.test(text(legend))));
    const first = groups.find(group => descendants(group, n => n.type === 'legend').some(legend => /Pregunta\s+1\b/.test(text(legend))));
    assert.ok(first && second, 'cada sección debe identificar el número real de pregunta');
    const feedback = group => descendants(group, n => n.type === 'textarea')[0];
    assert.equal(feedback(first).props.value, 'Devolución primera');
    assert.equal(feedback(second).props.value, 'Devolución segunda');
    feedback(second).props.onChange({ target: { value: 'Segunda revisada' } }); await view.flush();
    button(view, /usar sugerencia/i).props.onClick(); await view.flush();
    button(view, /confirmar aplicaci[oó]n/i).props.onClick(); await view.flush();
    const write = calls.find(c => c[0] === `${path}/job/apply` && c[1] === 'POST'); assert.ok(write);
    const q1 = write[2].proposal.questions.find(q => q.ref === 'Q1'), q2 = write[2].proposal.questions.find(q => q.ref === 'Q2');
    assert.equal(q1.feedback, 'Devolución primera'); assert.equal(q2.feedback, 'Segunda revisada');
    assert.ok(!calls.some(c => c[0].includes('publish-grade')));
  } finally { view.close(); }
});
