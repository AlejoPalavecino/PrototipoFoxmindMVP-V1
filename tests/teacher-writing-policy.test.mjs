import assert from 'node:assert/strict';
import test from 'node:test';
import { makeWritingSnapshot, parseWritingReport } from '../src/core/domain/grading/teacher-writing.ts';

const source = { activityId: 'local-activity', attemptId: 'local-attempt', title: 'Título privado',
  instructions: 'Explicá la primera decisión.', criteria: [{ name: 'Claridad', description: 'Justificá.' }],
  texts: [{ prompt: null, text: 'Elegí esta opción. Envié el trabajo a estudiante@example.test.' }] };

test('provider only sees bounded writing, the prompt, criteria and local codes', () => {
  const snapshot = makeWritingSnapshot([source]);
  assert.deepEqual(snapshot.references, [{ ref: 'A1', activityId: 'local-activity', attemptId: 'local-attempt', title: 'Título privado' }]);
  assert.deepEqual(Object.keys(snapshot.evidence.activities[0]).sort(), ['criteria', 'instructions', 'ref', 'texts']);
  const json = JSON.stringify(snapshot.evidence);
  for (const hidden of ['local-activity', 'local-attempt', 'Título privado', 'estudiante@example.test']) assert.ok(!json.includes(hidden));
  assert.ok(makeWritingSnapshot([{ ...source, texts: [{ prompt: null, text: 'x'.repeat(20000) }] }]).evidence.activities[0].texts[0].text.length < 5000);
  assert.equal(makeWritingSnapshot([{ ...source, texts: [{ prompt: null, text: '   ' }] }]), null);
});

test('only existing local evidence codes are accepted and projected to authorized attempt links', () => {
  const snapshot = makeWritingSnapshot([source]);
  const item = { text: 'Justifica una decisión en esta entrega.', evidenceRefs: ['A1'] };
  assert.deepEqual(parseWritingReport({ strengths: [item], improvements: [], nextStep: null }, snapshot.references).strengths[0],
    { text: item.text, sources: [{ activityId: 'local-activity', attemptId: 'local-attempt', title: 'Título privado' }] });
  for (const evidenceRefs of [[], ['A2'], ['A1', 'A1']]) {
    assert.throws(() => parseWritingReport({ strengths: [{ ...item, evidenceRefs }], improvements: [], nextStep: null }, snapshot.references), /INVALID_AI_OUTPUT/);
  }
});
