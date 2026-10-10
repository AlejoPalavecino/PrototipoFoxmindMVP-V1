import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Classroom } from '../model/Classroom';
import { createStudentClassroomFixtures, createTeacherClassroomFixtures } from '../data/classroomFixtures';

const identity = ({ id, subject, course, studentsCount, color }: Classroom) =>
  ({ id, subject, course, studentsCount, color });

const canonicalIdentities = [
  { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, color: 'bg-fox-purple' },
  { id: 'c3', subject: 'Matemáticas', course: '3°B', studentsCount: 26, color: 'bg-fox-orange' },
  { id: 'c4', subject: 'Ciencias', course: '2°A', studentsCount: 29, color: 'bg-fox-green' },
];

test('both roles retain fixture ordering and unique ids', () => {
  for (const create of [createTeacherClassroomFixtures, createStudentClassroomFixtures]) {
    assert.deepEqual(create().map(classroom => classroom.id), ['c1', 'c3', 'c4']);
  }
});

for (const expected of canonicalIdentities) {
  test(`${expected.id} has the canonical identity in both roles`, () => {
    for (const create of [createTeacherClassroomFixtures, createStudentClassroomFixtures]) {
      const classroom = create().find(item => item.id === expected.id);
      assert.ok(classroom);
      assert.deepEqual(identity(classroom), expected);
    }
  });
}

const metrics = ({ id, progress, activeTasks, pendingSubmissions, avgGrade }: Classroom) =>
  ({ id, progress, activeTasks, pendingSubmissions, avgGrade });

test('teacher metrics remain distinct from student metrics', () => {
  assert.deepEqual(createTeacherClassroomFixtures().map(metrics), [
    { id: 'c1', progress: 65, activeTasks: 3, pendingSubmissions: 5, avgGrade: 7.8 },
    { id: 'c3', progress: 70, activeTasks: 4, pendingSubmissions: 10, avgGrade: 6.5 },
    { id: 'c4', progress: 55, activeTasks: 2, pendingSubmissions: 1, avgGrade: 8.5 },
  ]);
  assert.deepEqual(createStudentClassroomFixtures().map(metrics), [
    { id: 'c1', progress: 80, activeTasks: 1, pendingSubmissions: 0, avgGrade: 8.5 },
    { id: 'c3', progress: 50, activeTasks: 1, pendingSubmissions: 1, avgGrade: 6.0 },
    { id: 'c4', progress: 75, activeTasks: 0, pendingSubmissions: 0, avgGrade: 9.0 },
  ]);
});

test('student teacher names, upcoming classes and last activity remain unchanged', () => {
  assert.deepEqual(createStudentClassroomFixtures().map(({ id, teacherName, nextClass, lastActivity }) =>
    ({ id, teacherName, nextClass, lastActivity })), [
    { id: 'c1', teacherName: 'Profa. Martínez', nextClass: 'Mañana 10:00', lastActivity: 'Ayer' },
    { id: 'c3', teacherName: 'Prof. Silva', nextClass: 'Viernes 11:30', lastActivity: 'Hoy' },
    { id: 'c4', teacherName: 'Profa. Ruiz', nextClass: 'Lunes 09:00', lastActivity: 'Hace 1 semana' },
  ]);
});

for (const [role, create, createOtherRole] of [
  ['teacher', createTeacherClassroomFixtures, createStudentClassroomFixtures],
  ['student', createStudentClassroomFixtures, createTeacherClassroomFixtures],
] as const) {
  test(`${role} mutations do not leak to other calls or roles`, () => {
    const fixtures = create();
    const anotherCall = create();
    const otherRole = createOtherRole();
    const expected = structuredClone(fixtures);
    const expectedOtherRole = structuredClone(otherRole);
    assert.notStrictEqual(fixtures, anotherCall);
    assert.notStrictEqual(fixtures, otherRole);

    for (const [index, classroom] of fixtures.entries()) {
      assert.notStrictEqual(classroom, anotherCall[index]);
      assert.notStrictEqual(classroom, otherRole[index]);
      Object.assign(classroom, {
        id: 'changed', subject: 'Changed', course: 'Changed', studentsCount: 0, color: 'changed',
        progress: 0, activeTasks: 99, pendingSubmissions: 99, avgGrade: 0,
        teacherName: 'Changed', nextClass: 'Changed', lastActivity: 'Changed',
      });
    }
    fixtures.pop();

    assert.deepEqual(anotherCall, expected);
    assert.deepEqual(otherRole, expectedOtherRole);
    assert.deepEqual(create(), expected);
    assert.deepEqual(createOtherRole(), expectedOtherRole);
  });
}
