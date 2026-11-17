import test from 'node:test';
import assert from 'node:assert/strict';
import { studySchemaFor } from './study-response-schema.ts';
import { executeStudy } from '../../../../../../../../src/core/domain/study/engine.ts';

test('schema identifiers and quantity come from structured authorized context', () => {
  const context = { topics: [{ id: 'topic' }], sources: [{ id: 'file', version: 'v1' }], questionCount: 3 };
  const schema = studySchemaFor(context);
  const questions = schema.properties.practice.properties.questions;
  assert.deepEqual(questions.items.properties.topicId.enum, ['topic']);
  assert.equal(questions.minItems, 3);
  assert.equal(questions.maxItems, 3);
  assert.deepEqual(schema.properties.sourceRefs.items.anyOf[0].properties.version.enum, ['v1']);
});

test('engine supplies schema context independently from rendered prompt', async () => {
  let dispatched;
  const input = { action: 'NOTE', message: 'Apunte', topics: [{ id: 'topic', title: 'Tema' }],
    sources: [{ id: 'file', version: 'v1', title: 'Fuente', text: 'Contenido' }], questionCount: 4 };
  await executeStudy(input, { generate: async request => {
    dispatched = request;
    return { status: 'COMPLETE', title: 'Apunte', markdown: 'Contenido', sourceRefs: [{ id: 'file', version: 'v1' }], missingInformation: [] };
  } });
  assert.deepEqual(dispatched.context, { topics: [{ id: 'topic' }], sources: [{ id: 'file', version: 'v1' }], questionCount: 4 });
  assert.deepEqual(studySchemaFor(dispatched.context), studySchemaFor({ ...dispatched, prompt: 'texto arbitrario' }.context));
});
