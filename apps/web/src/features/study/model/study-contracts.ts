import type { AiBudgetRejectionCode, AiMonthlyQuotaRejection } from '../../../../../../src/core/contracts/ai-quota.ts';
import type { FoxyDiagram } from '../../../../../../src/core/domain/foxy/visual.ts';

export interface StudyTopic {
  id: string;
  title: string;
}
export interface StudyUnit {
  id: string;
  title: string;
  topics: StudyTopic[];
}
export interface StudyFolder {
  id: string;
  name: string;
  subject?: string;
  wizardStep?: number;
  academicYear: number;
  bannerKey: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  revision: string;
  linkedClassroomId: string | null;
  planFileId: string | null;
  planOrigin?: {
    classroomId: string;
    classroomRevision: string;
  };
  materials?: {
    id: string;
    title: string;
    fileId: string;
    topicIds: string[];
  }[];
  units: StudyUnit[];
}
export interface StudySource {
  kind?: 'PLAN' | 'MATERIAL';
  id: string;
  version: string;
  title: string;
  origin: 'OWN' | 'CLASSROOM';
  fileId: string;
  available: boolean;
  readable?: boolean;
  extension?: string;
}
export interface StudyGeneration {
  requestId: string;
  kind: 'EXPLANATION' | 'NOTE' | 'OUTLINE' | 'IMAGE' | 'QUIZ' | 'EXERCISE' | 'MOCK_EXAM' | 'REVIEW_PLAN';
  review?: import('../../../../../../src/core/domain/study/review.ts').StudyReviewRequest;
  topicIds: string[];
  sourceIds?: string[];
  questionCount: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'INSUFFICIENT';
  reason?: 'INTERRUPTED';
  errorCode?: AiBudgetRejectionCode;
  quota?: AiMonthlyQuotaRejection;
  missingInformation?: string[];
}
export interface StudyTurn {
  id?: string;
  role: string;
  content?: string;
  text?: string;
  sourceRefs?: {
    id: string;
    version: string;
  }[];
  generation?: StudyGeneration;
  generationRequestId?: string;
  creationId?: string;
  practiceId?: string;
  examId?: string;
}
export interface StudyConversation {
  id: string;
  title: string;
  sourceUnavailable?: boolean;
  messages?: StudyTurn[];
  turns?: StudyTurn[];
}
export interface StudyCreation {
  id: string;
  title: string;
  markdown: string;
  body?: string;
  kind: string;
  conversationId?: string;
  diagram?: FoxyDiagram;
  sourceRefs?: StudyTurn['sourceRefs'];
  sourceUnavailable?: boolean;
}
export interface StudyQuestion {
  id: string;
  prompt: string;
  type: string;
  options?: {
    id: string;
    text: string;
    label?: string;
  }[];
  explanation?: string;
  correctOptionIds?: string[];
  optionFeedback?: { optionId: string; text: string }[];
  scoringRule?: 'EXACT' | 'PARTIAL';
  sourceRefs?: { id: string; version: string }[];
}
export interface StudyPractice {
  id: string;
  previousPracticeId?: string;
  confirmedQuestionIds?: string[];
  attemptNumber?: number;
  kind?: string;
  title?: string;
  status: string;
  questions: StudyQuestion[];
  answers?: Record<string, string | string[]>;
  result?: unknown;
  feedback?: unknown;
}
export interface StudyExam {
  id: string;
  title?: string;
  examAt?: string;
  timeZone: string;
  sessions: {
    id: string;
    topicId: string;
    startAt: string;
    endAt: string;
    topicIds: string[];
    title: string;
    minutes: number;
    reminderMinutes: number | null;
    activity?: string;
  }[];
  warnings?: string[];
  guidance?: string;
  conflicts?: {
    sessionId: string;
    occurrenceId: string;
    title: string;
  }[];
}
export interface StudyDetail {
  folder: StudyFolder;
  imageGenerationAvailable?: boolean;
  sources: StudySource[];
  conversations: StudyConversation[];
  creations: StudyCreation[];
  practices: StudyPractice[];
  exams: StudyExam[];
  scheduledReviewSessions?: { sessionId: string; eventId: string }[];
  memory: unknown;
}
/** Collection card data: topics with scored practice, the weakest one, and the next review already in the Agenda. */
export type StudyFolderSummary = Omit<StudyFolder, 'units' | 'materials'> & {
  progress?: { topics: number; practicedTopics: number; weakestTopic?: { id: string; title: string } };
  nextReview?: { startAt: string; endAt: string; title: string; timeZone: string };
};
export interface StudyCollection {
  items: StudyFolderSummary[];
  classrooms: {
    id: string;
    name: string;
    academicYear: number;
    archived?: boolean;
  }[];
  covers: {
    key: string;
    label: string;
    color?: string;
  }[];
}
