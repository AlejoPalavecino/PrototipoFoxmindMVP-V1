import type {
  StudyConversation,
  StudyCreation,
  StudyDetail,
  StudyExam,
  StudyFolder,
  StudyPractice,
} from './study-contracts.ts';
export type StudyFolderInput = Partial<
  Pick<
    StudyFolder,
    | 'name'
    | 'subject'
    | 'academicYear'
    | 'bannerKey'
    | 'linkedClassroomId'
    | 'planFileId'
    | 'wizardStep'
    | 'units'
    | 'status'
  >
> & {
  revision?: string;
};
export type StudyAnswers = Record<string, string | string[]>;
export interface StudyCommandData {
  NEW_CONVERSATION: {
    title?: string;
  };
  RENAME_CONVERSATION: {
    conversationId: string;
    title: string;
  };
  CHAT: {
    conversationId: string;
    message: string;
    topicIds?: string[];
    sourceIds?: string[];
  };
  GENERATE: {
    kind: string;
    message?: string;
    conversationId?: string;
    topicIds?: string[];
    sourceIds?: string[];
    questionCount?: number;
    difficulty?: string;
  };
  EDIT_CREATION: {
    creationId: string;
    title: string;
    body: string;
  };
  NEW_ATTEMPT: {
    practiceId: string;
  };
  SAVE_ANSWERS: {
    practiceId: string;
    answers: StudyAnswers;
  };
  FINALIZE_PRACTICE: {
    practiceId: string;
    confirmedEmpty?: boolean;
  };
  RETRY_FEEDBACK: {
    practiceId: string;
  };
  CONFIRM_FOLDER: Record<string, never>;
  IMPORT_CLASSROOM_PLAN: {
    classroomId?: string;
  };
  ARCHIVE: Record<string, never>;
  REACTIVATE: Record<string, never>;
  DELETE: {
    confirmed: boolean;
  };
  ADD_MATERIAL: {
    fileId: string;
    title: string;
    topicIds?: string[];
  };
  EDIT_MATERIAL: {
    materialId: string;
    title: string;
    topicIds: string[];
  };
  REMOVE_MATERIAL: {
    materialId: string;
  };
  PLAN_EXAM: {
    title?: string;
    examAt: string;
    timeZone: string;
    topicIds?: string[];
    sessionCount?: number;
    availability: {
      start: string;
      minutes: number;
    }[];
    minutesPerTopic?: number;
  };
  EDIT_EXAM: {
    examId: string;
    sessions: StudyExam['sessions'];
  };
  CONFIRM_AGENDA: {
    examId: string;
    sessionIds: string[];
  };
}
export type StudyAction = keyof StudyCommandData;
export interface StudyCommandResult {
  status?: string;
  message?: string;
  missing?: string[];
  conversation?: Pick<StudyConversation, 'id' | 'title'>;
  creation?: StudyCreation;
  practice?: StudyPractice;
  exam?: StudyExam;
}
export interface StudyCommandResponse {
  folder: StudyFolder;
  result?: StudyCommandResult;
}
export type StudyRun = <A extends StudyAction>(
  action: A,
  data?: StudyCommandData[A],
  requestId?: string,
) => Promise<StudyCommandResponse>;
export type StudyCommand = <A extends StudyAction>(
  action: A,
  data?: StudyCommandData[A],
  requestId?: string,
) => Promise<StudyCommandResponse | false>;
export interface StudyRevisionPort {
  command: <A extends StudyAction>(
    id: string,
    revision: string,
    action: A,
    data?: StudyCommandData[A],
    requestId?: string,
  ) => Promise<StudyCommandResponse>;
  get: (id: string) => Promise<StudyDetail>;
}
