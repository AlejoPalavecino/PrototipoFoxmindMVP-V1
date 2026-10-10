import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deliverSubmission, submissionRepository } from '../index';
import { createSubmissionFixtures } from '../data/submissionFixtures';

test('delivery updates only matching student records and preserves other fields', () => {
  const input = createSubmissionFixtures();
  input[2] = {
    ...input[2], email: 'student@example.test', studentNote: 'Nota', feedback: 'Devolución',
    rubricBreakdown: [{ criteria: 'Análisis', max: 10, earned: 8.5 }],
  };
  const snapshot = structuredClone(input);
  const file = { name: 'Trabajo.docx', size: '850 KB', type: 'DOCX' };
  const output = deliverSubmission(input, 3, { text: '  Mi respuesta  ', attachedFile: file });
  assert.notStrictEqual(output, input);
  assert.deepEqual(input, snapshot);
  assert.deepEqual(output[2], {
    ...input[2], status: 'submitted', date: 'Hoy (Reciente)',
    content: '  Mi respuesta  ', attachedFile: file, attachments: [],
  });
  assert.strictEqual(output[2].attachedFile, file);
  assert.strictEqual(output[2].rubricBreakdown, input[2].rubricBreakdown);
  for (const index of [0, 1, 3, 4]) assert.strictEqual(output[index], input[index]);
});

test('text-only delivery clears old attachments without inventing a file', () => {
  const input = createSubmissionFixtures();
  input[1].attachedFile = { name: 'Anterior.pdf', size: '1 MB', type: 'PDF' };
  const output = deliverSubmission(input, 2, { text: 'Respuesta' });
  assert.equal(output[1].content, 'Respuesta');
  assert.equal(output[1].attachedFile, undefined);
  assert.deepEqual(output[1].attachments, []);
});

test('file-only delivery keeps the original fallback content', () => {
  const file = { name: 'Trabajo.pdf', size: '2 MB', type: 'PDF' };
  for (const text of [undefined, '']) {
    const output = deliverSubmission(createSubmissionFixtures(), 2, { attachedFile: file, text });
    assert.equal(output[1].content, 'Entrega adjunta por la estudiante en formato digital para corrección docente.');
    assert.strictEqual(output[1].attachedFile, file);
  }
});

test('delivery preserves whitespace rather than adding normalization', () => {
  const file = { name: 'Trabajo.pdf', size: '1 MB', type: 'PDF' };
  const output = deliverSubmission(createSubmissionFixtures(), 2, { text: '   ', attachedFile: file });
  assert.equal(output[1].content, '   ');
});

test('unknown student preserves all records without appending a submission', () => {
  const input = createSubmissionFixtures();
  const output = deliverSubmission(input, 999, { text: 'Respuesta' });
  assert.notStrictEqual(output, input);
  assert.equal(output.length, input.length);
  output.forEach((sub, index) => assert.strictEqual(sub, input[index]));
  assert.deepEqual(deliverSubmission([], 2, { text: 'Respuesta' }), []);
});

test('delivery maps every matching student record, not just the first', () => {
  const fixtures = createSubmissionFixtures();
  const input = [fixtures[1], fixtures[0], { ...fixtures[1], content: 'Otra entrega' }];
  const output = deliverSubmission(input, 2, { text: 'Respuesta actualizada' });
  assert.equal(output[0].content, 'Respuesta actualizada');
  assert.equal(output[2].content, 'Respuesta actualizada');
  assert.strictEqual(output[1], input[1]);
});

test('all attachments retain their ordered File contents through simulated delivery', async () => {
  const files = [new File(['primero'], 'Uno.PDF'), new File(['segundo'], 'Dos.docx')];
  const attachments = files.map(file => ({ name: file.name, size: '0.0 MB', type: 'PDF', file }));
  const output = deliverSubmission(createSubmissionFixtures(), 2, { attachments, text: 'Nota' });
  assert.notStrictEqual(output[1].attachments, attachments, 'Own the list, not the caller array');
  assert.deepEqual(output[1].attachments?.map(item => item.file), files);
  assert.strictEqual(output[1].attachedFile, attachments[0], 'Legacy first-file projection');
  assert.deepEqual(await Promise.all(output[1].attachments!.map(item => item.file.text())), ['primero', 'segundo']);
  attachments.pop();
  assert.equal(output[1].attachments?.length, 2);
});

test('empty and invalid deliveries reject without changing input records', () => {
  const input = createSubmissionFixtures();
  const snapshot = structuredClone(input);
  for (const delivery of [{}, { text: '  \n\t' }, { attachments: [] }]) {
    assert.throws(() => deliverSubmission(input, 2, delivery), /adjunta un archivo o escribe/);
  }
  const file = new File(['no'], 'Mal.exe');
  assert.throws(() => deliverSubmission(input, 2, {
    text: 'Respuesta', attachments: [{ name: file.name, size: '0 MB', type: 'EXE', file }],
  }), /Formato no permitido/);
  assert.deepEqual(input, snapshot);
});

test('pure delivery does not persist until the caller explicitly replaces the array', () => {
  const original = submissionRepository.read();
  const output = deliverSubmission(original, 1, { text: 'Respuesta' });
  assert.strictEqual(submissionRepository.read(), original);
  try {
    submissionRepository.replace(output);
    assert.strictEqual(submissionRepository.read(), output);
    assert.equal(submissionRepository.read()[0].status, 'submitted');
  } finally {
    submissionRepository.replace(original);
  }
});
