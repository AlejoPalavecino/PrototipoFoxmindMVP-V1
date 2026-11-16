import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleGenAI } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { createGeminiTextTransport } from '../.build/api/apps/api/src/platform/ai/gemini-text-transport.js';
import { createAnthropicTextTransport } from '../.build/api/apps/api/src/platform/ai/anthropic-text-transport.js';
import { geminiUsage, anthropicUsage } from '../.build/api/apps/api/src/platform/ai/usage.js';

const schema = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false };
const request = () => ({ model: 'synthetic-model', system: 'synthetic system', schema,
  maxOutputTokens: 123, signal: new AbortController().signal,
  messages: [{ role: 'user', parts: [{ kind: 'text', text: 'question' }, { kind: 'pdf', bytes: new Uint8Array([37, 80, 68, 70]) }] },
    { role: 'assistant', parts: [{ kind: 'text', text: 'history' }] }] });

test('unconfigured transports reject credentials instead of implicitly using environment keys', () => {
  for (const create of [createGeminiTextTransport, createAnthropicTextTransport]) {
    for (const apiKey of ['', ' ', undefined]) assert.throws(() => create({ apiKey, deadlineMs: 1000 }), /Invalid AI credential/);
  }
});

test('Gemini official serializer preserves system, PDF, JSON and bounded single dispatch', async () => {
  const calls = [];
  const client = new GoogleGenAI({ apiKey: 'synthetic', httpOptions: { fetch: async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    return Response.json(String(url).includes('countTokens') ? { totalTokens: 47 } : {
      candidates: [{ content: { parts: [{ text: '{"answer":"ok"}' }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 47, candidatesTokenCount: 7, thoughtsTokenCount: 3, cachedContentTokenCount: 5 },
    });
  } } });
  const transport = createGeminiTextTransport({ apiKey: 'synthetic', deadlineMs: 1500, client });
  assert.equal(calls.length, 0);
  assert.equal(transport.provider, 'gemini');
  assert.equal(await transport.count(request()), 47);
  const result = await transport.generate(request());
  assert.deepEqual(result, { text: '{"answer":"ok"}', finish: 'stop', usage: { inputTokens: 47, outputTokens: 10, reasoningTokens: 3, cachedInputTokens: 5 } });
  assert.equal(calls.length, 2);
  assert.equal(JSON.stringify(calls[0].body).includes('synthetic system'), true);
  assert.equal(JSON.stringify(calls[0].body).includes('additionalProperties'), true);
  assert.equal(calls[0].body.systemInstruction, undefined);
  assert.equal(calls[1].body.systemInstruction.parts[0].text, 'synthetic system');
  assert.equal(calls[1].body.contents[0].parts[1].inlineData.data, 'JVBERg==');
  assert.equal(calls[1].body.contents[1].role, 'model');
  assert.deepEqual(calls[1].body.generationConfig.responseJsonSchema, schema);
  assert.equal(calls[1].body.generationConfig.maxOutputTokens, 123);
  assert.equal(calls[1].body.generationConfig.candidateCount, 1);
  assert.equal(calls[1].body.generationConfig.temperature, 0);
});

test('Anthropic official serializer preserves system, PDF, JSON and cache billing', async () => {
  const calls = [];
  const client = new Anthropic({ apiKey: 'synthetic', fetch: async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    return Response.json(String(url).includes('count_tokens') ? { input_tokens: 47 } : {
      id: 'synthetic', type: 'message', role: 'assistant', model: 'synthetic-model', stop_reason: 'end_turn',
      content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text: '{"answer":"ok"}' }],
      usage: { input_tokens: 40, output_tokens: 10, cache_creation_input_tokens: 2, cache_read_input_tokens: 5,
        output_tokens_details: { thinking_tokens: 3 } },
    });
  } });
  const transport = createAnthropicTextTransport({ apiKey: 'synthetic', deadlineMs: 1500, client });
  assert.equal(calls.length, 0);
  assert.equal(transport.provider, 'anthropic');
  assert.equal(await transport.count(request()), 47);
  assert.deepEqual(await transport.generate(request()), { text: '{"answer":"ok"}', finish: 'stop', usage: {
    inputTokens: 47, outputTokens: 10, reasoningTokens: 3, cachedInputTokens: 5,
  } });
  assert.equal(calls.length, 2);
  for (const { body } of calls) {
    assert.equal(body.system, 'synthetic system');
    assert.deepEqual(body.output_config.format, { type: 'json_schema', schema });
    assert.equal(body.messages[0].content[1].source.data, 'JVBERg==');
  }
  assert.equal(calls[1].body.max_tokens, 123);
});

