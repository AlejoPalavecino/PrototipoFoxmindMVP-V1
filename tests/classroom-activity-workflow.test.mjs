import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const button = (view, label) => descendants(view.tree, n => n.type === 'button' && text(n).trim() === label)[0];
const room = { id: 'room', name: 'Biología', revision: '1', role: 'teacher', timezone: 'UTC', units: [] };
const activity = { id: 'draft', type: 'ASSIGNMENT', status: 'DRAFT', title: 'Ecosistemas',
  instructions: 'Compará dos ambientes.', questions: [], instructionFiles: [], materials: [], deadlineAt: null };

test('leaving a changed activity allows returning to the same local draft without writing', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/ui/ActivityAuthoring.tsx');
  let closed = 0, writes = 0;
  const view = hookView(ActivityAuthoring, { api: { call: async () => { writes++; } }, room,
    data: { activity, revision: '1' }, materials: [], onSaved: async () => {}, onClose: () => { closed++; } });
  try {
    await view.flush();
    const title = () => descendants(view.tree, n => n.props['aria-label'] === 'Título de la actividad')[0];
    title().props.onChange({ target: { value: 'Ecosistemas urbanos' } });
    descendants(view.tree, n => n.type === 'form')[0].props.onChange();
    await view.flush();
    descendants(view.tree, n => n.props['aria-label'] === 'Cerrar editor')[0].props.onClick();
    await view.flush();
    assert.equal(closed, 0);
    button(view, 'Seguir editando').props.onClick();
    await view.flush();
    assert.equal(title().props.value, 'Ecosistemas urbanos');
    assert.equal(writes, 0);
  } finally { view.close(); }
});

test('redistributing three rubric weights assigns the remainder to the first criterion', () => {
  const { EvaluationRubricEditor } = loadTsModule('apps/web/src/features/activity-authoring/ui/EvaluationRubric.tsx');
  const criteria = [{ name: 'Evidencia', description: 'Describe', weight: 20 },
    { name: 'Claridad', description: 'Explica', weight: 20 }, { name: 'Relaciones', description: 'Compara', weight: 60 }];
  let changed;
  const tree = EvaluationRubricEditor({ criteria, onChange: value => { changed = value; } });
  assert.ok(button({ tree }, 'Repartir pesos'));
  button({ tree }, 'Repartir pesos').props.onClick();
  assert.deepEqual(changed, criteria.map((criterion, i) => ({ ...criterion, weight: i === 0 ? 34 : 33 })));
});

test('a selected file stays local and a practical response uses the acknowledged revision only on final confirmation', async () => {
  const { PracticalAttempt } = loadTsModule('apps/web/src/features/participation/ui/PracticalAttempt.tsx');
  const editor = { epoch: '1', token: 'editor-in-memory' };
  const receipt = { submittedAt: '2026-11-11T17:00:00Z', appliedDeadlineAt: '2026-11-11T16:30:00Z', submittedLate: true };
  const calls = [];
  const view = hookView(PracticalAttempt, { classroomId: room.id, editor,
    data: { activity: { ...activity, zone: 'UTC' }, canTransfer: true, attempt: {
      id: 'attempt', number: 1, status: 'DRAFT', revision: '1', epoch: '1', attachments: [],
    } }, refresh: async () => {}, api: { attempt: async (...args) => {
      calls.push(args);
      return args[0].endsWith('/practical-response') ? { revision: '2', text: args[1].text } : receipt;
    } },
  });
  try {
    await view.flush();
    const file = descendants(view.tree, n => n.type === 'input' && n.props.type === 'file')[0];
    file.props.onChange({ target: { files: [new File(['borrador'], 'borrador.pdf')], value: 'borrador.pdf' } });
    await view.flush();
    assert.ok(button(view, 'Revisar entrega').props.disabled);
    assert.equal(calls.length, 0);
    button(view, 'Descartar selección local').props.onClick();
    const answer = descendants(view.tree, n => n.type === 'textarea')[0];
    answer.props.onChange({ target: { value: 'Respuesta para revisar' } });
    await view.flush();
    button(view, 'Revisar entrega').props.onClick();
    await view.flush();
    assert.equal(calls.length, 1);
    assert.match(calls[0][0], /practical-response$/);
    assert.match(text(view.tree), /Respuesta para revisar/);
    button(view, 'Confirmar entrega').props.onClick();
    await view.flush();
    assert.match(calls[1][0], /submit-practical$/);
    assert.deepEqual(calls[1][1], { revision: '2', confirm: true });
    assert.equal(calls[1][2], editor);
    assert.match(text(view.tree), /Entrega confirmada/);
    assert.match(text(view.tree), /Entrega fuera de plazo/);
  } finally { view.close(); }
});

