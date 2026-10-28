import test from 'node:test';
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
  const { AttemptHistory } = loadTsModule('apps/classrooms-ui/AttemptHistory.tsx');
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
  const { PublishedResult } = loadTsModule('apps/classrooms-ui/PublishedResult.tsx');
  const published = { status: 'published', grade: { finalGrade: '9.00', isEffective: true, publishedAt: '2026-10-28T12:00:00Z', overallFeedback: 'Devolución docente' }, questions: [], attachments: [] };
  for (const data of [{ status: 'pending' }, published]) {
    const view = hookView(PublishedResult, { api: { call: async () => data }, roomId: 'room', attemptId: 'attempt', pendingContent: 'Respuestas del envío' });
    try {
      await view.flush();
      assert.equal(text(view.tree).includes('Respuestas del envío'), data.status === 'pending');
      assert.equal(text(view.tree).includes('Devolución docente'), data.status === 'published');
    } finally { view.close(); }
  }
});

for (const [file, component] of [['QuestionnaireAttempt', 'QuestionnaireAttempt'], ['PracticalAttempt', 'PracticalAttempt']]) {
  test(`${component}: a receipt must not invent the grading status`, async () => {
    const Component = loadTsModule(`apps/classrooms-ui/${file}.tsx`)[component];
    const view = hookView(Component, { api: {}, classroomId: 'room', data: session, editor: null, refresh: async () => {} });
    try { await view.flush(); assert.doesNotMatch(text(view.tree), /pendiente de corrección|No hay una calificación publicada/); assert.match(text(view.tree), /Entrega a tiempo/); }
    finally { view.close(); }
  });
}

test('a successful questionnaire submit followed by refresh failure retains an unambiguous receipt', async () => {
  const { QuestionnaireAttempt } = loadTsModule('apps/classrooms-ui/QuestionnaireAttempt.tsx');
  let submissions = 0;
  const view = hookView(QuestionnaireAttempt, { classroomId: 'room', data: { ...session, canTransfer: true, attempt: { ...attempt, status: 'DRAFT' } },
    editor: { epoch: '1', token: 'memory-only' }, api: { attempt: async () => { submissions++; return attempt; } }, refresh: async () => { throw Error('Sin conexión'); } });
  try {
    await view.flush(); button(view, 'Enviar respuestas').props.onClick(); await view.flush();
    button(view, 'Confirmar envío de respuestas').props.onClick(); await view.flush();
    assert.equal(submissions, 1);
    assert.match(text(view.tree), /entrega ya está confirmada/i);
    assert.doesNotMatch(text(view.tree), /no se confirmó su guardado/);
    assert.equal(button(view, 'Enviar respuestas'), undefined);
  } finally { view.close(); }
});

test('a successful practical submit followed by refresh failure cannot be submitted twice', async () => {
  const { PracticalAttempt } = loadTsModule('apps/classrooms-ui/PracticalAttempt.tsx');
  let submissions = 0;
  const view = hookView(PracticalAttempt, { classroomId: 'room', data: { ...session, canTransfer: true, attempt: { ...attempt, status: 'DRAFT' } },
    editor: { epoch: '1', token: 'memory-only' }, api: { attempt: async () => { submissions++; return attempt; } }, refresh: async () => { throw Error('Sin conexión'); } });
  try {
    await view.flush(); button(view, 'Enviar trabajo práctico').props.onClick(); await view.flush();
    button(view, 'Confirmar envío del trabajo').props.onClick(); await view.flush();
    assert.equal(submissions, 1);
    assert.match(text(view.tree), /entrega ya está confirmada/i);
    assert.equal(button(view, 'Enviar trabajo práctico'), undefined);
  } finally { view.close(); }
});
