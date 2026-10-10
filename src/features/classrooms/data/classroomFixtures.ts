import type { Classroom } from '../model/Classroom';

type ClassroomIdentity = Pick<Classroom, 'id' | 'subject' | 'course' | 'studentsCount' | 'color'>;

const demoClassroomIdentities = {
  c1: { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, color: 'bg-fox-purple' },
  c3: { id: 'c3', subject: 'Matemáticas', course: '3°B', studentsCount: 26, color: 'bg-fox-orange' },
  c4: { id: 'c4', subject: 'Ciencias', course: '2°A', studentsCount: 29, color: 'bg-fox-green' },
} satisfies Record<string, ClassroomIdentity>;

export const createTeacherClassroomFixtures = (): Classroom[] => [
  { ...demoClassroomIdentities.c1, progress: 65, activeTasks: 3, pendingSubmissions: 5, avgGrade: 7.8 },
  { ...demoClassroomIdentities.c3, progress: 70, activeTasks: 4, pendingSubmissions: 10, avgGrade: 6.5 },
  { ...demoClassroomIdentities.c4, progress: 55, activeTasks: 2, pendingSubmissions: 1, avgGrade: 8.5 },
];

export const createStudentClassroomFixtures = (): Classroom[] => [
  { ...demoClassroomIdentities.c1, progress: 80, activeTasks: 1, pendingSubmissions: 0, avgGrade: 8.5, teacherName: 'Profa. Martínez', nextClass: 'Mañana 10:00', lastActivity: 'Ayer' },
  { ...demoClassroomIdentities.c3, progress: 50, activeTasks: 1, pendingSubmissions: 1, avgGrade: 6.0, teacherName: 'Prof. Silva', nextClass: 'Viernes 11:30', lastActivity: 'Hoy' },
  { ...demoClassroomIdentities.c4, progress: 75, activeTasks: 0, pendingSubmissions: 0, avgGrade: 9.0, teacherName: 'Profa. Ruiz', nextClass: 'Lunes 09:00', lastActivity: 'Hace 1 semana' },
];
