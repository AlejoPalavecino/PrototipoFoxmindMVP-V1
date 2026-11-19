export { SHARED_STUDY_STRATEGY_MAX_CHARS } from '../domain/study/shared-strategy.ts';

export interface SharedStudyStrategy {
  id: string;
  text: string;
}

export interface StudentSharedStudyStrategy extends SharedStudyStrategy {
  classroomId: string;
}

export interface SharedStudyStrategyView {
  strategy: StudentSharedStudyStrategy | null;
}

export interface PutSharedStudyStrategy {
  classroomId: string;
  text: string;
}
