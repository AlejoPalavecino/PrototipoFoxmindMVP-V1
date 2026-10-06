import type { AulaTabId } from '../../../components/aulas/ClassroomTabsNav';
import type { TeacherParticipant } from './ClassroomParticipant';

export interface CurriculumUnit {
  id: number;
  unit: string;
  status: string;
  topics: string[];
}

export interface ClassroomDetailSession {
  readStudents(): TeacherParticipant[];
  readCurriculum(): CurriculumUnit[];
  replaceCurriculum(curriculum: CurriculumUnit[]): void;
}

// Narrow only the classroom payloads we already consume; app navigation stays T6.
export interface ClassroomNavigationParams {
  openTask?: boolean;
  subject?: string;
  openAulaId?: string;
  taskTitle?: string;
  aulaId?: string;
}

export const teacherDetailInitialTab: AulaTabId = 'alumnos';
export const studentDetailInitialTab: AulaTabId = 'actividades';
