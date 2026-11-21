import assert from 'node:assert/strict';
import test from 'node:test';
import { completedPracticeAttempts, practiceQuestionOutcomes } from './study-practice-results.ts';

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
