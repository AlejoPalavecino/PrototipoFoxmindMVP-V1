import type { Classroom } from './Classroom';

export type ClassroomColor = 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'pink' | 'yellow';
export type ClassroomCreationStep = 'form' | 'analyzing' | 'review' | 'creating';
export interface ClassroomCreationTopic {
  id: string;
  name: string;
  subtopics: string[];
}
export interface ClassroomCreationForm {
  subject: string;
  year: string;
  division: string;
  observation: string;
  color: ClassroomColor;
  topics: ClassroomCreationTopic[];
}
export interface StudyPlanFile {
  name: string;
  size: string;
}
export interface CreatedCurriculumUnit {
  id: number;
  unit: string;
  status: 'current' | 'pending';
  topics: string[];
}
export interface ClassroomCreationResult {
  classroom: Classroom;
  curriculum: CreatedCurriculumUnit[];
}
