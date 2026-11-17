import type { useStudyGeneration } from '../model/use-study-generation';
import type { useStudyChat } from '../conversations/use-study-chat';

export type StudyGenerationPresentation = Pick<
  ReturnType<typeof useStudyGeneration>,
  | 'local'
  | 'blocked'
  | 'requests'
  | 'cancelling'
  | 'submitting'
  | 'error'
  | 'stop'
  | 'retry'
  | 'retryLocal'
>;
export type StudyChatPresentation = Pick<
  ReturnType<typeof useStudyChat>,
  'pending' | 'operation' | 'cancelling' | 'canStop' | 'send' | 'stop'
>;
