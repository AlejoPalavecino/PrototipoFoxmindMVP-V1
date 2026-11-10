import test from 'node:test';
import assert from 'node:assert/strict';
import { rational, questionScore, scoreJson, finalGrade, hundredths, roundHalfUp, addScores } from '../apps/api/src/modules/grading/domain/scoring.ts';
import { privateGradingInput } from '../apps/api/src/modules/grading/domain/grading-policy.ts';

const question = (rule = 'PARTIAL', points = '6') => ({ id: 'q', type: 'MULTIPLE_CHOICE', points, scoringRule: rule,
  options: ['a', 'b', 'c', 'wrong'].map(id => ({ id, correct: id !== 'wrong' })) });
const answer = ids => ({ text: null, optionIds: ids });
test('exact P*S/C and per-question wrong-option zero preserve other questions', () => {
  assert.deepEqual(scoreJson(questionScore(question(), answer(['a', 'b']), null)), { numerator: '4', denominator: '1' });
  assert.deepEqual(scoreJson(questionScore(question(), answer(['a', 'b', 'wrong']), null)), { numerator: '0', denominator: '1' });
  assert.deepEqual(scoreJson(questionScore(question('EXACT'), answer(['a', 'b']), null)), { numerator: '0', denominator: '1' });
  assert.deepEqual(scoreJson(questionScore(question('EXACT'), answer(['c', 'a', 'b']), null)), { numerator: '6', denominator: '1' });
  assert.equal(finalGrade([rational(0n), rational(4n)], ['6', '4']), '4.00');
});
test('normalized rational intermediates are not rounded before the common 0-10 scale', () => {
  const score = questionScore(question('PARTIAL', '1'), answer(['a', 'b']), null);
  assert.deepEqual(scoreJson(score), { numerator: '2', denominator: '3' });
  assert.equal(finalGrade([score, score, score], ['1', '1', '1']), '6.67');
  assert.equal(finalGrade([rational(1669n, 2000n)], ['1']), '8.35');
  assert.equal(roundHalfUp(rational(1669n, 200n)), '8.35');
  assert.deepEqual(scoreJson(addScores(rational(2n, 3n), rational(1n, 3n))), { numerator: '1', denominator: '1' });
  assert.equal(finalGrade([rational(100n)], ['100']), '10.00');
});
test('nonblank development pending is not zero; confirmed blank scores zero', () => {
  const q = { ...question(), type: 'DEVELOPMENT', options: [], scoringRule: null };
  assert.equal(questionScore(q, { text: 'Manual answer', optionIds: [] }, null), null);
  assert.deepEqual(scoreJson(questionScore(q, { text: ' \n\t', optionIds: [] }, null)), { numerator: '0', denominator: '1' });
  assert.deepEqual(scoreJson(questionScore(q, { text: 'Manual answer', optionIds: [] }, '0')), { numerator: '0', denominator: '1' });
  assert.equal(finalGrade([null, rational(4n)], ['6', '4']), null);
  assert.throws(() => questionScore(q, { text: 'Answer', optionIds: [] }, '6.01'), { code: 'INVALID_INPUT' });
});
test('manual decimals reject excess precision, exponent, negative and malformed input without rounding', () => {
  for (const input of ['8.345', '1e1', '-1', 'NaN', 'Infinity', '.5', '01', '', 8.5]) assert.throws(() => hundredths(input), { code: 'INVALID_INPUT' });
  assert.equal(hundredths('8.50'), 850n); assert.equal(hundredths('0'), 0n);
  const base = { revision: '0', overallGrade: '8.50', questions: [] };
  assert.equal(privateGradingInput(base).overallGrade, '8.50');
  for (const bad of [{ ...base, overallGrade: '10.01' }, { ...base, overallGrade: '8.345' }, { ...base, publish: true }])
    assert.throws(() => privateGradingInput(bad), { code: 'INVALID_INPUT' });
});
