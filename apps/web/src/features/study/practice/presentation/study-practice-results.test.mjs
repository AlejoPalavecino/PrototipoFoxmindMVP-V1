import assert from 'node:assert/strict';
import test from 'node:test';
import { completedPracticeAttempts, practiceAnswerIsCorrect, practiceMissedTopics, practiceQuestionOutcomes, practiceStep } from './study-practice-results.ts';

test('history follows the chain in both directions and excludes independent quizzes', () => {
  const practice = (id, previousPracticeId, status = 'FINALIZED') => ({ id, previousPracticeId, status });
  const first = practice('first');
  const second = practice('second', 'first');
  const third = practice('third', 'second');
  const retry = practice('retry', 'third', 'ACTIVE');
  const unrelated = practice('unrelated');
  const all = [first, second, third, retry, unrelated];
  assert.deepEqual(completedPracticeAttempts(second, all), [first, second, third]);
  assert.deepEqual(completedPracticeAttempts(retry, all), [first, second, third]);
});

test('outcomes match private objective results by question ID and omit scores for development', () => {
  const result = { questions: [{ id: 'review', score: 0.5 }, { id: 'essay', score: null }, { id: 'correct', score: 1 }] };
  assert.deepEqual([...practiceQuestionOutcomes(result)], [['review', 0.5], ['correct', 1]]);
  assert.deepEqual([...practiceQuestionOutcomes(null)], []);
});

test('the trail marks confirmed answers as correct or to review and leaves the rest pending', () => {
  const single = { id: 'q1', type: 'SINGLE', correctOptionIds: ['a'] };
  const multiple = { id: 'q2', type: 'MULTIPLE', correctOptionIds: ['a', 'b'] };
  const essay = { id: 'q3', type: 'DEVELOPMENT' };
  const answers = { q1: ['a'], q2: ['a'], q3: '  ' };
  assert.equal(practiceStep(single, answers, true, true), 'correct');
  assert.equal(practiceStep(multiple, answers, true, true), 'review', 'a partial choice is not correct');
  assert.equal(practiceStep(single, answers, false, true), 'pending', 'an unconfirmed answer does not reveal its outcome');
  assert.equal(practiceStep(essay, answers, false, true), 'pending', 'blank development stays pending');
  assert.equal(practiceStep(essay, { q3: 'Mi respuesta' }, false, true), 'answered');
  assert.equal(practiceStep(single, answers, false, false), 'answered', 'simulacros only show progress');
  assert.equal(practiceAnswerIsCorrect(multiple, ['b', 'a']), true);
  assert.equal(practiceAnswerIsCorrect(single, 'a'), false);
});

test('missed topics come from results below full score, without duplicates or development rows', () => {
  const result = { questions: [
    { id: 'q1', topicId: 'luz', score: 1 }, { id: 'q2', topicId: 'contraste', score: 0 },
    { id: 'q3', topicId: 'contraste', score: 0.5 }, { id: 'q4', topicId: 'apertura', score: null }, { id: 'q5', score: 0 },
  ] };
  assert.deepEqual(practiceMissedTopics(result), ['contraste']);
  assert.deepEqual(practiceMissedTopics(undefined), []);
});
