import type { ClassroomDetailSession, CurriculumUnit } from '../model/ClassroomDetail';

// Volatile module lifetime, not a per-classroom store or reactive repository.
const sessionStudents = [
  { id: 1, name: 'Marcos Pérez', risk: 'ALTO', lastSeen: 'Hace 8 días', dua: [] },
  { id: 2, name: 'Sofía Herrera', risk: 'MEDIO', lastSeen: 'Ayer', dua: ['Dislexia'] },
  { id: 3, name: 'Lucas Díaz', risk: 'BAJO', lastSeen: 'Hoy', dua: [] },
  { id: 4, name: 'Ana Torres', risk: 'BAJO', lastSeen: 'Hoy', dua: ['TDAH'] },
  { id: 5, name: 'Valentina Gómez', risk: 'BAJO', lastSeen: 'Hace 2 horas', dua: [] },
];

let sessionCurriculum: CurriculumUnit[] = [
  { id: 1, unit: 'Unidad 1: Modernismo', status: 'completed', topics: ['Rubén Darío', 'Características principales', 'Poesía modernista'] },
  { id: 2, unit: 'Unidad 2: Vanguardias', status: 'current', topics: ['Creacionismo', 'Ultraísmo', 'Manifiestos'] },
  { id: 3, unit: 'Unidad 3: Boom Latinoamericano', status: 'pending', topics: ['Realismo Mágico', 'García Márquez', 'Cortázar'] },
  { id: 4, unit: 'Unidad 4: Literatura Contemporánea', status: 'pending', topics: ['Nuevas narrativas', 'Poesía actual'] },
];

// Detail-local projection, not a write back to the session owner.
export function initializeTeacherCurriculum(curriculum: CurriculumUnit[]) {
  return curriculum.map(u => ({
    ...u,
    completedTopics: u.status === 'completed' ? [...u.topics] : u.status === 'current' ? [u.topics[0]] : [],
  }));
}

export const classroomDetailSession: ClassroomDetailSession = {
  readStudents: () => sessionStudents,
  readCurriculum: () => sessionCurriculum,
  replaceCurriculum: curriculum => { sessionCurriculum = curriculum; },
};
