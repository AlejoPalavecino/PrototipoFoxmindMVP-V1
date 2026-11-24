import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiTextTransport } from '../apps/api/src/platform/ai/gemini-text-transport.ts';
import { snapshotTextRequest } from '../apps/api/src/platform/ai/text-request.ts';
import { executeAiText } from '../apps/api/src/platform/ai/text-execution.ts';

const reply = { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 } };
function transportWith(calls) {
  return createGeminiTextTransport({ apiKey: 'synthetic', deadlineMs: 5000, client: { models: {
    countTokens: async () => ({ totalTokens: 3 }),
    generateContent: async params => { calls.push(params); return reply; },
    generateContentStream: async params => { calls.push(params); return (async function* () {
      yield { candidates: [{ content: { parts: [{ text: '{"status":"COMPLETE","title":"T","markdown":"Hola' }] } }] };
      yield { candidates: [{ content: { parts: [{ text: ' mundo"}' }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 } };
    })(); },
  } } });
}
const base = { system: 'Sistema', messages: [{ role: 'user', parts: [{ kind: 'text', text: 'Hola' }] }] };
const request = (model, tuning) => ({ ...base, ...(tuning ? { tuning } : {}), model, maxOutputTokens: 100, signal: new AbortController().signal });

test('Gemini 3 receives the requested thinking level and temperature; other models keep their defaults', async () => {
  const calls = [];
  const transport = transportWith(calls);
  await transport.generate(request('gemini-3.8-flash', { thinking: 'low', temperature: 1 }));
  assert.equal(calls[0].config.thinkingConfig.thinkingLevel, 'LOW');
  assert.equal(calls[0].config.thinkingConfig.includeThoughts, false);
  assert.equal(calls[0].config.temperature, 1);
  await transport.generate(request('gemini-2.5-flash', { thinking: 'low', temperature: 1 }));
  assert.equal(calls[1].config.thinkingConfig, undefined);
  await transport.generate(request('gemini-3.8-flash'));
  assert.equal(calls[2].config.thinkingConfig, undefined);
  assert.equal(calls[2].config.temperature, 0);
});

test('the request snapshot keeps valid tuning and rejects unknown values', () => {
  const profile = { task: 'study', capabilities: ['text', 'json'], maxDocumentBytes: 1_000_000 };
  assert.deepEqual(snapshotTextRequest({ ...base, tuning: { thinking: 'minimal' } }, profile).tuning, { thinking: 'minimal' });
  assert.equal(snapshotTextRequest(base, profile).tuning, undefined);
  assert.throws(() => snapshotTextRequest({ ...base, tuning: { thinking: 'extreme' } }, profile));
  assert.throws(() => snapshotTextRequest({ ...base, tuning: { temperature: 3 } }, profile));
  assert.throws(() => snapshotTextRequest({ ...base, tuning: { other: 1 } }, profile));
});

test('a study request with a preview streams partial text', async () => {
  const calls = [], seen = [];
  const profile = { id: 'p', version: '1', task: 'study', provider: 'gemini', model: 'gemini-3.8-flash', capabilities: ['text', 'json'],
    maxInputTokens: 1000, maxOutputTokens: 100, deadlineMs: 5000, maxDocumentBytes: 1_000_000 };
  const result = await executeAiText({ profile, transport: transportWith(calls), request: { ...base, schema: { type: 'object' } },
    preview: () => text => seen.push(text) });
  assert.equal(JSON.parse(result.text).markdown, 'Hola mundo');
  assert.ok(seen.length >= 1);
});
