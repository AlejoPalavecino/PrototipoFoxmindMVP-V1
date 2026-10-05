import type { Classroom } from '../model/Classroom';

export const createTeacherClassroomFixtures = (): Classroom[] => [
  { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, progress: 65, activeTasks: 3, pendingSubmissions: 5, avgGrade: 7.8, color: 'bg-fox-purple' },
  { id: 'c3', subject: 'Matemáticas', course: '3°B', studentsCount: 26, progress: 70, activeTasks: 4, pendingSubmissions: 10, avgGrade: 6.5, color: 'bg-fox-orange' },
  { id: 'c4', subject: 'Ciencias', course: '2°A', studentsCount: 29, progress: 55, activeTasks: 2, pendingSubmissions: 1, avgGrade: 8.5, color: 'bg-fox-green' },
];

export const createStudentClassroomFixtures = (): Classroom[] => [
  { id: 'c1', subject: 'Literatura', course: '3°A', studentsCount: 28, progress: 80, activeTasks: 1, pendingSubmissions: 0, avgGrade: 8.5, color: 'bg-fox-purple', teacherName: 'Profa. Martínez', nextClass: 'Mañana 10:00', lastActivity: 'Ayer' },
  { id: 'c3', subject: 'Matemáticas', course: '3°A', studentsCount: 28, progress: 50, activeTasks: 1, pendingSubmissions: 1, avgGrade: 6.0, color: 'bg-fox-orange', teacherName: 'Prof. Silva', nextClass: 'Viernes 11:30', lastActivity: 'Hoy' },
  { id: 'c4', subject: 'Ciencias', course: '3°A', studentsCount: 28, progress: 75, activeTasks: 0, pendingSubmissions: 0, avgGrade: 9.0, color: 'bg-fox-green', teacherName: 'Profa. Ruiz', nextClass: 'Lunes 09:00', lastActivity: 'Hace 1 semana' },
];
