

export type ActivityType = 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';

export interface ActivityQuestion {
  id?: string;
  type: 'DEVELOPMENT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  prompt: string;
  points: string;
  scoringRule?: 'EXACT' | 'PARTIAL' | null;
  options: { id?: string; text: string; correct?: boolean }[];
}

export interface ActivitySummary {
  studentState?:'PENDING'|'CLOSED'|'DRAFT'|'RESUBMISSION'|'SUBMITTED'|'REVIEWED'|'READ_ONLY';
  pendingReviewCount?:number;
  id: string; type: ActivityType; title: string | null; unitId: string | null; topicId: string | null; topicIds: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'; publishedAt: string | null; deadlineAt: string | null;
  allowLate: boolean; locked: boolean; zone: string;
}

export interface ActivityDetail extends ActivitySummary {
  objective?: string | null; teacherComment?: string | null;
  evaluationRubric?: import('../domain/grading/evaluation-rubric.ts').EvaluationRubric;
  aiGradingRubric?: string;
  instructions: string | null; attachmentRequired: boolean; questions: ActivityQuestion[];
  instructionFiles: { id: string; name: string; extension: string; ready: boolean }[];
  materials: { id: string; title: string; fileId: string; extension: string }[];
}

export interface ActivityData { revision: string; preview: boolean; activity: ActivityDetail }

export interface DeadlineResolution {
  zone: string; local: string; reason: 'NONEXISTENT' | 'AMBIGUOUS' | null;
  choices: { instant: string; offsetMinutes: number; offset: string }[];
}
