import type { AiConfiguration } from './configuration-types.ts';
import type { AiExecutionTask, AiExecutionSnapshot } from '../../../../../src/core/contracts/ai-execution.ts';
import { defaultExecutionSnapshot, parseExecutionSnapshot } from './execution-snapshot.ts';
import { aiTasks, executionFailure } from './text-profiles.ts';

export function readExecutionConfiguration(configuration: AiConfiguration, env: Record<string, string | undefined>): AiConfiguration {
  const enabled = env.AI_ANTHROPIC_ENABLED;
  if (enabled !== undefined && enabled !== 'true' && enabled !== 'false') throw executionFailure();
  if (enabled === 'true') {
    const key = env.AI_ANTHROPIC_API_KEY;
    if (!key?.trim() || /[\u0000-\u001f\u007f]/u.test(key)) throw executionFailure();
    configuration.anthropicApiKey = key.trim();
  }
  if (env.AI_TEXT_PROFILES_JSON === undefined) return configuration;
  try {
    if (Buffer.byteLength(env.AI_TEXT_PROFILES_JSON) > 20_000) throw executionFailure();
    const input: unknown = JSON.parse(env.AI_TEXT_PROFILES_JSON);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw executionFailure();
    const profiles: Partial<Record<AiExecutionTask, AiExecutionSnapshot>> = {};
    const allowed = ['provider', 'model', 'profileVersion', 'maxInputTokens', 'maxOutputTokens', 'deadlineMs', 'inputUsdPerMillion', 'outputUsdPerMillion'];
    for (const [name, value] of Object.entries(input)) {
      if (!aiTasks.includes(name as AiExecutionTask) || !value || typeof value !== 'object' || Array.isArray(value)
        || Object.keys(value).some(key => !allowed.includes(key))) throw executionFailure();
      const task = name as AiExecutionTask, base = defaultExecutionSnapshot(configuration, task), patch = value as Record<string, unknown>;
      const profile = parseExecutionSnapshot({ ...base, ...patch, profileId: `${task}-configured` }, task);
      if ((profile.provider !== base.provider || profile.model !== base.model)
        && (!Object.hasOwn(patch, 'inputUsdPerMillion') || !Object.hasOwn(patch, 'outputUsdPerMillion'))) throw executionFailure();
      if (profile.provider === 'anthropic' && !configuration.anthropicApiKey) throw executionFailure();
      profiles[task] = profile;
    }
    configuration.executionProfiles = profiles;
    return configuration;
  } catch { throw executionFailure(); }
}
