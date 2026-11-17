import type { StudentAiEvidence, StudentAiProgress } from '../../../../../../../src/core/domain/grading/student-ai.ts';
export type StudentProgress = Omit<StudentAiProgress, 'activities'> & {
  activities: (StudentAiProgress['activities'][number] & { id: string; title: string })[];
};
export type PrivateReference = { ref: string; activityId: string };
export interface StudentSnapshot { evidence: StudentAiEvidence; references: PrivateReference[]; hash: string }
