import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { authoringFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { authoringQuestion } from '../apps/api/src/modules/activities/domain/activity-policy.ts';

const { activityReviewProblem } = loadTsModule('apps/web/src/features/activity-authoring/drafting/draft-rules.ts');
const valid = { type: 'DEVELOPMENT', prompt: 'Explicá con un ejemplo.', points: '1.25', scoringRule: null, options: [] };
const choice = { ...valid, type: 'SINGLE_CHOICE', scoringRule: 'EXACT', options: [{ text: 'Una', correct: true }, { text: 'Otra', correct: false }] };
const draft = { title: 'Actividad', objective: 'Explicar', instructions: 'Respondé.', type: 'QUESTIONNAIRE', evaluationRubric: [{ name: 'Evidencia', description: 'Usa ejemplos', weight: 100 }] };
const invalidCases = [
  ['consigna', { ...valid, prompt: ' ' }],
  ['consigna', { ...valid, prompt: 'x'.repeat(20001) }],
  ['consigna', { ...valid, prompt: 'Texto\u0000' }],
  ['puntos', { ...valid, points: '0' }],
  ['puntos', { ...valid, points: '1e2' }],
  ['puntos', { ...valid, points: '1.001' }],
  ['desarrollo', { ...valid, options: choice.options }],
  ['desarrollo', { ...valid, scoringRule: 'EXACT' }],
  ['dos opciones', { ...choice, options: choice.options.slice(0, 1) }],
  ['opción 2', { ...choice, options: [choice.options[0], { text: '', correct: false }] }],
  ['opción 2', { ...choice, options: [choice.options[0], { text: 'Texto\u0000', correct: false }] }],
  ['una sola', { ...choice, options: choice.options.map(option => ({ ...option, correct: true })) }],
  ['puntuación', { ...choice, scoringRule: 'PARTIAL' }],
  ['dos respuestas', { ...choice, type: 'MULTIPLE_CHOICE' }],
  ['puntuación', { ...choice, type: 'MULTIPLE_CHOICE', scoringRule: null, options: choice.options.map(option => ({ ...option, correct: true })) }],
];

test('review rejects the same malformed question shapes as authoring with an actionable question number', () => {
  for (const [message, question] of invalidCases) {
    assert.throws(() => authoringQuestion(question));
    const problem = activityReviewProblem({ ...draft, questions: [valid, question] });
    assert.ok(problem, `Expected validation for ${message}`);
    assert.equal(problem.tab, 'questions');
    assert.equal(problem.questionIndex, 1);
    assert.match(problem.message, /Pregunta 2/);
    assert.ok(problem.message.toLowerCase().includes(message), problem.message);
  }
  for (const question of [valid, choice, { ...choice, type: 'MULTIPLE_CHOICE', scoringRule: 'PARTIAL', options: choice.options.map(option => ({ ...option, correct: true })) }]) {
    assert.doesNotThrow(() => authoringQuestion(question));
    assert.equal(activityReviewProblem({ ...draft, questions: [question] }), null);
  }
});

const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
test('review opens the first invalid question without saving or publishing', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
  const writes = [];
  const view = hookView(ActivityAuthoring, authoringFixtureProps('ActivityAuthoring', {
    room: { id: 'room', name: 'Aula', role: 'teacher', timezone: 'UTC', units: [{ id: 'unit', name: 'Unidad', topics: [{ id: 'topic', name: 'Tema' }] }] },
    materials: [], initialContent: true, onSaved: async () => {}, onClose() {},
    api: { call: async (...args) => writes.push(args) },
    data: { revision: '1', activity: { ...draft, id: 'draft', topicIds: ['topic'], status: 'DRAFT', questions: [valid, { ...valid, prompt: '' }], instructionFiles: [], materials: [], attachmentRequired: false, allowLate: false } },
  }));
  try {
    await view.flush();
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Continuar a revisión')[0].props.onClick();
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type === 'form')[0].props['data-authoring-step'], 1);
    const editor = descendants(view.tree, node => node.type?.name === 'QuestionEditor')[0];
    assert.equal(editor.props.index, 1);
    assert.equal(descendants(view.tree, node => node.type === 'fieldset' && node.props['aria-label'] === 'Preguntas')[0].props.hidden, false);
    assert.match(text(view.tree), /Pregunta 2/);
    assert.deepEqual(writes, []);
    editor.props.update(valid);
    await view.flush();
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Continuar a revisión')[0].props.onClick();
    await view.flush();
    assert.equal(descendants(view.tree, node => node.type === 'form')[0].props['data-authoring-step'], 2);
    assert.deepEqual(writes, []);
  } finally { view.close(); }
});
