import type { AiConfiguration } from './configuration-types.ts';
import type { AiTask, AiTextProfile, AiTextTransport } from './text-contract.ts';
import type { AiExecutionSnapshot } from '../../../../../src/core/contracts/ai-execution.ts';

export const aiTasks: readonly AiTask[] = ['curriculum', 'activities', 'analysis', 'grading', 'foxy', 'study'];
export function executionFailure(code = 'AI_UNAVAILABLE'): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}
export function validateTextProfile(profile: AiTextProfile): void {
  if (!profile || !aiTasks.includes(profile.task) || !['gemini', 'anthropic'].includes(profile.provider)
    || !/^[a-z][a-z0-9-]{0,63}$/u.test(profile.id) || !/^[a-zA-Z0-9._-]{1,40}$/u.test(profile.version)
    || typeof profile.model !== 'string' || !/^[a-zA-Z0-9._/-]{1,150}$/u.test(profile.model)
    || !Array.isArray(profile.capabilities) || !profile.capabilities.includes('text')
    || profile.capabilities.some(value => !['text', 'pdf', 'json'].includes(value))
    || [profile.maxInputTokens, profile.maxOutputTokens, profile.deadlineMs, profile.maxDocumentBytes]
      .some(value => !Number.isSafeInteger(value) || value <= 0)
    || profile.deadlineMs > 2_147_483_647) throw executionFailure();
}
export function createDefaultTextProfile(configuration: Pick<AiConfiguration, 'model' | 'maxInputTokens' | 'maxOutputTokens' | 'deadlineMs'>, task: AiTask): AiTextProfile {
  const profile: AiTextProfile = { id: `${task}-default`, version: '1', task, provider: 'gemini', model: configuration.model,
    capabilities: ['text', 'pdf', 'json'], maxInputTokens: configuration.maxInputTokens,
    maxOutputTokens: configuration.maxOutputTokens, deadlineMs: configuration.deadlineMs, maxDocumentBytes: task === 'grading' ? 400_000_000 : 20_000_000 };
  validateTextProfile(profile);
  return profile;
}
export function textProfileForSnapshot(snapshot: AiExecutionSnapshot): AiTextProfile {
  const profile: AiTextProfile = { id: snapshot.profileId, version: snapshot.profileVersion, task: snapshot.task,
    provider: snapshot.provider, model: snapshot.model, capabilities: ['text', 'pdf', 'json'],
    maxInputTokens: snapshot.maxInputTokens, maxOutputTokens: snapshot.maxOutputTokens,
    deadlineMs: snapshot.deadlineMs, maxDocumentBytes: snapshot.maxDocumentBytes };
  validateTextProfile(profile);
  return profile;
}
export function createTextRegistry(profiles: readonly AiTextProfile[], transports: readonly AiTextTransport[]) {
  const byProvider = new Map(transports.map(transport => [transport.provider, transport]));
  if (byProvider.size !== transports.length) throw executionFailure();
  const byTask = new Map<AiTask, { profile: AiTextProfile; transport: AiTextTransport }>();
  for (const profile of profiles) {
    validateTextProfile(profile);
    const transport = byProvider.get(profile.provider);
    if (!transport || byTask.has(profile.task)) throw executionFailure();
    byTask.set(profile.task, { profile: Object.freeze({ ...profile, capabilities: Object.freeze([...profile.capabilities]) }), transport });
  }
  return { resolve(task: AiTask, expected?: Pick<AiTextProfile, 'provider' | 'model' | 'version'>) {
    const selected = byTask.get(task);
    if (!selected || (expected && (selected.profile.provider !== expected.provider
      || selected.profile.model !== expected.model || selected.profile.version !== expected.version))) throw executionFailure();
    return { ...selected };
  } };
}
