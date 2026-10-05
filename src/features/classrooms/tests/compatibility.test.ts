import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as legacy from '../../../mockData';
import { sharedSubmissions as importedSubmissions } from '../../../mockData';

test('submission fixtures retain order, statuses, grades, dates and DUA profiles', () => {
  assert.deepEqual(legacy.sharedSubmissions.map(({ studentId, name, status, grade, date, dua }) => ({
    studentId, name, status, grade, date, dua,
  })), [
    { studentId: 1, name: 'Marcos Pérez', status: 'missing', grade: null, date: null, dua: [] },
    { studentId: 2, name: 'Sofía Herrera', status: 'submitted', grade: null, date: 'Hoy 09:15', dua: ['Dislexia'] },
    { studentId: 3, name: 'Lucas Díaz', status: 'graded', grade: 8.5, date: 'Ayer 14:20', dua: [] },
    { studentId: 4, name: 'Ana Torres', status: 'graded', grade: 9, date: 'Ayer 16:45', dua: ['TDAH'] },
    { studentId: 5, name: 'Valentina Gómez', status: 'submitted', grade: null, date: 'Hoy 11:30', dua: [] },
  ]);
  assert.equal(legacy.sharedSubmissions[0].content, null);
  assert.ok(legacy.sharedSubmissions.slice(1).every(sub => typeof sub.content === 'string'));
  assert.ok(legacy.sharedSubmissions.every(sub => sub.attachedFile === undefined));
});

test('legacy replacement is synchronous and updates already-imported live bindings', () => {
  const original = legacy.sharedSubmissions;
  const replacement = original.map(sub => sub.studentId === 2
    ? { ...sub, content: 'Respuesta de prueba' }
    : sub);
  try {
    assert.equal(legacy.updateSharedSubmissions(replacement), undefined);
    assert.strictEqual(legacy.sharedSubmissions, replacement);
    assert.strictEqual(importedSubmissions, replacement);
    assert.notStrictEqual(original, replacement);
    assert.notEqual(original[1].content, 'Respuesta de prueba');
    assert.strictEqual(replacement[0], original[0]);
  } finally {
    legacy.updateSharedSubmissions(original);
  }
});

test('legacy replacement accepts an empty array without merging or cloning', () => {
  const original = legacy.sharedSubmissions;
  const replacement: typeof original = [];
  try {
    legacy.updateSharedSubmissions(replacement);
    assert.strictEqual(legacy.sharedSubmissions, replacement);
    assert.equal(importedSubmissions.length, 0);
  } finally {
    legacy.updateSharedSubmissions(original);
  }
});
