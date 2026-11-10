import test from 'node:test';
import assert from 'node:assert/strict';
import { GradingService } from '../apps/api/src/bootstrap/academic-grading-composition.ts';

async function view(type, grade, points = null) {
  const question = { id: 'question', type: 'DEVELOPMENT', prompt: 'Explicá', points: '10', options: [] };
  const service = new GradingService({ run() {}, classroom() {} }, {
    activity() {}, activityView: async () => ({ questions: type === 'ASSIGNMENT' ? [] : [question] }), advanceRevision() {},
  });
  const tx = { query: async sql => sql.includes('FROM answers a') ? [{ questionId: question.id, text: 'Respuesta', optionIds: [] }]
    : sql.includes('FROM question_grades') && points !== null ? [{ question_id: question.id, numerator: points, denominator: '1', feedback: null }] : [] };
  return service.gradingView(tx, { room: { revision: 1n, archived_at: null, timezone: 'UTC' }, activity: { id: 'activity', type },
    attempt: { id: 'attempt', attempt_number: 1, submitted_at: new Date(), submitted_late: false }, grade });
}
const override = { id: 'grade', is_published: false, final_grade: '9', final_grade_override: '9', calculated_grade: null };

for (const type of ['QUESTIONNAIRE', 'EVALUATION']) test(`${type} override does not hide pending manual question scores`, async () => {
  const result = await view(type, override);
  assert.equal(result.grade.finalGrade, '9.00'); assert.equal(result.grade.calculatedGrade, null);
  assert.equal(result.grade.pending, true);
  const complete = await view(type, override, '8');
  assert.equal(complete.grade.finalGrade, '9.00'); assert.equal(complete.grade.calculatedGrade, '8.00');
  assert.equal(complete.grade.pending, false);
});

test('assignment explicit null calculated grade never falls back to its override', async () => {
  const result = await view('ASSIGNMENT', override);
  assert.equal(result.grade.finalGrade, '9.00'); assert.equal(result.grade.calculatedGrade, null);
  assert.equal(result.grade.pending, false);
});

test('assignment absent legacy calculated field still reads its historical final grade', async () => {
  const legacy = { id: 'grade', is_published: false, final_grade: '7', final_grade_override: null };
  const result = await view('ASSIGNMENT', legacy);
  assert.equal(result.grade.finalGrade, '7.00'); assert.equal(result.grade.calculatedGrade, '7.00');
});

test('assignment SQL legacy null base without override preserves its historical grade', async () => {
  const legacy = { id: 'grade', is_published: false, final_grade: '7', final_grade_override: null, calculated_grade: null };
  const result = await view('ASSIGNMENT', legacy);
  assert.equal(result.grade.finalGrade, '7.00'); assert.equal(result.grade.calculatedGrade, '7.00'); assert.equal(result.grade.pending, false);
});

test('published legacy questionnaire with unknown stored base and complete question scores stays complete', async () => {
  const result = await view('QUESTIONNAIRE', { ...override, is_published: true }, '8');
  assert.equal(result.grade.finalGrade, '9.00'); assert.equal(result.grade.calculatedGrade, null);
  assert.equal(result.grade.pending, false);
});
