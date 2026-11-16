export type FoxyContext = { kind: 'GENERAL' } | { kind: 'CLASSROOM'; classroomId: string };
export type FoxyPurpose = 'CHAT' | 'STUDY_MATERIAL' | 'REVIEW' | 'SUMMARY' | 'ACTIVITY_IDEAS' | 'LESSON_PLAN' | 'RUBRIC';
export interface FoxySelection { mode?: 'ALL_CLASSROOM'; topicIds: string[]; sourceIds: string[] }
export interface CarryFoxyAttachments { sourceConversationId: string; sourceRevision: string; attachmentIds: string[] }
export interface CreateFoxyConversation { requestId: string; title: string; context: FoxyContext; carryAttachments?: CarryFoxyAttachments }
export interface SendFoxyMessage {
  requestId: string;
  revision: string;
  purpose: FoxyPurpose;
  text: string;
  selection: FoxySelection;
}
