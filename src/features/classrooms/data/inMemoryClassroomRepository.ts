import type { Classroom, ClassroomEnrollment, ClassroomRepository } from '../model/Classroom';
import { createStudentClassroomFixtures, createTeacherClassroomFixtures } from './classroomFixtures';

// Sole session owner. These bindings also back mockData's live compatibility exports.
export const teacherClassrooms = createTeacherClassroomFixtures();
export let studentClassrooms = createStudentClassroomFixtures();

export const addStudentClassroom = (classroom: ClassroomEnrollment): Classroom => {
  const existing = studentClassrooms.find(c => c.id === classroom.id || (c.subject === classroom.subject && c.course === classroom.course));
  if (existing) return existing;

  const newClassroom: Classroom = {
    id: classroom.id,
    subject: classroom.subject,
    course: classroom.course,
    studentsCount: classroom.studentsCount || 26,
    progress: classroom.progress || 0,
    activeTasks: classroom.activeTasks ?? 1,
    pendingSubmissions: 0,
    avgGrade: classroom.avgGrade || 0,
    color: classroom.color || 'bg-fox-blue',
    teacherName: classroom.teacherName || 'Docente Titular',
    nextClass: classroom.nextClass || 'Próximamente',
    lastActivity: 'Recién unida'
  };

  studentClassrooms = [newClassroom, ...studentClassrooms];
  return newClassroom;
};

export const replaceStudentClassrooms = (classrooms: Classroom[]): void => {
  studentClassrooms = classrooms;
};

export const classroomRepository: ClassroomRepository = {
  readCatalogue: () => teacherClassrooms,
  readMembership: () => studentClassrooms,
  add: addStudentClassroom,
  replaceMembership: replaceStudentClassrooms,
};
