import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submissionRepository } from '../index';
import { createSubmissionFixtures } from '../data/submissionFixtures';
import * as legacy from '../../../mockData';

test('repository starts with the unchanged feature fixtures', () => {
  assert.deepEqual(submissionRepository.read(), createSubmissionFixtures());
  assert.strictEqual(submissionRepository.read(), legacy.sharedSubmissions);
});

test('feature replacement and legacy replacement use the same live owner', () => {
  const original = submissionRepository.read();
  const featureReplacement = original.map(sub => sub.studentId === 1
    ? { ...sub, content: 'Desde el módulo' }
    : sub);
  const legacyReplacement = original.slice(1);
  try {
    assert.equal(submissionRepository.replace(featureReplacement), undefined);
    assert.strictEqual(legacy.sharedSubmissions, featureReplacement);
    assert.strictEqual(submissionRepository.read(), featureReplacement);
    legacy.updateSharedSubmissions(legacyReplacement);
    assert.strictEqual(submissionRepository.read(), legacyReplacement);
    assert.strictEqual(legacy.sharedSubmissions, legacyReplacement);
    // Existing React-state snapshots stay unchanged until a consumer reads again.
    assert.equal(original.length, 5);
    assert.equal(original[0].content, null);
  } finally {
    submissionRepository.replace(original);
  }
});

test('separate fixture creation does not share mutable records with the session owner', () => {
  const fresh = createSubmissionFixtures();
  fresh[0].dua.push('Prueba');
  fresh[0].content = 'Cambio aislado';
  assert.deepEqual(submissionRepository.read()[0].dua, []);
  assert.equal(submissionRepository.read()[0].content, null);
});