test('student consultation does not render answer keys even if the input includes private fields', () => {
  const { ActivityPreview } = loadTsModule('apps/web/src/application/academic-activity-preview.tsx');
  const questionnaire = { ...activity, type: 'QUESTIONNAIRE', objective: 'Comparar dos ambientes.',
    questions: [{ id: 'q1', prompt: 'Pregunta privada', points: '9.00', scoringRule: 'PARTIAL',
      options: [{ id: 'o1', text: 'Clave privada', correct: true }] }],
  };
  const student = ActivityPreview({ api: {}, activity: questionnaire, teacher: false });
  const teacher = ActivityPreview({ api: {}, activity: questionnaire, teacher: true });
  assert.match(text(student), /Objetivo de aprendizaje/);
  assert.doesNotMatch(text(student), /Clave privada|9.00|Correcta|Puntaje parcial/);
  assert.match(text(teacher), /Clave privada/);
});

test('switching classroom tabs keeps an open student draft mounted without starting again', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/academic-Activities.tsx');
  const { useState } = await import('react');
  const draft = { ...activity, status: 'PUBLISHED', zone: 'UTC' };
  const session = { activity: draft, canStart: true, attempt: null };
  const started = { ...session, canStart: false, canTransfer: true,
    attempt: { id: 'attempt', status: 'DRAFT' }, editor: { epoch: '1', token: 'editor-in-memory' } };
  let setActive, starts = 0;
  const props = { room: { ...room, role: 'student' }, reload: async () => {}, api: {
    call: async path => path.endsWith('/session') ? session : { activities: [draft] },
    attempt: async () => { starts++; return started; },
  } };
  const view = hookView(() => {
    const [active, change] = useState(true);
    setActive = change;
    return Activities({ ...props, active });
  }, {});
  try {
    await view.flush();
    descendants(view.tree, n => n.props['aria-label'] === 'Abrir Ecosistemas')[0].props.onClick();
    await view.flush();
    const history = descendants(view.tree, n => n.type?.name === 'AttemptHistory')[0];
    descendants(history.props.actions, n => n.type === 'button' && text(n) === 'Preparar entrega')[0].props.onClick();
    await view.flush();
    const editor = () => descendants(view.tree, n => n.type?.name === 'AttemptSession')[0];
    assert.strictEqual(editor().props.initial, started);
    setActive(false);
    await view.flush();
    assert.strictEqual(editor().props.initial, started);
    assert.equal(editor().props.active, false);
    setActive(true);
    await view.flush();
    assert.strictEqual(editor().props.initial, started);
    assert.equal(editor().props.active, true);
    assert.equal(starts, 1);
  } finally { view.close(); }
});

test('the activity brief is still readable when the attempt history request fails', async () => {
  const { AttemptHistory } = loadTsModule('apps/web/src/application/academic-AttemptHistory.tsx');
  const view = hookView(AttemptHistory, { room, api: { call: async () => { throw new Error('Historial temporalmente no disponible'); } },
    activityId: activity.id, activityPreview: { ...activity, status: 'PUBLISHED' }, onClose() {}, onChanged() {}, onResume() {} });
  try {
    await view.flush();
    assert.ok(descendants(view.tree, n => n.type?.name === 'ActivityPreview')[0]);
    assert.match(text(view.tree), /Historial temporalmente no disponible/);
    assert.doesNotMatch(text(view.tree), /Cargando historial/);
  } finally { view.close(); }
});
