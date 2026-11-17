import type { AcademicRuntime } from './academic-composition.ts';
import type { ClassroomPorts } from '../modules/classrooms/access/application/runtime-ports.ts';

export const ACADEMIC_FOXY_ACCESS = Symbol('ACADEMIC_FOXY_ACCESS');
export const ACADEMIC_STUDENT_PROGRESS = Symbol('ACADEMIC_STUDENT_PROGRESS');
export const ACADEMIC_ACTIVITY_ACCESS = Symbol('ACADEMIC_ACTIVITY_ACCESS');

export type AcademicFoxyAccess = Pick<AcademicRuntime['access'], 'run' | 'classroom'>;
export type AcademicStudentProgress = Pick<AcademicRuntime['grading']['progress'], 'progressView'>;
export interface AcademicActivityAccess {
  ports: Pick<ClassroomPorts, 'database' | 'authenticate'>;
  classroom: AcademicRuntime['access']['classroom'];
}

export function academicFoxyAccess(runtime: AcademicRuntime): AcademicFoxyAccess {
  return { run: runtime.access.run.bind(runtime.access), classroom: runtime.access.classroom.bind(runtime.access) };
}

export function academicStudentProgress(runtime: AcademicRuntime): AcademicStudentProgress {
  const progress = runtime.grading.progress;
  return { progressView: progress.progressView.bind(progress) };
}

export function academicActivityAccess(runtime: AcademicRuntime): AcademicActivityAccess {
  const { ports } = runtime.access;
  return {
    ports: { database: ports.database, authenticate: ports.authenticate.bind(ports) },
    classroom: runtime.access.classroom.bind(runtime.access),
  };
}
