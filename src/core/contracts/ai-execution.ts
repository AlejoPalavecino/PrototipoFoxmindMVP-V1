export type AiExecutionTask = 'curriculum' | 'activities' | 'analysis' | 'grading' | 'foxy' | 'study';
export interface AiExecutionSnapshot {
  format: 'ai-execution-v1';
  task: AiExecutionTask;
  provider: 'gemini' | 'anthropic';
  model: string;
  profileId: string;
  profileVersion: string;
  promptVersion: string;
  responseVersion: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  deadlineMs: number;
  maxDocumentBytes: number;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}
export interface AiExecutionSettings {
  executionProfiles?: Partial<Record<AiExecutionTask, AiExecutionSnapshot>>;
  legacyExecutionProfiles?: Partial<Record<AiExecutionTask, AiExecutionSnapshot>>;
  executionProfile?: AiExecutionSnapshot;
}
