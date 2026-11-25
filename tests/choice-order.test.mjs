import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeChoices } from '../src/core/domain/activities/choice-order.ts';
import { arrangeFoxyQuizOptions } from '../src/core/domain/foxy/foxy-quiz.ts';
import { executeStudy } from '../src/core/domain/study/engine.ts';

const correctFirst = (count) => Array.from({ length: count }, (_, index) => ({
  prompt: `¿Pregunta ${index + 1} sobre la fotosíntesis?`,
  options: [
    { text: `Correcta ${index + 1}`, correct: true, feedback: 'Bien.' },
    { text: `Distractor A ${index + 1}`, correct: false, feedback: 'No.' },
    { text: `Distractor B ${index + 1}`, correct: false, feedback: 'No.' },
    { text: `Distractor C ${index + 1}`, correct: false, feedback: 'No.' },
  ],
}));

test('arrangeChoices keeps every item, is stable for the same seed and changes with the seed', () => {
  const items = ['a', 'b', 'c', 'd'];
  const first = arrangeChoices(items, 'semilla');
  assert.deepEqual([...first].sort(), items);
  assert.deepEqual(arrangeChoices(items, 'semilla'), first);
  const orders = new Set(['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'].map(seed => arrangeChoices(items, seed).join('')));
  assert.ok(orders.size > 1);
  assert.deepEqual(items, ['a', 'b', 'c', 'd']);
});

test('a generated Foxy quiz does not reveal the correct option by its position', () => {
  const quiz = { objective: 'Objetivo', instructions: 'Instrucciones', questions: correctFirst(5) };
  const arranged = arrangeFoxyQuizOptions(quiz);
  const positions = arranged.questions.map(question => question.options.findIndex(option => option.correct));
  assert.ok(new Set(positions).size > 1, `positions ${positions}`);
  arranged.questions.forEach((question, index) => {
    assert.equal(question.prompt, quiz.questions[index].prompt);
    assert.deepEqual([...question.options].sort((a, b) => a.text.localeCompare(b.text)),
      [...quiz.questions[index].options].sort((a, b) => a.text.localeCompare(b.text)));
  });
  assert.deepEqual(arrangeFoxyQuizOptions(quiz), arranged);
  assert.equal(quiz.questions[0].options[0].correct, true);
});

test('a generated study practice does not reveal the correct option by its position', async () => {
  const refs = [{ id: 's1', version: 'v1' }];
  const questions = Array.from({ length: 5 }, (_, index) => ({
    id: `q${index}`, topicId: 't1', type: 'SINGLE', prompt: `¿Pregunta ${index}?`,
    options: ['a', 'b', 'c', 'd'].map(id => ({ id, text: `Opción ${id} ${index}` })),
    correctOptionIds: ['a'], explanation: 'Porque sí.', sourceRefs: refs,
  }));
  const provider = { async generate() {
    return { status: 'COMPLETE', title: 'Práctica', markdown: 'Texto', sourceRefs: refs, missingInformation: [], practice: { title: 'Práctica', questions } };
  } };
  const result = await executeStudy({ action: 'QUIZ', message: 'Practicar', questionCount: 5,
    topics: [{ id: 't1', title: 'Célula' }], sources: [{ id: 's1', version: 'v1', title: 'Biología', text: 'Las células poseen membrana.' }] }, provider);
  const positions = result.practice.questions.map(question => question.options.findIndex(option => question.correctOptionIds.includes(option.id)));
  assert.ok(new Set(positions).size > 1, `positions ${positions}`);
  result.practice.questions.forEach(question => assert.deepEqual(question.options.map(option => option.id).sort(), ['a', 'b', 'c', 'd']));
});
