import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotForTask, parseExecutionSnapshot, configurationForJob, configuredExecutionProfiles } from '../apps/api/src/platform/ai/execution-snapshot.ts';
const base = () => ({ model: 'synthetic-gemini', maxInputTokens: 1000, maxOutputTokens: 100, deadlineMs: 5000,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2, dailyBudgetUsd: 10, dailyGlobalRequests: 20, apiKey: 'PRIVATE_MARKER' });
test('snapshot whitelists identity, limits and prices without credentials or content', () => {
  const config = { ...base(), prompt: 'PRIVATE_MARKER' }, profile = snapshotForTask(config, 'study');
  assert.equal(profile.provider, 'gemini'); assert.equal(profile.model, config.model);
  assert.equal(JSON.stringify(profile).includes('PRIVATE_MARKER'), false);
  assert.deepEqual(parseExecutionSnapshot(JSON.parse(JSON.stringify(profile)), 'study'), profile);
  assert.equal(Object.keys(configuredExecutionProfiles(config)).length, 6);
});
test('job keeps provider model and prices after configuration changes, retaining current global caps', () => {
  const before = base(), snapshot = snapshotForTask(before, 'activities');
  const changed = { ...base(), model: 'synthetic-new', maxOutputTokens: 500, deadlineMs: 10000,
    inputUsdPerMillion: 10, outputUsdPerMillion: 20, dailyBudgetUsd: 3 };
  const job = configurationForJob(changed, snapshot, 'activities');
  assert.equal(job.model, before.model); assert.equal(job.maxOutputTokens, 100); assert.equal(job.deadlineMs, 5000);
  assert.equal(job.inputUsdPerMillion, 1); assert.equal(job.outputUsdPerMillion, 2); assert.equal(job.dailyBudgetUsd, 3);
  assert.equal(changed.model, 'synthetic-new');
});
test('legacy jobs resolve persisted Gemini baseline even when task configuration changes', () => {
  const legacy = snapshotForTask(base(), 'foxy'), selected = { ...legacy, provider: 'anthropic', model: 'synthetic-claude', inputUsdPerMillion: 4 };
  const config = { ...base(), executionProfiles: { foxy: selected }, legacyExecutionProfiles: { foxy: legacy } };
  assert.equal(configurationForJob(config, null, 'foxy').model, legacy.model);
  assert.equal(configurationForJob(config, selected, 'foxy').model, 'synthetic-claude');
  assert.equal(snapshotForTask(config, 'foxy').provider, 'anthropic');
});
test('invalid identity, wrong task or unexpected secret fields fail closed', () => {
  const original = snapshotForTask(base(), 'grading');
  for (const patch of [{ apiKey: 'PRIVATE_MARKER' }, { provider: 'other' }, { task: 'study' }, { maxInputTokens: 0 },
    { inputUsdPerMillion: -1 }, { deadlineMs: NaN }, { format: 'ai-execution-v0' }, { promptVersion: 'other' }]) {
    assert.throws(() => parseExecutionSnapshot({ ...original, ...patch }, 'grading'), { code: 'AI_UNAVAILABLE' });
  }
});
test('configuration keeps Gemini by default and requires explicit provider credentials and model tariffs', async () => {
  const { readExecutionConfiguration } = await import('../apps/api/src/platform/ai/execution-configuration.ts');
  assert.deepEqual(readExecutionConfiguration(base(), {}), base());
  const patch = { study: { provider: 'anthropic', model: 'synthetic-claude', inputUsdPerMillion: 3, outputUsdPerMillion: 8 } };
  assert.throws(() => readExecutionConfiguration(base(), { AI_TEXT_PROFILES_JSON: JSON.stringify(patch) }));
  const configured = readExecutionConfiguration(base(), { AI_ANTHROPIC_ENABLED: 'true', AI_ANTHROPIC_API_KEY: 'PRIVATE_MARKER', AI_TEXT_PROFILES_JSON: JSON.stringify(patch) });
  assert.equal(configured.executionProfiles.study.provider, 'anthropic');
  assert.equal(JSON.stringify(snapshotForTask(configured, 'study')).includes('PRIVATE_MARKER'), false);
  for (const input of [{ unknown: {} }, { study: { apiKey: 'PRIVATE_MARKER' } }, { study: { model: 'new' } }, { study: { provider: 'other' } }])
    assert.throws(() => readExecutionConfiguration(base(), { AI_TEXT_PROFILES_JSON: JSON.stringify(input) }));
  assert.throws(() => readExecutionConfiguration(base(), { AI_ANTHROPIC_ENABLED: '1' }));
});
