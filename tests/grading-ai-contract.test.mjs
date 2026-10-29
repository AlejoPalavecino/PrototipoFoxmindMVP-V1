import test from 'node:test';
import assert from 'node:assert/strict';

const domain = () => import('../src/core/domain/grading-ai.ts');
const assignment = { type: 'ASSIGNMENT', questions: [] };
const mixed = { type: 'QUESTIONNAIRE', questions: [
  { ref: 'Q1', maxPoints: '2.50', manual: true },
  { ref: 'Q2', maxPoints: '1.00', manual: false },
] };
const proposal = () => ({ schemaVersion: 'grading-proposal-v1', overallGrade: null, overallFeedback: 'Revisá la explicación.',
  questions: [{ ref: 'Q1', points: '0.00', feedback: 'Falta justificar.' }, { ref: 'Q2', points: null, feedback: 'Revisá la opción.' }], warnings: [] });
const practical = () => ({ schemaVersion: 'grading-proposal-v1', overallGrade: '10.00', overallFeedback: 'Buen trabajo.', questions: [], warnings: [] });

test('acepta TP con cero o diez y una propuesta mixta con cero manual para cuestionario y evaluación', async () => {
  const { validateGradingAiProposal: validate } = await domain();
  assert.deepEqual(validate(practical(), assignment), practical());
  const zero = practical(); zero.overallGrade = '0'; assert.doesNotThrow(() => validate(zero, assignment));
  for (const type of ['QUESTIONNAIRE', 'EVALUATION']) assert.deepEqual(validate(proposal(), { ...mixed, type }), proposal());
});

test('rechaza nota general inválida, nula o con precisión excesiva para TP', async () => {
  const { validateGradingAiProposal: validate } = await domain();
  for (const value of [null, '-0.01', '10.01', '1.001', 'NaN', 'Infinity', 1, '', '1e0']) {
    const bad = practical(); bad.overallGrade = value;
    assert.throws(() => validate(bad, assignment), `nota ${String(value)}`);
  }
});

test('valida puntaje manual contra máximo y preserva el scoring objetivo', async () => {
  const { validateGradingAiProposal: validate } = await domain();
  for (const value of [null, '-1', '2.51', '1.001', 'NaN', 0]) {
    const bad = proposal(); bad.questions[0].points = value;
    assert.throws(() => validate(bad, mixed), `puntaje ${String(value)}`);
  }
  const objective = proposal(); objective.questions[1].points = '1.00';
  assert.throws(() => validate(objective, mixed));
  const max = proposal(); max.questions[0].points = '2.50';
  assert.doesNotThrow(() => validate(max, mixed));
});

test('rechaza referencias desconocidas, faltantes y duplicadas', async () => {
  const { validateGradingAiProposal: validate } = await domain();
  const missing = proposal(); missing.questions.pop();
  const duplicate = proposal(); duplicate.questions[1].ref = 'Q1';
  const unknown = proposal(); unknown.questions[1].ref = 'Q3';
  const extra = proposal(); extra.questions.push({ ref: 'Q3', points: null, feedback: '' });
  for (const value of [missing, duplicate, unknown, extra]) assert.throws(() => validate(value, mixed));
});

test('rechaza estructuras abiertas, campos incompletos y resultados de tipo incorrecto', async () => {
  const { validateGradingAiProposal: validate } = await domain();
  const extraTop = proposal(); extraTop.extra = 'unexpected';
  const extraQuestion = proposal(); extraQuestion.questions[0].extra = true;
  const missingFeedback = proposal(); delete missingFeedback.questions[0].feedback;
  const gradeOnQuestionnaire = proposal(); gradeOnQuestionnaire.overallGrade = '5';
  const questionOnAssignment = practical(); questionOnAssignment.questions = proposal().questions;
  const wrongVersion = proposal(); wrongVersion.schemaVersion = 'v2';
  for (const [value, spec] of [[null, mixed], [[], mixed], [extraTop, mixed], [extraQuestion, mixed],
    [missingFeedback, mixed], [gradeOnQuestionnaire, mixed], [questionOnAssignment, assignment], [wrongVersion, mixed]]) {
    assert.throws(() => validate(value, spec));
  }
});
