import { participationFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import { authoringFixtureProps, gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { useState } from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { deferred, descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { gradingView } from './helpers/audit-grade-dto.mjs';

const source = 'apps/web/src/features';
const room = {
  id: 'aula', name: 'Ciencias', division: 'A', role: 'teacher', archived: false, timezone: 'UTC', revision: '1',
  units: [
    { id: 'u1', name: 'Unidad uno', topics: [{ id: 't1', name: 'Tema uno' }, { id: 't2', name: 'Tema dos' }] },
    { id: 'u2', name: 'Unidad dos', topics: [{ id: 't3', name: 'Tema tres' }] },
  ],
};
const draft = {
  id: '', title: 'Ambientes', instructions: 'Compará dos ambientes.', type: 'ASSIGNMENT', status: 'DRAFT',
  objective: 'Comparar características.', evaluationRubric: [{ name: 'Evidencia', description: 'Compara con ejemplos.', weight: 100 }],
  attachmentRequired: false, materials: [], instructionFiles: [], deadlineAt: null, allowLate: false, questions: [], zone: 'UTC',
};
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const select = (view, predicate) => descendants(view.tree, predicate)[0];
const component = (view, name) => select(view, node => node.type?.name === name);
const button = (view, name) => select(view, node => node.type === 'button' && text(node).trim() === name);
const click = (view, name) => button(view, name).props.onClick();

test('E03 conserva alcance multitema y exige confirmación separada antes de publicar', async () => {
  const { ActivityAuthoring } = loadTsModule(source + '/activity-authoring/drafting/ActivityAuthoring.tsx');
  const calls = [], published = deferred();
  const view = hookView(ActivityAuthoring, authoringFixtureProps('ActivityAuthoring', {
    room, materials: [], onClose() {}, onSaved: async () => {},
    data: { activity: draft, revision: '1' },
    api: { call: async (_path, _method, request) => {
      calls.push(request);
      if (request.operation.action === 'publish') return published.promise;
      return request.operation.action === 'create' ? { id: 'new', revision: '2' } : { revision: '3' };
    } },
  }));
  try {
    await view.flush();
    component(view, 'ActivityAssignment').props.update({ unitIds: ['u1'], topicIds: ['t3'] });
    await view.flush();
    click(view, 'Continuar');
    await view.flush();
    click(view, 'Continuar a revisión');
    await view.flush();
    assert.match(text(view.tree), /Unidad uno.*Tema uno · Tema dos.*Unidad dos.*Tema tres/);
    click(view, 'Publicar actividad');
    await view.flush();
    assert.deepEqual(calls, []);
    const confirm = button(view, 'Asignar al aula');
    confirm.props.onClick();
    confirm.props.onClick();
    await view.flush();
    assert.deepEqual(calls.map(call => call.operation.action), ['create', 'save', 'publish']);
    assert.deepEqual(calls[1].operation.payload.unitIds, ['u1']);
    assert.deepEqual(calls[1].operation.payload.topicIds, ['t3']);
    assert.equal(calls[2].revision, '3');
    published.resolve({ revision: '4' });
    await view.flush();
    assert.match(text(view.tree), /Actividad asignada/);
  } finally { view.close(); }
});

test('E03 cambiar de TP a cuestionario elimina la exigencia de adjunto del envío', async () => {
  const { ActivityAuthoring } = loadTsModule(source + '/activity-authoring/drafting/ActivityAuthoring.tsx');
  const calls = [];
  const view = hookView(ActivityAuthoring, authoringFixtureProps('ActivityAuthoring', {
    room, materials: [], onClose() {}, onSaved: async () => {},
    data: { activity: { ...draft, attachmentRequired: true }, revision: '1' },
    api: { call: async (_path, _method, request) => {
      calls.push(request.operation);
      return request.operation.action === 'create' ? { id: 'new', revision: '2' } : { revision: '3' };
    } },
  }));
  try {
    await view.flush();
    component(view, 'ActivityTypeChoice').props.update('QUESTIONNAIRE');
    await view.flush();
    select(view, node => node.type === 'form').props.onSubmit({ preventDefault() {} });
    await view.flush();
    assert.equal(calls[0].type, 'QUESTIONNAIRE');
    assert.equal(calls[1].payload.attachmentRequired, false);
  } finally { view.close(); }
});

test('E03 no inicia generación sin idea privada y permite idea sin adjuntos', async () => {
  const { GenerationSetup } = loadTsModule(source + '/activity-authoring/generation/GenerationSetup.tsx');
  const { defaultGenerationForm } = loadTsModule(source + '/activity-authoring/generation/ActivityGenerationForm.tsx');
  const requests = [];
  let setValue;
  const view = hookView(() => {
    const [value, update] = useState(() => ({ ...defaultGenerationForm(), unitIds: ['u1'] }));
    setValue = update;
    return GenerationSetup({ room, disabled: false, sources: [], value, update, generate: input => requests.push(input) });
  }, {});
  const submit = () => select(view, node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  try {
    await view.flush();
    submit();
    await view.flush();
    assert.match(text(view.tree), /Escribí una idea/);
    assert.deepEqual(requests, []);
    const teacherBrief = 'Quiero que comparen dos ambientes.';
    setValue(previous => ({ ...previous, teacherBrief }));
    await view.flush();
    submit(); await view.flush();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].teacherBrief, teacherBrief);
    assert.deepEqual(requests[0].unitIds, ['u1']);
    assert.deepEqual(requests[0].sourceIds, []);
  } finally { view.close(); }
});

test('E04 mantiene la respuesta recuperada al navegar y confirma un solo envío con la revisión guardada', async () => {
  const { QuestionnaireAttempt } = loadTsModule(source + '/participation/questionnaire/QuestionnaireAttempt.tsx');
  const editor = { epoch: '1', token: 'editor-sintético' };
  const questions = [
    { id: 'q1', type: 'DEVELOPMENT', prompt: 'Describe el primero.', options: [] },
    { id: 'q2', type: 'SINGLE_CHOICE', prompt: 'Elegí un ejemplo.', options: [{ id: 'o1', text: 'Ejemplo A' }] },
  ];
  const calls = [], sent = deferred();
  const view = hookView(QuestionnaireAttempt, participationFixtureProps('QuestionnaireAttempt', {
    classroomId: room.id, editor, refresh: async () => {},
    data: { activity: { ...draft, questions }, canTransfer: true,
      attempt: { id: 'attempt', number: 1, status: 'DRAFT', revision: '1', epoch: '1',
        answers: [{ questionId: 'q1', text: 'Respuesta recuperada', optionIds: [] }] },
    },
    api: { attempt: async (path, input, capability) => {
      calls.push({ path, input, capability });
      return path.endsWith('/answer') ? { revision: '2', answer: { ...input, savedAt: '2026-11-15' } } : sent.promise;
    } },
  }));
  try {
    await view.flush();
    assert.equal(select(view, node => node.type === 'textarea').props.value, 'Respuesta recuperada');
    assert.doesNotMatch(text(view.tree), /Elegí un ejemplo/);
    click(view, 'Siguiente'); await view.flush();
    select(view, node => node.type === 'input' && node.props.type === 'radio').props.onChange({ target: { checked: true } });
    click(view, 'Anterior'); await view.flush();
    assert.equal(select(view, node => node.type === 'textarea').props.value, 'Respuesta recuperada');
    click(view, 'Revisar entrega'); await view.flush();
    assert.match(text(view.tree), /2 de 2 preguntas respondidas/);
    assert.equal(calls.length, 1);
    const confirm = button(view, 'Confirmar entrega');
    confirm.props.onClick();
    confirm.props.onClick();
    await view.flush();
    assert.equal(calls.length, 2);
    assert.match(calls[1].path, /submit-answers$/);
    assert.deepEqual(calls[1].input, { revision: '2', confirm: true, confirmIncomplete: false });
    assert.equal(calls[1].capability, editor);
    sent.resolve({ submittedAt: '2026-11-15T10:00:00Z', submittedLate: false, appliedDeadlineAt: null });
    await view.flush();
    assert.equal(component(view, 'AttemptReceipt').props.number, 1);
  } finally { view.close(); }
});

test('E05 un fallo al publicar conserva disponible la corrección privada con nota cero', async () => {
  const { GradingEditor } = loadTsModule(source + '/grading/editing/GradingEditor.tsx');
  const data = structuredClone(gradingView);
  Object.assign(data.grade, { id: 'saved', finalGrade: '0.00', pending: false });
  let publications = 0;
  const view = hookView(GradingEditor, gradingFixtureProps('GradingEditor', {
    roomId: room.id, attemptId: data.attempt.id, onClose() {}, onChanged: async () => {},
    api: { call: async (path, method, payload) => {
      if (method === 'GET') return data;
      assert.match(path, /publish-grade$/);
      assert.deepEqual(payload, { revision: data.revision, confirm: true });
      if (++publications === 1) throw new Error('No pudimos publicar.');
      return { ...data, canSave: false, grade: { ...data.grade, isPublished: true } };
    } },
  }));
  try {
    await view.flush();
    click(view, 'Publicar calificación'); await view.flush();
    assert.equal(publications, 0);
    assert.equal(component(view, 'FeedbackGrade').props.grade, '0.00');
    click(view, 'Confirmar publicación'); await view.flush();
    assert.match(text(view.tree), /No pudimos publicar/);
    assert.equal(button(view, 'Confirmar publicación').props.disabled, false);
    click(view, 'Confirmar publicación'); await view.flush();
    assert.equal(publications, 2);
    assert.match(text(view.tree), /Calificación publicada/);
    assert.equal(button(view, 'Confirmar publicación'), undefined);
  } finally { view.close(); }
});

test('E03 cambiar la idea de una propuesta recuperada impide aplicar una versión obsoleta', async () => {
  const { ActivityGeneration } = loadTsModule(source + '/activity-authoring/generation/ActivityGeneration.tsx');
  const job = {
    id: 'job', type: 'ASSIGNMENT', state: 'READY', topicIds: ['t1'], teacherBrief: 'Idea original.',
    proposal: { title: 'Primer borrador', questions: [], assignmentPrompts: [], warnings: [] },
  };
  let writes = 0;
  const view = hookView(ActivityGeneration, authoringFixtureProps('ActivityGeneration', {
    room, onClose() {}, onApplied: async () => {},
    api: { call: async (path, method) => {
      if (method === 'POST') { writes++; return {}; }
      if (path.endsWith('/sources')) return { sources: [] };
      return path.endsWith('/job') ? job : { jobs: [job] };
    } },
  }));
  try {
    await view.flush();
    click(view, 'Generaciones recientes');
    await view.flush();
    click(view, 'Recuperar generación');
    await view.flush();
    assert.equal(button(view, 'Usar propuesta revisada como borrador').props.disabled, false);
    const setup = component(view, 'GenerationSetup');
    setup.props.update({ ...setup.props.value, teacherBrief: 'Otra idea.' });
    await view.flush();
    assert.equal(button(view, 'Usar propuesta revisada como borrador').props.disabled, true);
    assert.match(text(view.tree), /Generá otra propuesta/);
    assert.equal(writes, 0);
  } finally { view.close(); }
});

test('E04 conservar el archivo rechazado deja volver a la edición antes de entregar', async () => {
  const { PracticalAttempt } = loadTsModule(source + '/participation/practical/PracticalAttempt.tsx');
  const editor = { epoch: '1', token: 'editor-sintético' };
  let uploads = 0, submissions = 0;
  const view = hookView(PracticalAttempt, participationFixtureProps('PracticalAttempt', {
    classroomId: room.id, editor, refresh: async () => {},
    data: { activity: draft, canTransfer: true, attempt: { id: 'attempt', number: 1, status: 'DRAFT', revision: '1', epoch: '1',
      attachments: [], practicalResponse: 'Texto confirmado' } },
    api: {
      attempt: async () => { submissions++; },
      uploadAttachment: async () => { uploads++; throw new Error('El archivo fue rechazado.'); },
    },
  }));
  try {
    await view.flush();
    select(view, node => node.type === 'input' && node.props.type === 'file').props.onChange({
      target: { files: [new File(['contenido sintético'], 'práctico.pdf')], value: 'práctico.pdf' },
    });
    await view.flush();
    click(view, 'Subir archivo privado'); await view.flush();
    assert.equal(uploads, 1);
    assert.equal(button(view, 'Revisar entrega').props.disabled, true);
    assert.match(text(view.tree), /práctico.pdf.*carga no confirmada/);
    click(view, 'Descartar selección local'); await view.flush();
    assert.equal(select(view, node => node.type === 'textarea').props.value, 'Texto confirmado');
    assert.equal(button(view, 'Revisar entrega').props.disabled, false);
    assert.equal(submissions, 0);
  } finally { view.close(); }
});

test('la rúbrica muestra criterios de forma directa, sin desplegable nativo', () => {
  const { EvaluationRubric } = loadTsModule(source + '/activity-authoring/drafting/EvaluationRubric.tsx');
  const tree = EvaluationRubric({ criteria: draft.evaluationRubric });
  assert.equal(descendants(tree, node => node.type === 'details' || node.type === 'summary').length, 0);
  assert.match(text(tree), /Evidencia.*Compara con ejemplos/);
});

test('consultar las fuentes de una propuesta conserva lo editado y vuelve a la misma sección', async () => {
  const { ActivityGenerationProposal } = loadTsModule(source + '/activity-authoring/generation/ActivityGenerationProposal.tsx');
  const original = {
    title: 'Propuesta inicial', objective: 'Analizar.', instructions: 'Comparar.', assignmentPrompts: [], questions: [],
    warnings: [], evidence: [{ item: 'assignment', index: 0, references: [{ sourceId: 'teacher-context', page: null }] }],
  };
  const view = hookView(() => {
    const [proposal, update] = useState(original);
    return ActivityGenerationProposal({ proposal, update, disabled: false });
  }, {});
  try {
    await view.flush();
    select(view, node => node.type === 'input').props.onChange({ target: { value: 'Propuesta editada' } });
    await view.flush();
    click(view, 'Fuentes de cada consigna o pregunta'); await view.flush();
    const modal = component(view, 'Dialog');
    assert.equal(modal.props.title, 'Fuentes de cada consigna o pregunta');
    assert.match(text(modal), /Contexto docente/);
    modal.props.onClose(); await view.flush();
    assert.equal(component(view, 'Dialog'), undefined);
    assert.equal(select(view, node => node.type === 'input').props.value, 'Propuesta editada');
  } finally { view.close(); }
});

test('cerrar la sugerencia de calificación conserva la edición privada junto con su confirmación', async () => {
  const { GradingAiReview } = loadTsModule(source + '/grading/ai-review/GradingAiReview.tsx');
  const writes = [];
  const view = hookView(GradingAiReview, gradingFixtureProps('GradingAiReview', {
    roomId: room.id, attemptId: 'attempt', revision: '1', dirty: true, onApplied: async () => {},
    api: { call: async (path, method, payload) => {
      if (method === 'POST') { writes.push({ path, payload }); return {}; }
      return { id: 'job', state: 'READY', snapshotHash: 'hash', proposal: { overallGrade: '8', overallFeedback: 'Sugerencia', questions: [], warnings: [] } };
    } },
  }));
  try {
    await view.flush();
    click(view, 'Revisar sugerencia'); await view.flush();
    select(view, node => node.type === 'textarea').props.onChange({ target: { value: 'Texto editado' } });
    await view.flush();
    component(view, 'Dialog').props.onClose(); await view.flush();
    assert.equal(component(view, 'Dialog'), undefined);
    click(view, 'Revisar sugerencia'); await view.flush();
    assert.equal(select(view, node => node.type === 'textarea').props.value, 'Texto editado');
    click(view, 'Usar sugerencia'); await view.flush();
    assert.deepEqual(writes, []);
    click(view, 'Confirmar aplicación'); await view.flush();
    assert.equal(writes[0].payload.proposal.overallFeedback, 'Texto editado');
  } finally { view.close(); }
});
