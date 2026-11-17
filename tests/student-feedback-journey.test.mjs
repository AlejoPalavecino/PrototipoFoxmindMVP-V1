import { participationFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import { gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : node ?? '';
const button = (view, name) => descendants(view.tree, n => n.type === 'button' && text(n) === name)[0];
const question = { id: 'question', type: 'DEVELOPMENT', prompt: 'Pregunta de prueba', points: '10', options: [] };
const activity = { id: 'activity', title: 'Actividad', type: 'EVALUATION', zone: 'UTC', questions: [question], instructionFiles: [], materials: [] };
const attempt = { id: 'attempt', number: 1, epoch: '1', revision: '1', status: 'SUBMITTED', answers: [{ questionId: 'question', text: 'Respuesta guardada', optionIds: [] }], attachments: [], submittedAt: '2026-10-28T12:00:00Z', submittedLate: false, appliedDeadlineAt: null };
const session = { activity, attempt, reception: { open: true, deadlineAt: null }, expected: true, archived: false, canTransfer: false };

test('opening an exact submitted attempt prioritizes feedback and avoids duplicated answers', async () => {
  const { AttemptHistory } = loadTsModule("apps/web/src/application/workflows/activity-session/AttemptHistory.tsx");
  const view = hookView(AttemptHistory, { room: { id: 'room', role: 'student', timezone: 'UTC' }, activityId: 'activity', attemptId: 'attempt',
    api: { call: async path => path.endsWith('/attempts/attempt/history') ? session : { activity, attempts: [attempt], delivered: true } }, onClose() {}, onChanged: async () => {} });
  try {
    await view.flush();
    const list = descendants(view.tree, n => n.props.className === 'education-attempt-history')[0];
    assert.equal(list.props.hidden, true, 'history must not push the requested feedback below the viewport');
    const detail = descendants(view.tree, n => n.props.className === 'p7-history-detail')[0];
    assert.equal(text(detail).includes('Respuesta guardada'), false, 'answers belong to the safe result or pending fallback, not both');
    assert.ok(button(view, 'Volver a mis intentos'));
    button(view, 'Volver a mis intentos').props.onClick(); await view.flush();
    assert.equal(descendants(view.tree, n => n.props.className === 'education-attempt-history')[0].props.hidden, false);
  } finally { view.close(); }
});

test('pending results retain submitted answers; published results replace fallback with grade and feedback', async () => {
  const { PublishedResult } = loadTsModule("apps/web/src/features/grading/results/PublishedResult.tsx");
  const published = { status: 'published', grade: { finalGrade: '9.00', isEffective: true, publishedAt: '2026-10-28T12:00:00Z', overallFeedback: 'Devolución docente' }, questions: [], attachments: [] };
  for (const data of [{ status: 'pending' }, published]) {
    const view = hookView(PublishedResult, gradingFixtureProps('PublishedResult', { api: { call: async () => data }, roomId: 'room', attemptId: 'attempt', pendingContent: 'Respuestas del envío' }));
    try {
      await view.flush();
      assert.equal(renderToStaticMarkup(view.tree).includes('Respuestas del envío'), data.status === 'pending');
      assert.equal(renderToStaticMarkup(view.tree).includes('Devolución docente'), data.status === 'published');
    } finally { view.close(); }
  }
});

for (const [file, component] of [['QuestionnaireAttempt', 'QuestionnaireAttempt'], ['PracticalAttempt', 'PracticalAttempt']]) {
  test(`${component}: a receipt must not invent the grading status`, async () => {
    const Component = loadTsModule('apps/web/src/features/participation/index.ts')[file];
    const view = hookView(Component, participationFixtureProps(component, { api: {}, classroomId: 'room', data: session, editor: null, refresh: async () => {} }));
    try {
      await view.flush();
      const html = renderToStaticMarkup(view.tree);
      assert.doesNotMatch(html, /pendiente de corrección|No hay una calificación publicada/);
      assert.match(html, /aria-label="Comprobante de entrega"/);
      assert.match(html, /A tiempo · Solo consulta/);
      assert.equal(button(view, 'Revisar entrega'), undefined);
    }
    finally { view.close(); }
  });
}

for (const [component, endpoint, type] of [
  ['QuestionnaireAttempt', 'submit-answers', 'EVALUATION'],
  ['PracticalAttempt', 'submit-practical', 'ASSIGNMENT'],
]) {
  test(`${component}: a confirmed submission keeps its receipt and cannot be sent twice after refresh failure`, async () => {
    const Component = loadTsModule('apps/web/src/features/participation/index.ts')[component];
    const receipt = { submittedAt: '2026-10-28T12:05:00Z', submittedLate: true, appliedDeadlineAt: '2026-10-28T12:00:00Z' };
    const draft = { ...attempt, status: 'DRAFT', submittedAt: null, submittedLate: null,
      ...(type === 'ASSIGNMENT' ? { answers: [], practicalResponse: 'Respuesta guardada' } : {}) };
    const calls = [];
    let failedRefresh = 0, exits = 0;
    const view = hookView(Component, participationFixtureProps(component, { classroomId: 'room', data: { ...session,
      activity: { ...activity, type, ...(type === 'ASSIGNMENT' ? { questions: [] } : {}) }, canTransfer: true, attempt: draft },
      editor: { epoch: '1', token: 'memory-only' }, api: { attempt: async (path, payload) => { calls.push({ path, payload }); return receipt; } },
      refresh: async () => { if (calls.length) { failedRefresh++; throw Error('Sin conexión'); } },
      onClose: () => { exits++; } }));
    try {
      await view.flush(); button(view, 'Revisar entrega').props.onClick(); await view.flush();
      assert.equal(calls.length, 0);
      const confirm = button(view, 'Confirmar entrega').props.onClick;
      confirm(); confirm(); await view.flush();
      assert.equal(failedRefresh, 1, 'The auxiliary refresh failed after the server confirmed delivery');
      assert.deepEqual(calls, [{ path: `/room/attempts/attempt/${endpoint}`,
        payload: { revision: draft.revision, confirm: true, ...(type === 'EVALUATION' ? { confirmIncomplete: false } : {}) } }]);

      const html = renderToStaticMarkup(view.tree);
      assert.match(html, /aria-label="Comprobante de entrega"/);
      assert.match(html, /Entrega confirmada/);
      assert.match(html, /Podés cerrar esta pantalla\. Tu entrega quedó confirmada\./);
      assert.match(html, /<time dateTime="2026-10-28T12:05:00Z"/);
      assert.match(html, /Fuera de plazo · Solo consulta/);
      assert.match(html, /Plazo aplicado/);
      assert.doesNotMatch(html, /no se confirmó|Sin conexión|memory-only|<textarea|Respuesta guardada/i);
      for (const hidden of ['Revisar entrega', 'Confirmar entrega']) assert.equal(button(view, hidden), undefined);
      const answers = descendants(view.tree, n => n.type?.name === 'AttemptAnswers')[0];
      assert.ok(answers);
      const delivered = hookView(answers.type, answers.props);
      try {
        await delivered.flush(); button(delivered, 'Ver lo que entregué').props.onClick(); await delivered.flush();
        const dialog = descendants(delivered.tree, n => n.type?.name === 'Dialog')[0];
        assert.equal(dialog?.props.title, 'Tu entrega');
        assert.match(text(dialog), /Respuesta guardada/);
      } finally { delivered.close(); }
      button(view, 'Volver a actividades').props.onClick(); await view.flush();
      assert.equal(exits, 1);
      assert.equal(calls.length, 1);
    } finally { view.close(); }
  });
}
