import test from 'node:test';
import assert from 'node:assert/strict';
import { privateGradingInput, gradeCorrectionInput, gradePublicationInput,
  parseGradingView, parsePublishedGradeResult, parseGradeCorrectionsView } from '../src/core/domain/classroom-grading.ts';
import { parseWallMutation } from '../src/core/domain/classroom-wall.ts';

const q = 'a1111111-1111-4111-8111-111111111111';
const reject = (parse, values) => { for (const value of values) assert.throws(() => parse(value), /INVALID_INPUT/, JSON.stringify(value)); };
test('grading corpus preserves zero, null, exact decimal and feedback limits', () => {
  const value = { revision: '0', overallGrade: '0', overallFeedback: null, questions: [{ questionId: q, points: '0.01', feedback: '😀'.repeat(5000) }] };
  const result = privateGradingInput(value);
  assert.equal(result.overallGrade, '0'); assert.equal(result.questions[0].points, '0.01');
  assert.equal(privateGradingInput({ revision: '1', overallGrade: null, questions: [] }).overallGrade, null);
  reject(privateGradingInput, [
    { ...value, overallGrade: '10.001' }, { ...value, overallGrade: '10.01' },
    { ...value, questions: [...value.questions, value.questions[0]] },
    { ...value, questions: [{ questionId: q }] }, { ...value, extra: true },
    { ...value, overallFeedback: '😀'.repeat(5001) }, { ...value, overallFeedback: '\u0000' },
  ]);
});
test('grade correction and publication require confirmation, valid revision and closed shape', () => {
  assert.deepEqual(gradeCorrectionInput({ revision: '2', newGrade: '0', reason: '  ajuste  ', confirm: true }),
    { revision: '2', newGrade: '0.00', reason: 'ajuste', confirm: true });
  assert.deepEqual(gradePublicationInput({ revision: '0', confirm: true }), { revision: '0', confirm: true });
  reject(gradeCorrectionInput, [
    { revision: '2', newGrade: '10.01', reason: 'x', confirm: true },
    { revision: '2', newGrade: '0.001', reason: 'x', confirm: true },
    { revision: '2', newGrade: '0', reason: ' ', confirm: true },
    { revision: '2', newGrade: '0', reason: 'x', confirm: false },
    { revision: '2', newGrade: '0', reason: 'x', confirm: true, extra: 1 },
  ]);
  reject(gradePublicationInput, [{ revision: '0' }, { revision: '0', confirm: false }, { revision: '0', confirm: true, extra: 1 }]);
});
test('critical response decoders reject malformed payloads instead of trusting JSON', () => {
  for (const parse of [parseGradingView, parsePublishedGradeResult, parseGradeCorrectionsView]) reject(parse, [null, {}, [], { revision: 1 }]);
});
test('wall mutation contract preserves confirmation and rejects extra keys', () => {
  const valid = { revision: '0', operation: { action: 'removePost', id: q, confirm: true } };
  assert.equal(parseWallMutation(valid).operation.confirm, true);
  reject(parseWallMutation, [{ ...valid, operation: { ...valid.operation, confirm: false } },
    { ...valid, operation: { ...valid.operation, authorId: q } }, { ...valid, extra: true }]);
});


test('published result rejects malformed rational scores, point values and question discriminants', () => {
  const valid = { status: 'published', activity: { id: q, title: 'Synthetic', type: 'QUESTIONNAIRE' },
    attempt: { id: q, number: 1, submittedAt: '2026-01-01T00:00:00Z' }, grade: { id: q, finalGrade: '8.00', publishedAt: '2026-01-01T00:00:00Z', overallFeedback: null, isEffective: true },
    questions: [{ id: q, type: 'DEVELOPMENT', prompt: 'Explain', points: '2.00', feedback: null,
      answer: { text: 'answer', selectedOptions: [] }, earned: { numerator: '1', denominator: '2' } }], attachments: [] };
  assert.doesNotThrow(() => parsePublishedGradeResult(valid));
  for (const patch of [ { earned: { numerator: '1', denominator: '0' } },
    { earned: { numerator: '1.5', denominator: '2' } }, { points: 'not-a-decimal' }, { type: 'UNKNOWN' } ]) {
    const payload = structuredClone(valid); Object.assign(payload.questions[0], patch);
    assert.throws(() => parsePublishedGradeResult(payload), /INVALID_INPUT/, JSON.stringify(patch));
  }
});
