import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { classroomRepository as repository, joinClassroomByCode, resolveClassroomJoin } from '../index';
import type { Classroom } from '../index';
import * as legacy from '../../../mockData';
import { mockClassroomsAlumno as liveMembership } from '../../../mockData';

const original = repository.readMembership();
const catalogue = repository.readCatalogue();
const noClock = () => { throw new Error('Clock must only run for generic joins'); };
beforeEach(() => repository.replaceMembership(original));
afterEach(() => repository.replaceMembership(original));

const resolve = (code: string, enrolled: Classroom[] = [], teachers = catalogue) =>
  resolveClassroomJoin(code, teachers, enrolled, () => 42);

test('blank codes reject without mutation or clock use', () => {
  assert.deepEqual(resolveClassroomJoin(' \n\t ', catalogue, [], noClock), { status: 'rejected' });
  assert.deepEqual(joinClassroomByCode(' ', original, noClock), { status: 'rejected' });
  assert.strictEqual(repository.readMembership(), original);
});

test('catalogue matching preserves trimmed case, standard, id, substring and abbreviated variants', () => {
  for (const code of [' c1 ', '3°a-2026-c1', 'prefix-c1-suffix', 'lit-2026-3°']) {
    const result = resolveClassroomJoin(code, catalogue, [], noClock);
    assert.equal(result.status, 'catalogue', code);
    if (result.status === 'catalogue') assert.equal(result.classroom.id, 'c1');
  }
  const maths = resolve('C3');
  assert.equal(maths.status, 'catalogue');
  if (maths.status === 'catalogue') assert.equal(maths.classroom.id, 'c3');
});

test('substring matches remain permissive and first catalogue match wins, not earliest code position', () => {
  const result = resolve('C4-C3-C10');
  assert.equal(result.status, 'catalogue');
  if (result.status === 'catalogue') assert.equal(result.classroom.id, 'c1');
  const teacher = { ...catalogue[0], id: 'special', course: 'abcd' };
  assert.equal(resolve('ABC-2026-SPECIAL', [], [teacher]).status, 'catalogue');
  assert.equal(resolve('LIT-2026-AB', [], [teacher]).status, 'catalogue');
  assert.equal(resolve('LIT-2026-ABC', [], [teacher]).status, 'generic');
});

test('catalogue duplicate checks use snapshot id OR case-insensitive subject/course, without refreshing', () => {
  for (const enrolled of [[original[0]], [{ ...original[0], id: 'different', subject: 'literatura', course: '3°a' }]]) {
    const result = joinClassroomByCode('c1', enrolled, noClock);
    assert.equal(result.status, 'duplicate');
    if (result.status === 'duplicate') assert.strictEqual(result.classroom, catalogue[0]);
    assert.strictEqual(repository.readMembership(), original);
  }
  assert.equal(resolve('c3', [{ ...original[1], id: 'other' }]).status, 'catalogue');
});

test('catalogue planning is nonmutating and retains its distinct defaults and zero tasks', () => {
  const teacher = { ...catalogue[0], studentsCount: 0, activeTasks: 0, teacherName: '' };
  const before = structuredClone(teacher);
  const result = resolve('c1', [], [teacher]);
  assert.deepEqual(result, { status: 'catalogue', classroom: {
    id: 'c1', subject: 'Literatura', course: '3°A', color: 'bg-fox-purple',
    teacherName: 'Prof. Titular', activeTasks: 0, studentsCount: 28, progress: 0, avgGrade: 0,
  } });
  assert.deepEqual(teacher, before);
  assert.strictEqual(repository.readMembership(), original);
});

test('generic parsing retains subject/course substring priorities, including the 2 in 2026', () => {
  const cases = [
    ['HIS-BIO-MAT-LIT-23', 'Literatura', '3° Año A', 'bg-fox-purple'],
    ['MAT-BIO-2', 'Matemáticas', '2° Año B', 'bg-fox-orange'],
    ['BIO-HIS', 'Ciencias Naturales', '1° Año A', 'bg-fox-green'],
    ['CIE', 'Ciencias Naturales', '1° Año A', 'bg-fox-green'],
    ['HIS-2026-X', 'Historia Contemporánea', '2° Año B', 'bg-fox-blue'],
    // "Materia" contains "Mat": the generic fallback is orange, not blue.
    ['anything', 'Materia Vinculada', '1° Año A', 'bg-fox-orange'],
  ];
  for (const [code, subject, course, color] of cases) {
    const result = resolve(code);
    assert.equal(result.status, 'generic');
    if (result.status === 'generic') assert.deepEqual(result.classroom, {
      id: 'aula-code-42', subject, course, color, activeTasks: 1, studentsCount: 26,
      pendingSubmissions: 0, avgGrade: 0, progress: 0, schedule: ['Lunes 08:00', 'Miércoles 10:30'],
      teacherName: 'Prof. Titular', nextClass: 'Próxima clase', lastActivity: 'Recién unida',
    });
  }
});

test('legacy and feature access share catalogue identity and synchronous two-way membership bindings', () => {
  assert.strictEqual(repository.readCatalogue(), legacy.mockClassroomsDocente);
  assert.strictEqual(repository.readMembership(), legacy.mockClassroomsAlumno);
  const replacement: Classroom[] = [];
  legacy.updateClassroomsAlumno(replacement);
  assert.strictEqual(repository.readMembership(), replacement);
  const added = repository.add({ id: 'bridge', subject: 'Bridge', course: 'Test' });
  assert.strictEqual(liveMembership, repository.readMembership());
  assert.strictEqual(legacy.mockClassroomsAlumno[0], added);
  repository.replaceMembership(replacement);
  assert.strictEqual(liveMembership, replacement);
  const legacyAdded = legacy.addClassroomToAlumno({ id: 'legacy', subject: 'Legacy', course: 'Test' });
  assert.strictEqual(repository.readMembership()[0], legacyAdded);
});

test('catalogue join prepends a normalized student record, not copying teacher progress', () => {
  repository.replaceMembership([]);
  const result = joinClassroomByCode('c3', [], noClock);
  assert.equal(result.status, 'catalogue');
  if (result.status !== 'catalogue') return;
  assert.strictEqual(result.classroom, repository.readMembership()[0]);
  assert.deepEqual(result.classroom, {
    id: 'c3', subject: 'Matemáticas', course: '3°B', color: 'bg-fox-orange',
    teacherName: 'Prof. Titular', activeTasks: 4, studentsCount: 26,
    pendingSubmissions: 0, progress: 0, avgGrade: 0, nextClass: 'Próximamente', lastActivity: 'Recién unida',
  });
});

test('stale empty UI snapshot still reports catalogue success when repository already has the id', () => {
  const result = joinClassroomByCode('c1', [], noClock);
  assert.equal(result.status, 'catalogue');
  if (result.status === 'catalogue') assert.strictEqual(result.classroom, original[0]);
  assert.strictEqual(repository.readMembership(), original);
});

test('generic joins drop schedule at storage and repeated subject/course still report generic success', () => {
  const first = joinClassroomByCode('HIS-3', original, () => 42);
  assert.equal(first.status, 'generic');
  assert.equal(repository.readMembership()[0].schedule, undefined);
  assert.equal(repository.readMembership()[0].id, 'aula-code-42');
  const afterFirst = repository.readMembership();
  const second = joinClassroomByCode('HIS-3', afterFirst, () => 43);
  assert.equal(second.status, 'generic');
  if (second.status === 'generic') assert.equal(second.classroom.id, 'aula-code-43');
  assert.strictEqual(repository.readMembership(), afterFirst);
  assert.strictEqual(afterFirst[1], original[0]);
});
