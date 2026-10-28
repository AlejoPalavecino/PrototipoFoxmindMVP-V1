import test from 'node:test';
import assert from 'node:assert/strict';

const domain = () => import('../src/core/domain/index.ts');
const studentId = '11111111-1111-4111-8111-111111111111';
const activityId = '22222222-2222-4222-8222-222222222222';
const progress = () => ({
  studentId, firstName: 'NOMBRE_PRIVADO', lastName: 'APELLIDO_PRIVADO', currentMember: true,
  completion: { expected: 2, delivered: 1, pending: 1, onTime: 1, late: 0, pendingResubmissions: 1, percentage: '50.00', emptyLabel: null },
  performance: { graded: 1, average: '0.00' }, plan: { total: 4, taught: 2, percentage: '50.00' },
  activities: [
    { id: activityId, title: 'TITULO_PRIVADO', type: 'QUESTIONNAIRE', expected: true,
      firstSubmission: { id: studentId, number: 1, submittedAt: '2026-10-28T12:34:56Z', appliedDeadlineAt: '2026-10-29T12:00:00Z', late: false }, pendingResubmission: true, grade: '0.00' },
    { id: studentId, title: 'TEXTO_LIBRE_PRIVADO', type: 'PRACTICAL', expected: true,
      firstSubmission: null, pendingResubmission: false, grade: null },
  ],
});
const report = () => ({ overview: 'Resumen', strengths: [{ text: 'Entrega puntual', evidenceRefs: ['A1'] }],
  supportNeeds: [{ text: 'Actividad pendiente', evidenceRefs: ['A2'] }], recommendations: [], limitations: [] });

test('student AI evidence includes only anonymous structured facts, preserving pending and actual zero', async () => {
  const { createStudentAiEvidence } = await domain();
  const snapshot = createStudentAiEvidence(progress());
  assert.ok(snapshot);
  const serialized = JSON.stringify(snapshot);
  for (const privateValue of [studentId, activityId, 'NOMBRE_PRIVADO', 'APELLIDO_PRIVADO', 'TITULO_PRIVADO', 'TEXTO_LIBRE_PRIVADO', '2026-10-28', '2026-10-29']) {
    assert.equal(serialized.includes(privateValue), false, `private value leaked: ${privateValue}`);
  }
  assert.deepEqual(snapshot.activities, [
    { ref: 'A1', type: 'QUESTIONNAIRE', expected: true, submitted: true, onTime: true, grade: '0.00', pendingResubmission: true },
    { ref: 'A2', type: 'PRACTICAL', expected: true, submitted: false, onTime: null, grade: null, pendingResubmission: false },
  ]);
  assert.equal(snapshot.completion.pending, 1);
  assert.equal(snapshot.performance.graded, 1);
  assert.equal(snapshot.performance.average, '0.00');
});

test('student AI evidence is insufficient when all activities await delivery and grading', async () => {
  const { createStudentAiEvidence } = await domain();
  const p = progress();
  p.completion = { expected: 1, delivered: 0, pending: 1, onTime: 0, late: 0, pendingResubmissions: 0, percentage: '0.00', emptyLabel: null };
  p.performance = { graded: 0, average: null };
  p.activities = [p.activities[1]];
  assert.equal(createStudentAiEvidence(p), null);
  p.completion.expected = 0; p.completion.pending = 0; p.completion.percentage = null; p.activities = [];
  assert.equal(createStudentAiEvidence(p), null);
});

test('student AI report accepts only findings tied to known anonymous evidence references', async () => {
  const { createStudentAiEvidence, validateStudentAiReport } = await domain();
  const evidence = createStudentAiEvidence(progress());
  assert.doesNotThrow(() => validateStudentAiReport(report(), evidence));
  for (const invalidRefs of [[], ['A3'], [activityId], ['A1', 'A999']]) {
    const bad = report(); bad.strengths[0].evidenceRefs = invalidRefs;
    assert.throws(() => validateStudentAiReport(bad, evidence));
  }
});
