export type GradingActivityType = 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
export type GradingQuestionType = 'DEVELOPMENT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
export interface GradeRational { numerator: string; denominator: string }
export interface GradeAttachment { id: string; name: string; ready: boolean }
export interface GradeOption { id: string; text: string; correct?: boolean }
export interface GradingQuestion {
  id: string; type: GradingQuestionType; prompt: string; points: string; scoringRule?: 'EXACT' | 'PARTIAL' | null;
  options: GradeOption[]; answer: { questionId: string; text: string | null; optionIds: string[] };
  manual: boolean; manualPoints: string | null; earned: GradeRational | null; feedback: string | null;
}
export interface GradingActivity {
  id: string; type: GradingActivityType; title: string | null; unitId: string | null; topicId: string | null; topicIds: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'; publishedAt: string | null; deadlineAt: string | null;
  allowLate: boolean; locked: boolean; zone: string; aiGradingRubric?: string; instructions: string | null;
  attachmentRequired: boolean; instructionFiles: (GradeAttachment & { extension: string })[];
  materials: { id: string; title: string; fileId: string; extension: string }[]; questions: GradingQuestion[];
}
export interface GradingData {
  revision: string; archived: boolean; canSave: boolean; activity: GradingActivity;
  attempt: { id: string; number: number; submittedAt: string; submittedLate: boolean; firstName: string; lastName: string; attachments: GradeAttachment[] };
  grade: { id: string | null; isPublished: boolean; publishedAt: string | null; finalGrade: string | null; overallFeedback: string | null; pending: boolean };
}
export interface GradeCorrectionsData {
  revision: string; archived: boolean; canCorrect: boolean; grade: { id: string; finalGrade: string; publishedAt: string };
  corrections: { id: string; previousGrade: string; newGrade: string; reason: string; actor: { id: string; firstName: string; lastName: string }; correctedAt: string }[];
}
export type PublishedResultData = { status: 'pending'; attemptId: string } | {
  status: 'published'; activity: { id: string; title: string; type: GradingActivityType };
  attempt: { id: string; number: number; submittedAt: string };
  grade: { id: string; finalGrade: string; publishedAt: string; overallFeedback: string | null; isEffective: boolean };
  questions: { id: string; type: GradingQuestionType; prompt: string; points: string;
    answer: { text: string | null; selectedOptions: GradeOption[] }; earned: GradeRational; feedback: string | null }[];
  attachments: GradeAttachment[];
};
