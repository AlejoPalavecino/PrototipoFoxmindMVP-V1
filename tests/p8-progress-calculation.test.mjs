import test from 'node:test';
import assert from 'node:assert/strict';
import { completion, performance, gradeMean, meanScore, taughtProgress } from '../apps/api/src/modules/grading/domain/progress-calculation.ts';
import { roundHalfUp } from '../apps/api/src/modules/grading/domain/scoring.ts';

test('completion counts student/activity pairs, distinguishes empty from complete and keeps reopening additional', () => {
  assert.deepEqual(completion(2, 1, 1, 0, 1), { expected: 2, delivered: 1, pending: 1, onTime: 1, late: 0,
    pendingResubmissions: 1, percentage: '50.00', emptyLabel: null });
  assert.equal(completion(0, 0, 0, 0, 0).percentage, null);
  assert.equal(completion(0, 0, 0, 0, 0).emptyLabel, 'Sin actividades pendientes de seguimiento');
  assert.equal(completion(2, 2, 1, 1, 0).percentage, '100.00');
  assert.equal(completion(2, 2, 1, 1, 0).emptyLabel, null);
});
test('only actual published values enter performance, including zero and exact-half rounding', () => {
  assert.deepEqual(performance(['8', '6']), { graded: 2, average: '7.00' });
  assert.deepEqual(performance([]), { graded: 0, average: null });
  assert.deepEqual(performance(['0']), { graded: 1, average: '0.00' });
  assert.deepEqual(performance(['8.34', '8.35']), { graded: 2, average: '8.35' });
});
test('class mean weights exact individual means equally, not pooled or prerounded values', () => {
  assert.equal(roundHalfUp(meanScore([gradeMean(['10', '10']), gradeMean(['4'])])), '7.00');
  assert.equal(roundHalfUp(meanScore([gradeMean(['0', '0.01']), gradeMean(['0'])])), '0.00');
  assert.equal(meanScore([]), null);
});
test('taught topics form a separate measure without inventing a percentage for an empty plan', () => {
  assert.deepEqual(taughtProgress(3, 1), { total: 3, taught: 1, percentage: '33.33' });
  assert.deepEqual(taughtProgress(0, 0), { total: 0, taught: 0, percentage: null });
});
