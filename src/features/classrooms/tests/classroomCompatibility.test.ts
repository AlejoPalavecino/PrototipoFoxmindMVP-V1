import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import * as legacy from '../../../mockData';
import { mockClassroomsAlumno as importedClassrooms } from '../../../mockData';
import type { Classroom } from '../../../types';

const original = legacy.mockClassroomsAlumno;
beforeEach(() => legacy.updateClassroomsAlumno(original));
afterEach(() => legacy.updateClassroomsAlumno(original));

// Characterization deliberately imports only the legacy API, before and after migration.
test('classroom fixtures retain every value, ordering and teacher/student differences', () => {
  assert.deepEqual(legacy.mockClassroomsDocente, [
    { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, progress: 65, activeTasks: 3, pendingSubmissions: 5, avgGrade: 7.8, color: 'bg-fox-purple' },
    { id: 'c3', subject: 'Matemáticas', course: '3°B', studentsCount: 26, progress: 70, activeTasks: 4, pendingSubmissions: 10, avgGrade: 6.5, color: 'bg-fox-orange' },
    { id: 'c4', subject: 'Ciencias', course: '2°A', studentsCount: 29, progress: 55, activeTasks: 2, pendingSubmissions: 1, avgGrade: 8.5, color: 'bg-fox-green' },
  ]);
  assert.deepEqual(legacy.mockClassroomsAlumno, [
    { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, progress: 80, activeTasks: 1, pendingSubmissions: 0, avgGrade: 8.5, color: 'bg-fox-purple', teacherName: 'Profa. Martínez', nextClass: 'Mañana 10:00', lastActivity: 'Ayer' },
    { id: 'c3', subject: 'Matemáticas', course: '3°A', studentsCount: 28, progress: 50, activeTasks: 1, pendingSubmissions: 1, avgGrade: 6.0, color: 'bg-fox-orange', teacherName: 'Prof. Silva', nextClass: 'Viernes 11:30', lastActivity: 'Hoy' },
    { id: 'c4', subject: 'Ciencias', course: '3°A', studentsCount: 28, progress: 75, activeTasks: 0, pendingSubmissions: 0, avgGrade: 9.0, color: 'bg-fox-green', teacherName: 'Profa. Ruiz', nextClass: 'Lunes 09:00', lastActivity: 'Hace 1 semana' },
  ]);
});

test('legacy add prepends synchronously, replaces the array and keeps existing records by reference', () => {
  const added = legacy.addClassroomToAlumno({ id: 'new', subject: 'Historia', course: '2°B' });
  assert.deepEqual(added, {
    id: 'new', subject: 'Historia', course: '2°B', studentsCount: 26, progress: 0,
    activeTasks: 1, pendingSubmissions: 0, avgGrade: 0, color: 'bg-fox-blue',
    teacherName: 'Docente Titular', nextClass: 'Próximamente', lastActivity: 'Recién unida',
  });
  assert.notStrictEqual(legacy.mockClassroomsAlumno, original);
  assert.strictEqual(importedClassrooms, legacy.mockClassroomsAlumno);
  assert.strictEqual(importedClassrooms[0], added);
  assert.strictEqual(importedClassrooms[1], original[0]);
  assert.equal(original.length, 3);
});

test('legacy duplicates use id OR case-sensitive subject/course and preserve array identity', () => {
  assert.strictEqual(legacy.addClassroomToAlumno({ id: 'c1', subject: 'Other', course: 'Other' }), original[0]);
  assert.strictEqual(legacy.addClassroomToAlumno({ id: 'other', subject: 'Literatura', course: '3°A' }), original[0]);
  assert.strictEqual(legacy.mockClassroomsAlumno, original);
  const added = legacy.addClassroomToAlumno({ id: 'case', subject: 'literatura', course: '3°a' });
  assert.equal(added.id, 'case');
  assert.equal(legacy.mockClassroomsAlumno.length, 4);
});

test('legacy add retains truthy numeric fallbacks, nullish tasks and intentionally drops optional fields', () => {
  const added = legacy.addClassroomToAlumno({
    id: 'zero', subject: 'Test', course: 'Test', studentsCount: 0, progress: NaN,
    avgGrade: NaN, activeTasks: 0, pendingSubmissions: 99, color: '', teacherName: '',
    nextClass: '', lastActivity: 'Ignored', schedule: ['Ignored'], description: 'Ignored',
  });
  assert.deepEqual(added, {
    id: 'zero', subject: 'Test', course: 'Test', studentsCount: 26, progress: 0,
    avgGrade: 0, activeTasks: 0, pendingSubmissions: 0, color: 'bg-fox-blue',
    teacherName: 'Docente Titular', nextClass: 'Próximamente', lastActivity: 'Recién unida',
  });
  const retained = legacy.addClassroomToAlumno({
    id: 'negative', subject: 'Negative', course: 'Test', studentsCount: -1, progress: -2,
    avgGrade: -3, activeTasks: undefined, color: 'custom', teacherName: 'Teacher', nextClass: 'Today',
  });
  assert.deepEqual([retained.studentsCount, retained.progress, retained.avgGrade, retained.activeTasks], [-1, -2, -3, 1]);
  assert.deepEqual([retained.color, retained.teacherName, retained.nextClass], ['custom', 'Teacher', 'Today']);
});

test('legacy replacement accepts empty arrays by reference with live bindings and no merging', () => {
  const replacement: Classroom[] = [];
  assert.equal(legacy.updateClassroomsAlumno(replacement), undefined);
  assert.strictEqual(legacy.mockClassroomsAlumno, replacement);
  assert.strictEqual(importedClassrooms, replacement);
  replacement.push(original[0]);
  assert.strictEqual(importedClassrooms[0], original[0]);
  assert.equal(original.length, 3);
});