test('usage preserves unknown metrics and rejects invalid counters', () => {
  const unknown = { inputTokens: null, outputTokens: null, reasoningTokens: null, cachedInputTokens: null };
  assert.deepEqual(geminiUsage(undefined), unknown);
  assert.deepEqual(anthropicUsage(undefined), unknown);
  assert.deepEqual(geminiUsage({ promptTokenCount: -1, candidatesTokenCount: NaN, thoughtsTokenCount: -3, cachedContentTokenCount: 1.5 }), unknown);
  assert.equal(geminiUsage({ thoughtsTokenCount: 5 }).outputTokens, null);
  assert.equal(anthropicUsage({ output_tokens: 10, output_tokens_details: { thinking_tokens: 3 } }).outputTokens, 10);
  assert.equal(anthropicUsage({ input_tokens: 2, cache_read_input_tokens: -1 }).inputTokens, null);
  assert.equal(anthropicUsage({ input_tokens: 2, cache_read_input_tokens: null }).inputTokens, null);
  assert.equal(anthropicUsage({ input_tokens: 2 }).inputTokens, 2);
  assert.equal(geminiUsage({ candidatesTokenCount: 2, thoughtsTokenCount: null }).outputTokens, null);
  assert.equal(geminiUsage({ candidatesTokenCount: 0 }).outputTokens, 0);
  assert.equal(geminiUsage({ candidatesTokenCount: Number.MAX_SAFE_INTEGER, thoughtsTokenCount: 1 }).outputTokens, null);
});

test('Gemini excludes thought text and normalizes blocked, length and unknown finishes', async () => {
  for (const [reason, expected] of [['SAFETY', 'blocked'], ['MAX_TOKENS', 'length'], ['unknown', 'other']]) {
    const client = { models: { generateContent: async () => ({
      get text() { throw new Error('SDK convenience getter must not be used'); },
      candidates: [{ finishReason: reason, content: { parts: [{ text: 'private reasoning', thought: true }, { text: 'public' }] } }],
    }) } };
    const result = await createGeminiTextTransport({ apiKey: 'synthetic', deadlineMs: 10, client }).generate(request());
    assert.equal(result.finish, expected);
    assert.equal(result.text, 'public');
  }
  const client = { models: { generateContent: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }) } };
  assert.equal((await createGeminiTextTransport({ apiKey: 'synthetic', deadlineMs: 10, client }).generate(request())).finish, 'blocked');
});

test('Anthropic normalizes refusal, stop and unknown finishes without reasoning content', async () => {
  for (const [reason, expected] of [['refusal', 'blocked'], ['stop_sequence', 'stop'], ['tool_use', 'other']]) {
    const client = { messages: { create: async () => ({ content: [{ type: 'thinking', thinking: 'private' }, { type: 'text', text: 'public' }], stop_reason: reason }) } };
    const result = await createAnthropicTextTransport({ apiKey: 'synthetic', deadlineMs: 10, client }).generate(request());
    assert.equal(result.finish, expected);
    assert.equal(result.text, 'public');
  }
});

for (const provider of ['gemini', 'anthropic']) {
  test(`${provider} forwards cancellation, timeout, disables retries and validates counts`, async () => {
    let captured;
    const input = request();
    const client = provider === 'gemini' ? { models: {
      countTokens: async arg => { captured = arg; return { totalTokens: -1 }; },
      generateContent: async arg => { captured = arg; return { text: '', candidates: [{ finishReason: 'MAX_TOKENS' }] }; },
    } } : { messages: {
      countTokens: async (arg, options) => { captured = { arg, options }; return { input_tokens: -1 }; },
      create: async (arg, options) => { captured = { arg, options }; return { content: [], stop_reason: 'max_tokens' }; },
    } };
    const factory = provider === 'gemini' ? createGeminiTextTransport : createAnthropicTextTransport;
    const transport = factory({ apiKey: 'synthetic', deadlineMs: 321, client });
    await assert.rejects(transport.count(input), /count/i);
    assert.equal((await transport.generate(input)).finish, 'length');
    if (provider === 'gemini') {
      assert.equal(captured.config.abortSignal, input.signal);
      assert.equal(captured.config.httpOptions.timeout, 321);
      assert.equal(captured.config.httpOptions.retryOptions.attempts, 1);
      assert.equal(captured.config.automaticContinuation, false);
    } else {
      assert.equal(captured.options.signal, input.signal);
      assert.equal(captured.options.timeout, 321);
      assert.equal(captured.options.maxRetries, 0);
    }
    const aborted = request();
    aborted.signal = AbortSignal.abort();
    captured = undefined;
    await assert.rejects(transport.generate(aborted));
    assert.equal(captured, undefined);
  });
  test(`${provider} SDK does not retry a 503 response`, async () => {
    let calls = 0;
    const fetch = async () => { calls++; return Response.json({ error: { message: 'synthetic unavailable', type: 'overloaded_error', code: 503 } }, { status: 503 }); };
    const client = provider === 'gemini' ? new GoogleGenAI({ apiKey: 'synthetic', httpOptions: { fetch } }) : new Anthropic({ apiKey: 'synthetic', fetch });
    const factory = provider === 'gemini' ? createGeminiTextTransport : createAnthropicTextTransport;
    await assert.rejects(factory({ apiKey: 'synthetic', deadlineMs: 321, client }).generate(request()));
    assert.equal(calls, 1);
  });
}
