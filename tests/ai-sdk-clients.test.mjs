import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Constructor-only fixture: no SDK transport, credentials, or external requests.
const sdkUrl = 'synthetic:gemini-sdk-clients';
registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === '@google/genai' ? { url: sdkUrl, shortCircuit: true } : nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url !== sdkUrl) return nextLoad(url, context);
    return { format: 'module', shortCircuit: true, source: `
      export const constructions = [];
      export let operations = 0;
      export class GoogleGenAI {
        constructor(options) {
          constructions.push(options);
          this.models = {
            countTokens() { operations++; throw new Error('UNEXPECTED_OPERATION'); },
            generateContent() { operations++; throw new Error('UNEXPECTED_OPERATION'); },
          };
        }
      }
    ` };
  },
});
const sdk = await import('@google/genai');
const { getGeminiClient } = await import('../apps/api/src/platform/ai/sdk-clients.ts');
const configuration = () => ({ apiKey: 'synthetic-fixture', deadlineMs: 1200, model: 'synthetic-model',
  maxInputTokens: 1000, maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 2 });

test('Gemini client reuses configuration identity without dispatch and preserves SDK options', () => {
  const config = configuration(), before = sdk.constructions.length;
  const client = getGeminiClient(config);
  assert.equal(getGeminiClient(config), client);
  assert.equal(sdk.constructions.length, before + 1);
  const options = sdk.constructions.at(-1);
  assert.ok(options.apiKey === config.apiKey, 'constructor receives the configured credential');
  assert.equal(options.vertexai, false);
  assert.deepEqual(options.httpOptions, { retryOptions: { attempts: 1 }, timeout: 1200 });
  assert.equal(sdk.operations, 0);
});

test('Gemini client separates configuration objects and invalidates changed credentials or deadline', () => {
  const config = configuration(), first = getGeminiClient(config);
  assert.notEqual(getGeminiClient({ ...config }), first);
  assert.notEqual(getGeminiClient({ ...config, apiKey: 'synthetic-other' }), first);
  config.apiKey = 'synthetic-replacement';
  const replaced = getGeminiClient(config);
  assert.notEqual(replaced, first);
  assert.equal(getGeminiClient(config), replaced);
  config.deadlineMs = 2400;
  const changedDeadline = getGeminiClient(config);
  assert.notEqual(changedDeadline, replaced);
  assert.equal(sdk.constructions.at(-1).httpOptions.timeout, 2400);
  config.model = 'synthetic-other-model';
  assert.equal(getGeminiClient(config), changedDeadline);
  assert.equal(sdk.operations, 0);
});

test('text factories share the configured SDK client and retain injectable adapters', async () => {
  const [{ createGeminiExtractionAdapter }, { createGeminiActivityGenerationAdapter },
    { createStudentAiProvider }, { createGeminiFoxyTextAdapter }] = await Promise.all([
    import('../apps/api/src/modules/curriculum/generation/infrastructure/providers/gemini-adapter.ts'),
    import('../apps/api/src/modules/activities/generation/infrastructure/providers/activity-adapter.ts'),
    import('../apps/api/src/modules/grading/student-analysis/infrastructure/student-ai/provider.ts'),
    import('../apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-adapter.ts'),
  ]);
  const config = configuration(), before = sdk.constructions.length;
  const client = getGeminiClient(config);
  const extraction = createGeminiExtractionAdapter(config);
  const activity = createGeminiActivityGenerationAdapter(config);
  const student = createStudentAiProvider(config);
  const foxy = createGeminiFoxyTextAdapter(config);
  assert.notEqual(extraction.client, client, 'task wrapper is distinct from the shared raw SDK');
  for (const wrapper of [extraction.client, activity.options.client, student.client, foxy.options.client])
    assert.equal(typeof wrapper.models.countForGeneration, 'function');
  assert.equal(new Set([extraction.client, activity.options.client, student.client, foxy.options.client]).size, 4,
    'preflight state stays in its execution wrapper');
  assert.equal(sdk.constructions.length, before + 1);
  assert.equal(sdk.operations, 0);
});
