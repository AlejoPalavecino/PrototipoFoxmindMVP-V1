import type { ActivityType } from './activities.ts';

export type { GradingQuestion, GradingData, GradeCorrectionsData, PublishedResultData } from '../domain/index.ts';

export interface CompletionProgress {
  expected: number; delivered: number; pending: number; onTime: number; late: number; pendingResubmissions: number;
  percentage: string | null; emptyLabel: string | null;
}

export interface ProgressActivity {
  id: string; title: string; type: ActivityType; expected: boolean;
  firstSubmission: { id: string; number: number; submittedAt: string; appliedDeadlineAt: string | null; late: boolean } | null;
  pendingResubmission: boolean; grade: string | null;
  /** Attempt that produced the effective published grade; null without a published result. */
  publishedAttemptId?: string | null;
  /** Teacher-only status of the latest confirmed submission. Never a private grade. */
  review?: { attemptId: string; state: 'pending' | 'saved' | 'published' } | null;
}

export interface StudentProgress {
  studentId: string; firstName: string; lastName: string; currentMember: boolean;
  completion: CompletionProgress; performance: { graded: number; average: string | null }; activities: ProgressActivity[];
}

export type ProgressData = { revision: string; archived: boolean; plan: { total: number; taught: number; percentage: string | null;
  units?: { id: string; name: string; total: number; taught: number }[] } } & (
  { scope: 'classroom'; studentCount: number; students: StudentProgress[]; completion: CompletionProgress;
    performance: { gradedStudents: number; average: string | null } }
  | ({ scope: 'self' | 'member' } & StudentProgress)
);

export interface Summary {
  firstName: string; lastName: string; email?: string; division?: string; progress?: boolean;
  attempts: { id: string; activityId?: string; title: string; submittedAt: string; number: number; grade: string | null; published: boolean | null }[];
}
