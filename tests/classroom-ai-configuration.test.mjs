import test from 'node:test';
import assert from 'node:assert/strict';

const ai = () => import('../apps/api/src/ai/index.ts');
export const aiEnv = () => ({
  AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'gemini-test-fixture',
  AI_API_KEY: 'synthetic-test-key-only', AI_DAILY_ACTOR_REQUESTS: '5',
  AI_DAILY_GLOBAL_REQUESTS: '20', AI_MAX_INPUT_TOKENS: '100000', AI_MAX_OUTPUT_TOKENS: '16384',
  AI_DAILY_BUDGET_USD: '10', AI_INPUT_USD_PER_MILLION: '1', AI_OUTPUT_USD_PER_MILLION: '2',
  AI_DEADLINE_MS: '90000', AI_MAX_CONCURRENCY: '2', AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000',
});

test('C2 absent/disabled capability keeps manual operation usable without a provider', async () => {
  const { readAiConfiguration } = await ai();
  assert.equal(readAiConfiguration({}), null);
  assert.equal(readAiConfiguration({ AI_ENABLED: 'false' }), null);
  const config = readAiConfiguration(aiEnv());
  assert.equal(config.model, 'gemini-test-fixture');
  assert.equal(config.maxInputTokens, 100000);
  assert.equal(config.maxOutputTokens, 16384);
  assert.equal(config.deadlineMs, 90000);
});

test('C2 enabled configuration fails closed for missing backend/model/key/quota/pricing', async () => {
  const { readAiConfiguration } = await ai();
  for (const key of Object.keys(aiEnv()).filter(key => key !== 'AI_ENABLED')) {
    const env = aiEnv(); delete env[key];
    assert.throws(() => readAiConfiguration(env), { code: 'AI_UNAVAILABLE' }, key);
  }
  const patches = [{ AI_ENABLED: 'yes' }, { AI_BACKEND: 'vertex' }, { AI_MODEL: ' ' },
    { AI_API_KEY: '' }, { AI_DAILY_ACTOR_REQUESTS: '0' }, { AI_DAILY_GLOBAL_REQUESTS: '-1' },
    { AI_MAX_INPUT_TOKENS: 'NaN' }, { AI_MAX_OUTPUT_TOKENS: '1.5' },
    { AI_DAILY_BUDGET_USD: '0' }, { AI_INPUT_USD_PER_MILLION: '-1' },
    { AI_OUTPUT_USD_PER_MILLION: 'Infinity' }, { AI_DEADLINE_MS: '0' },
    { AI_MAX_CONCURRENCY: '0' }, { AI_MAX_DISPATCHES: '0' }, { AI_MAX_JOB_AGE_MS: '-1' }];
  for (const patch of patches) assert.throws(() => readAiConfiguration({ ...aiEnv(), ...patch }), { code: 'AI_UNAVAILABLE' });
});
