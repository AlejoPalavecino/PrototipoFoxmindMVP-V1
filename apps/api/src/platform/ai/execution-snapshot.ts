import type { AiExecutionSnapshot, AiExecutionSettings, AiExecutionTask } from '../../../../../src/core/contracts/ai-execution.ts';
import { executionFailure, aiTasks } from './text-profiles.ts';

type Base = AiExecutionSettings & { model?: string; maxInputTokens?: number; maxOutputTokens?: number; deadlineMs?: number;
  inputUsdPerMillion?: number; outputUsdPerMillion?: number };
const sources = new WeakMap<object, object>();
export function executionConfigurationSource<T extends object>(configuration: T): T {
  return (sources.get(configuration) ?? configuration) as T;
}
export const legacyActivityPromptVersion = 'activity-proposal-v1';
export const previousActivityPromptVersion = 'activity-proposal-v2';
export const activityPromptVersion = 'activity-proposal-v3';
export const studyPromptVersion = 'study-v5';
export const studentAnalysisPromptVersion = 'student-report-v2';
const legacyFoxyPromptVersion = 'foxy-chat-v2';
export const previousFoxyPromptVersion = 'foxy-chat-v3';
export const priorFoxyPromptVersion = 'foxy-chat-v4';
export const previousTeachingFoxyPromptVersion = 'foxy-chat-v5';
export const previousRubricFoxyPromptVersion = 'foxy-chat-v6';
export const previousPresentationFoxyPromptVersion = 'foxy-chat-v7';
export const foxyPromptVersion = 'foxy-chat-v8';
const foxyHistoricalPromptVersions: readonly string[] = [
  legacyFoxyPromptVersion, previousFoxyPromptVersion, priorFoxyPromptVersion, previousTeachingFoxyPromptVersion, previousRubricFoxyPromptVersion,
  previousPresentationFoxyPromptVersion,
];

export function supportsFoxyPromptVersion(promptVersion: string): boolean {
  return promptVersion === foxyPromptVersion || foxyHistoricalPromptVersions.includes(promptVersion);
}

const versions: Record<AiExecutionTask, [string, string]> = {
  curriculum: ['study-plan-v1', 'study-plan-v1'], activities: [activityPromptVersion, 'activity-proposal-v1'],
  analysis: [studentAnalysisPromptVersion, 'student-report-v1'], grading: ['grading-proposal-v1', 'grading-proposal-v1'],
  foxy: [foxyPromptVersion, 'foxy-answer-v1'], study: [studyPromptVersion, 'study-v1'],
};
const historicalPrompts: Partial<Record<AiExecutionTask, readonly string[]>> = {
  analysis: ['student-report-v1'],
  activities: [legacyActivityPromptVersion, previousActivityPromptVersion],
  study: ['study-v1', 'study-v2', 'study-v3', 'study-v4'],
  foxy: foxyHistoricalPromptVersions,
};
const keys = ['format', 'task', 'provider', 'model', 'profileId', 'profileVersion', 'promptVersion', 'responseVersion',
  'maxInputTokens', 'maxOutputTokens', 'deadlineMs', 'maxDocumentBytes', 'inputUsdPerMillion', 'outputUsdPerMillion'];
export function parseExecutionSnapshot(input: unknown, task: AiExecutionTask): AiExecutionSnapshot {
  if (!aiTasks.includes(task) || !input || typeof input !== 'object' || Array.isArray(input)
    || Object.keys(input).length !== keys.length || Object.keys(input).some(key => !keys.includes(key))) throw executionFailure();
  const value = input as AiExecutionSnapshot;
  if (value.format !== 'ai-execution-v1' || value.task !== task || !['gemini', 'anthropic'].includes(value.provider)
    || typeof value.model !== 'string' || !/^[a-zA-Z0-9._/-]{1,150}$/u.test(value.model)
    || typeof value.profileId !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/u.test(value.profileId)
    || typeof value.profileVersion !== 'string' || !/^[a-zA-Z0-9._-]{1,40}$/u.test(value.profileVersion)
    || typeof value.promptVersion !== 'string'
    || (value.promptVersion !== versions[task][0] && !historicalPrompts[task]?.includes(value.promptVersion))
    || value.responseVersion !== versions[task][1]
    || [value.maxInputTokens, value.maxOutputTokens, value.deadlineMs, value.maxDocumentBytes]
      .some(number => !Number.isSafeInteger(number) || number <= 0)
    || value.deadlineMs > 2_147_483_647 || value.maxDocumentBytes > (task === 'grading' ? 400_000_000 : 20_000_000)
    || [value.inputUsdPerMillion, value.outputUsdPerMillion].some(number => !Number.isFinite(number) || number <= 0 || number > Number.MAX_SAFE_INTEGER)) throw executionFailure();
  return Object.freeze({ ...value });
}
export function defaultExecutionSnapshot(configuration: Base, task: AiExecutionTask): AiExecutionSnapshot {
  if (!aiTasks.includes(task)) throw executionFailure();
  return parseExecutionSnapshot({ format: 'ai-execution-v1', task, provider: 'gemini', model: configuration.model,
    profileId: `${task}-default`, profileVersion: '1', promptVersion: versions[task][0], responseVersion: versions[task][1],
    maxInputTokens: configuration.maxInputTokens, maxOutputTokens: configuration.maxOutputTokens, deadlineMs: configuration.deadlineMs,
    maxDocumentBytes: task === 'grading' ? 400_000_000 : 20_000_000, inputUsdPerMillion: configuration.inputUsdPerMillion, outputUsdPerMillion: configuration.outputUsdPerMillion }, task);
}
export function snapshotForTask(configuration: Base, task: AiExecutionTask): AiExecutionSnapshot {
  return parseExecutionSnapshot(configuration.executionProfiles?.[task] ?? defaultExecutionSnapshot(configuration, task), task);
}
export function configuredExecutionProfiles(configuration: Base): Record<AiExecutionTask, AiExecutionSnapshot> {
  return Object.fromEntries(aiTasks.map(task => [task, snapshotForTask(configuration, task)])) as Record<AiExecutionTask, AiExecutionSnapshot>;
}
export function configurationForJob<T extends Base>(configuration: T, input: unknown, task: AiExecutionTask): T & { executionProfile: AiExecutionSnapshot } {
  const snapshot = parseExecutionSnapshot(input ?? configuration.legacyExecutionProfiles?.[task] ?? defaultExecutionSnapshot(configuration, task), task);
  const pinned = { ...configuration, model: snapshot.model, maxInputTokens: snapshot.maxInputTokens, maxOutputTokens: snapshot.maxOutputTokens,
    deadlineMs: snapshot.deadlineMs, inputUsdPerMillion: snapshot.inputUsdPerMillion, outputUsdPerMillion: snapshot.outputUsdPerMillion,
    executionProfile: snapshot };
  sources.set(pinned, executionConfigurationSource(configuration));
  return pinned;
}
