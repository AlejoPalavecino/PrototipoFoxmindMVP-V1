import type { FileState } from './materials.ts';
import type { ActivitySummary, ActivityDetail } from './activities.ts';

export interface AttemptEditor { token: string; epoch: string }

export interface QuestionAnswer { questionId: string; text: string | null; optionIds: string[]; savedAt: string }

export interface AnswerConfirmation { revision: string; answer: QuestionAnswer }

export interface AttemptSessionData {
  activity: ActivityDetail; expected: boolean; eligibilityReason: string | null; archived: boolean; serverTime: string;
  reception: { deadlineAt: string | null; open: boolean; late: boolean }; canStart: boolean; canTransfer: boolean;
  unansweredCount?: number;
  attempt: { id: string; number: number; status: 'DRAFT' | 'SUBMITTED'; openedAt: string; submittedAt: string | null;
    appliedDeadlineAt: string | null; submittedLate: boolean | null; epoch: string; revision: string;
    attachments?: AttemptAttachment[]; practicalResponse?:string;
    answers: QuestionAnswer[] } | null;
  editor?: AttemptEditor;
}

export interface AttemptAttachment extends FileState {
  extension: string; sizeBytes: string; selected: boolean;
}

export interface AssignmentReceipt {
  id: string; number: number; submittedAt: string; appliedDeadlineAt: string | null; submittedLate: boolean;
  firstName: string; lastName: string; attachments: AttemptAttachment[];
}

export interface ActivityEligibilityData {
  revision: string; published: boolean; students: { studentId: string; firstName: string; lastName: string;
    expected: boolean; reason: string | null; individualDeadlineAt: string | null }[];
}

export interface AttemptHistoryRow {
  gradePublished?: boolean;
  id: string; number: number; status: 'DRAFT' | 'SUBMITTED'; openedAt: string; submittedAt: string | null;
  appliedDeadlineAt: string | null; individualDeadlineAt: string | null; submittedLate: boolean | null;
  studentId: string; firstName: string; lastName: string; currentMember: boolean;
}

export interface AttemptHistoryData {
  activity: ActivitySummary; attempts: AttemptHistoryRow[]; revision?: string; canReopen?: boolean;
  delivered?: boolean; pendingResubmission?: boolean;
}
