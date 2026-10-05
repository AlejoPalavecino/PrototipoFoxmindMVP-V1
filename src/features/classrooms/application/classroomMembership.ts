import type { Classroom, ClassroomEnrollment } from '../model/Classroom';
import { classroomRepository } from '../data/inMemoryClassroomRepository';

type ClassroomJoinPlan =
  | { status: 'rejected' }
  | { status: 'duplicate'; classroom: Classroom }
  | { status: 'catalogue'; classroom: ClassroomEnrollment }
  | { status: 'generic'; classroom: Classroom };

// No mutation; the injected clock is evaluated only for generic codes.
export function resolveClassroomJoin(
  invitationCode: string,
  catalogue: Classroom[],
  enrolled: Classroom[],
  now: () => number,
): ClassroomJoinPlan {
  if (!invitationCode.trim()) return { status: 'rejected' };
  const cleanCode = invitationCode.trim().toUpperCase();
  const matched = catalogue.find(a => {
    const standardCode = `${a.course.substring(0, 3).toUpperCase()}-2026-${a.id.toUpperCase()}`;
    return standardCode === cleanCode ||
           a.id.toUpperCase() === cleanCode ||
           cleanCode.includes(a.id.toUpperCase()) ||
           cleanCode === `${a.subject.substring(0, 3).toUpperCase()}-2026-${a.course.substring(0, 2).toUpperCase()}`;
  });

  if (matched) {
    const alreadyIn = enrolled.some(c => c.id === matched.id || (c.subject.toLowerCase() === matched.subject.toLowerCase() && c.course.toLowerCase() === matched.course.toLowerCase()));
    if (alreadyIn) return { status: 'duplicate', classroom: matched };
    return { status: 'catalogue', classroom: {
      id: matched.id,
      subject: matched.subject,
      course: matched.course,
      color: matched.color,
      teacherName: matched.teacherName || 'Prof. Titular',
      activeTasks: matched.activeTasks ?? 1,
      studentsCount: matched.studentsCount || 28,
      progress: 0,
      avgGrade: 0,
    } };
  }

  // Every nonblank unmatched code still succeeds; this is not code validation.
  const subject = cleanCode.includes('LIT') ? 'Literatura' :
                  cleanCode.includes('MAT') ? 'Matemáticas' :
                  cleanCode.includes('BIO') || cleanCode.includes('CIE') ? 'Ciencias Naturales' :
                  cleanCode.includes('HIS') ? 'Historia Contemporánea' : 'Materia Vinculada';
  const course = cleanCode.includes('3') ? '3° Año A' : cleanCode.includes('2') ? '2° Año B' : '1° Año A';
  return { status: 'generic', classroom: {
    id: `aula-code-${now()}`,
    subject,
    course,
    color: subject.includes('Lit') ? 'bg-fox-purple' : subject.includes('Mat') ? 'bg-fox-orange' : subject.includes('Cien') ? 'bg-fox-green' : 'bg-fox-blue',
    activeTasks: 1,
    studentsCount: 26,
    pendingSubmissions: 0,
    avgGrade: 0,
    progress: 0,
    schedule: ['Lunes 08:00', 'Miércoles 10:30'],
    teacherName: 'Prof. Titular',
    nextClass: 'Próxima clase',
    lastActivity: 'Recién unida',
  } };
}

// The UI snapshot (not the repository) controls the catalogue duplicate toast.
export function joinClassroomByCode(invitationCode: string, enrolled: Classroom[], now = Date.now) {
  const result = resolveClassroomJoin(invitationCode, classroomRepository.readCatalogue(), enrolled, now);
  if (result.status === 'rejected' || result.status === 'duplicate') return result;
  const added = classroomRepository.add(result.classroom);
  // Generic joins historically report success even when add returned an existing record.
  return result.status === 'catalogue' ? { ...result, classroom: added } : result;
}
