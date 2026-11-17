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
  kind: 'NOTE' | 'OUTLINE' | 'QUIZ' | 'EXERCISE' | 'MOCK_EXAM';
  topicIds: string[];
  sourceIds?: string[];
  questionCount: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'INSUFFICIENT';
  reason?: 'INTERRUPTED';
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
}
export interface StudyPractice {
  id: string;
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
  }[];
  warnings?: string[];
  conflicts?: {
    sessionId: string;
    occurrenceId: string;
    title: string;
  }[];
}
export interface StudyDetail {
  folder: StudyFolder;
  sources: StudySource[];
  conversations: StudyConversation[];
  creations: StudyCreation[];
  practices: StudyPractice[];
  exams: StudyExam[];
  memory: unknown;
}
export type StudyFolderSummary = Omit<StudyFolder, 'units' | 'materials'>;
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
