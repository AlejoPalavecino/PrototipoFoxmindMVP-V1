import assert from 'node:assert/strict';
import test from 'node:test';
import { contractFeedback } from '../../../../../../src/core/domain/classrooms/contract-values.ts';
import { parseFeedback, serializeFeedback } from './overall-feedback.ts';

const empty = parseFeedback(null);

test('structured feedback round-trips Unicode, line breaks and text resembling a field label', () => {
  const feedback = {
    strengths: 'Vinculaste la imagen con el concepto.\n\nPara mejorar: 18\nObservación literal',
    improvements: '  Explicá el porqué.  ',
    nextStep: 'Agregá un ejemplo 🦊.',
    general: 'Comentario\r\nextra',
  };
  const stored = serializeFeedback(feedback);
  assert.match(stored, /Lo que hiciste bien.*[\s\S]*Para mejorar.*[\s\S]*Próximo paso/);
  assert.deepEqual(parseFeedback(contractFeedback(stored)), feedback);
  assert.deepEqual(parseFeedback(serializeFeedback({ ...empty, nextStep: 'Siguiente acción' })), { ...empty, nextStep: 'Siguiente acción' });
});

test('legacy and unstructured AI feedback remain the complete general comment', () => {
  for (const general of ['  Texto tal cual\n  ', 'Lo que hiciste bien: Buena entrega\nPara mejorar: ejemplos', '🦊'.repeat(5000)]) {
    assert.deepEqual(parseFeedback(general), { ...empty, general });
    assert.equal(serializeFeedback(parseFeedback(general)), general);
  }
  assert.equal(serializeFeedback(empty), null);
});

test('aggregate limit counts Unicode code points and includes every stored label', () => {
  const overhead = [...serializeFeedback({ ...empty, nextStep: 'x' })].length - 1;
  // Account for digits in the length header when a field grows.
  const nextStep = '🦊'.repeat(5000 - overhead - 3);
  const valid = serializeFeedback({ ...empty, nextStep });
  assert.equal([...valid].length, 5000);
  assert.equal(contractFeedback(valid), valid);
  const overflow = serializeFeedback({ ...empty, nextStep: nextStep + '!' });
  assert.equal([...overflow].length, 5001);
  assert.throws(() => contractFeedback(overflow));
  assert.equal(parseFeedback(overflow).nextStep, nextStep + '!');
});

test('malformed structured text falls back to the full original comment', () => {
  const incomplete = serializeFeedback({ ...empty, strengths: 'Buen trabajo' }).slice(0, -1);
  assert.deepEqual(parseFeedback(incomplete), { ...empty, general: incomplete });
});
