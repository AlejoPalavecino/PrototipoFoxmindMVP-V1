import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { studySchemaFor } from './study-response-schema.ts';
import { createGeminiStudyProvider } from './study-adapter.ts';
import { executeStudy } from '../../../../../../../../src/core/domain/study/engine.ts';

test('schema identifiers and quantity come from structured authorized context', () => {
  const context = { topics: [{ id: 'topic' }], sources: [{ id: 'file', version: 'v1' }], questionCount: 3 };
  const schema = studySchemaFor(context);
  const questions = schema.properties.practice.properties.questions;
  assert.deepEqual(questions.items.properties.topicId.enum, ['topic']);
  assert.equal(questions.minItems, 3);
  assert.equal(questions.maxItems, 3);
  assert.deepEqual(schema.properties.sourceRefs.items.anyOf[0].properties.version.enum, ['v1']);
});

test('engine supplies schema context independently from rendered prompt', async () => {
  let dispatched;
  const input = { action: 'NOTE', message: 'Apunte', topics: [{ id: 'topic', title: 'Tema' }],
    sources: [{ id: 'file', version: 'v1', title: 'Fuente', text: 'Contenido' }], questionCount: 4 };
  await executeStudy(input, { generate: async request => {
    dispatched = request;
    return { status: 'COMPLETE', title: 'Apunte', markdown: 'Contenido', sourceRefs: [{ id: 'file', version: 'v1' }], missingInformation: [] };
  } });
  assert.deepEqual(dispatched.context, { action: 'NOTE', topics: [{ id: 'topic' }], sources: [{ id: 'file', version: 'v1' }], questionCount: 4 });
  assert.deepEqual(studySchemaFor(dispatched.context), studySchemaFor({ ...dispatched, prompt: 'texto arbitrario' }.context));
});

const source = { id: 'file', version: 'v1', title: 'Mitosis', text: 'En metafase se alinean los cromosomas.' };
const sourceRefs = [{ id: source.id, version: source.version }];
const feedback = [{ optionId: 'a', text: 'La alineación ocurre en metafase.' }, { optionId: 'b', text: 'En anafase las cromátidas se separan.' }];
const optionQuestion = { id: 'q', topicId: 'topic', type: 'SINGLE', prompt: '¿En qué fase se alinean los cromosomas?',
  options: [{ id: 'a', text: 'Metafase' }, { id: 'b', text: 'Anafase' }], correctOptionIds: ['a'], scoringRule: 'EXACT',
  explanation: 'En metafase se alinean los cromosomas.', sourceRefs };
const developmentQuestion = { ...optionQuestion, id: 'q2', type: 'DEVELOPMENT', prompt: 'Explicá qué ocurre en metafase.', options: [], correctOptionIds: [] };

async function studyWithGeminiFixture(action, questions) {
  const requests = [];
  const client = {
    async countTokens() { return { totalTokens: 50 }; },
    async generateContent(request) {
      requests.push(request);
      const text = JSON.stringify({ status: 'COMPLETE', title: 'Mitosis', markdown: '', sourceRefs, missingInformation: [],
        practice: { title: 'Práctica de mitosis', questions } });
      return { candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 80 } };
    },
  };
  const database = { $transaction: async run => run({ async $queryRawUnsafe(sql) {
    if (sql.includes('AS running')) return [{ running: 0n }];
    if (sql.includes('AS owned')) return [{ owned: false }];
    if (sql.startsWith('INSERT INTO study_ai_dispatches')) return [{ id: 'dispatch' }];
    if (sql.startsWith('SELECT dispatch_count')) return [{ dispatch_count: 0 }];
    if (sql.startsWith('SELECT request_count')) return [{ request_count: 0, total: '0' }];
    return [];
  } }) };
  const configuration = { backend: 'gemini-developer', model: 'synthetic', apiKey: 'synthetic-only', maxInputTokens: 10000,
    maxOutputTokens: 1000, deadlineMs: 5000, maxConcurrency: 1, dailyActorRequests: 10, dailyGlobalRequests: 20,
    dailyBudgetUsd: 1, inputUsdPerMillion: 0, outputUsdPerMillion: 0 };
  const provider = createGeminiStudyProvider(configuration, database, randomUUID(), randomUUID(), undefined, client, { flow: 'tool' });
  const result = await executeStudy({ action, message: 'Prepará una práctica sobre metafase.', topics: [{ id: 'topic', title: 'Mitosis' }],
    questionCount: questions.length, sources: [source] }, provider);
  assert.equal(requests.length, 1);
  return { result, questionSchema: requests[0].config.responseJsonSchema.properties.practice.properties.questions.items };
}

test('a new Gemini quiz requires and preserves feedback for every option and an empty list for development', async () => {
  const { result, questionSchema } = await studyWithGeminiFixture('QUIZ', [
    { ...optionQuestion, optionFeedback: feedback }, { ...developmentQuestion, optionFeedback: [] },
  ]);
  assert.ok(questionSchema.required.includes('optionFeedback'));
  assert.deepEqual(result.practice.questions[0].optionFeedback, feedback);
  assert.deepEqual(result.practice.questions[1].optionFeedback, []);
});

test('a new Gemini quiz rejects missing, partial or unrelated option feedback and feedback on development', async () => {
  for (const [label, question] of [
    ['no field', optionQuestion],
    ['partial', { ...optionQuestion, optionFeedback: [feedback[0]] }],
    ['foreign option', { ...optionQuestion, optionFeedback: [feedback[0], { optionId: 'other', text: 'No corresponde.' }] }],
    ['duplicate option', { ...optionQuestion, optionFeedback: [feedback[0], feedback[0]] }],
    ['empty text', { ...optionQuestion, optionFeedback: [feedback[0], { optionId: 'b', text: ' ' }] }],
    ['development without the list', developmentQuestion],
    ['development with option feedback', { ...developmentQuestion, optionFeedback: feedback }],
  ]) await assert.rejects(studyWithGeminiFixture('QUIZ', [question]), { code: 'AI_UNAVAILABLE' }, label);
});

test('Gemini mock exams and exercises keep general explanations without option feedback', async () => {
  for (const action of ['MOCK_EXAM', 'EXERCISE']) {
    const { result, questionSchema } = await studyWithGeminiFixture(action, [optionQuestion, developmentQuestion]);
    assert.ok(!questionSchema.required.includes('optionFeedback'));
    assert.ok(!Object.hasOwn(questionSchema.properties, 'optionFeedback'));
    assert.equal(result.practice.questions[0].explanation, optionQuestion.explanation);
    assert.ok(!Object.hasOwn(result.practice.questions[0], 'optionFeedback'));
  }
});
