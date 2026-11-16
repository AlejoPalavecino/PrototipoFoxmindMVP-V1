import test from 'node:test';
import assert from 'node:assert/strict';
import { getAiTextClient, countForExecution, createExecutionTransport } from '../apps/api/src/platform/ai/profile-client.ts';
import { AiError } from '../apps/api/src/platform/ai/errors.ts';
import { createGeminiExtractionAdapter } from '../apps/api/src/modules/curriculum/infrastructure/providers/gemini-adapter.ts';
import { createGeminiActivityGenerationAdapter } from '../apps/api/src/modules/activities/infrastructure/providers/activity-adapter.ts';
import { createStudentAiProvider } from '../apps/api/src/modules/grading/infrastructure/student-ai/provider.ts';
import { GeminiGradingAiProvider } from '../apps/api/src/modules/grading/infrastructure/grading-ai/provider.ts';
import { createGeminiFoxyTextAdapter } from '../apps/api/src/modules/foxy/infrastructure/providers/foxy-adapter.ts';
import { configurationForJob } from '../apps/api/src/platform/ai/execution-snapshot.ts';

const configuration = provider => ({ backend: 'gemini-developer', apiKey: 'synthetic-gemini', anthropicApiKey: provider === 'anthropic' ? 'synthetic-claude' : undefined,
  model: 'synthetic-model', deadlineMs: 1000, maxInputTokens: 1000, maxOutputTokens: 100,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2,
  executionProfile: { format: 'ai-execution-v1', task: 'foxy', provider, model: 'synthetic-model', profileId: 'foxy-test', profileVersion: '1',
    promptVersion: 'foxy-chat-v2', responseVersion: 'foxy-answer-v1', maxInputTokens: 1000, maxOutputTokens: 100,
    deadlineMs: 1000, maxDocumentBytes: 1000, inputUsdPerMillion: 1, outputUsdPerMillion: 2 } });
const request = () => ({ model: 'synthetic-model', contents: [{ role: 'user', parts: [{ text: 'Synthetic question' },
  { inlineData: { mimeType: 'application/pdf', data: 'JVBERg==' } }] }], config: {
  systemInstruction: 'Synthetic system', responseMimeType: 'application/json',
  responseJsonSchema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false },
  maxOutputTokens: 100, candidateCount: 1, temperature: 0, automaticContinuation: false,
  abortSignal: new AbortController().signal,
} });

function network(t, provider, { finish = 'stop', text = '{"answer":"ok"}', status = 200, usage = true } = {}) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    const count = String(url).includes('countTokens') || String(url).includes('count_tokens');
    if (status !== 200 && !count) return Response.json({ error: { message: 'synthetic', type: 'overloaded_error', code: status } }, { status });
    if (provider === 'gemini') return Response.json(count ? { totalTokens: 40 } : {
      candidates: [{ content: { parts: [{ text }] }, finishReason: finish === 'stop' ? 'STOP' : 'MAX_TOKENS' }],
      ...(usage ? { usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 7, thoughtsTokenCount: 3 } } : {}),
    });
    return Response.json(count ? { input_tokens: 40 } : { id: 'synthetic', role: 'assistant', type: 'message', model: 'synthetic-model',
      stop_reason: finish === 'stop' ? 'end_turn' : 'max_tokens', content: [{ type: 'text', text }],
      ...(usage ? { usage: { input_tokens: 35, cache_read_input_tokens: 5, output_tokens: 10, output_tokens_details: { thinking_tokens: 3 } } } : {}),
    });
  });
  return calls;
}

test('identical concurrent jobs share SDK transport without sharing preflight tickets or deadlines', async t => {
  const calls = network(t, 'gemini'), base = configuration('gemini');
  const first = configurationForJob(base, base.executionProfile, 'foxy');
  const second = configurationForJob(base, base.executionProfile, 'foxy');
  const clients = [getAiTextClient(first, 'foxy'), getAiTextClient(second, 'foxy')], inputs = [request(), request()];
  assert.notEqual(clients[0], clients[1]);
  await Promise.all(clients.map((client, i) => countForExecution(client, { model: inputs[i].model }, inputs[i])));
  const results = await Promise.all(clients.map((client, i) => client.models.generateContent(inputs[i])));
  assert.deepEqual(results.map(result => result.text), ['{"answer":"ok"}', '{"answer":"ok"}']);
  assert.equal(calls.length, 4, 'two counts and exactly two generations');
});

for (const provider of ['gemini', 'anthropic']) {
  test(`${provider} bridge serializes bound JSON/PDF using SDK, with one count and one generation`, async t => {
    const calls = network(t, provider), config = configuration(provider);
    const client = getAiTextClient(config, 'foxy'), input = request();
    assert.equal(getAiTextClient(config, 'foxy'), client);
    assert.equal(calls.length, 0);
    assert.equal((await countForExecution(client, { model: input.model, contents: input.contents }, input)).totalTokens, 40);
    const result = await client.models.generateContent(input);
    assert.equal(result.text, '{"answer":"ok"}');
    assert.equal(result.usageMetadata.promptTokenCount, 40);
    assert.equal(result.usageMetadata.candidatesTokenCount, 10);
    assert.equal(result.usageMetadata.thoughtsTokenCount ?? 0, 0, 'inclusive output cannot count reasoning twice');
    assert.equal(calls.length, 2);
    assert.equal(JSON.stringify(calls[1].body).includes('JVBERg=='), true);
    assert.equal(JSON.stringify(calls[1].body).includes('additionalProperties'), true);
    await assert.rejects(client.models.generateContent(input), AiError);
    assert.equal(calls.length, 2);
  });
  test(`${provider} rejects uncounted, changed and incompatible requests before transmission`, async t => {
    const calls = network(t, provider), client = getAiTextClient(configuration(provider), 'foxy');
    await assert.rejects(client.models.generateContent(request()), AiError);
    const input = request();
    await client.models.countForGeneration(input);
    input.contents[0].parts[0].text = 'Mutated';
    await assert.rejects(client.models.generateContent(input), AiError);
    for (const mutate of [v => { v.model = 'unmapped-model'; }, v => { v.config.tools = []; },
      v => { v.contents[0].parts = [{ fileData: { fileUri: 'https://invalid.example/document.pdf', mimeType: 'application/pdf' } }]; }]) {
      const bad = request(); mutate(bad);
      await assert.rejects(client.models.countForGeneration(bad), AiError);
    }
    assert.equal(calls.length, 1);
  });
  test(`${provider} preserves neutral validation errors as AiError`, async t => {
    const calls = network(t, provider, { finish: 'length' }), client = getAiTextClient(configuration(provider), 'foxy'), input = request();
    await client.models.countForGeneration(input);
    await assert.rejects(client.models.generateContent(input), error => error instanceof AiError && error.code === 'INVALID_AI_OUTPUT');
    assert.equal(calls.length, 2);
  });
  test(`${provider} unknown usage stays unknown`, async t => {
    network(t, provider, { usage: false });
    const client = getAiTextClient(configuration(provider), 'foxy'), input = request();
    await client.models.countForGeneration(input);
    const result = await client.models.generateContent(input);
    assert.equal(result.usageMetadata.promptTokenCount, undefined);
    assert.equal(result.usageMetadata.candidatesTokenCount, undefined);
  });
  test(`${provider} schema, instruction and output limits remain bound to counted request`, async t => {
    const calls = network(t, provider), client = getAiTextClient(configuration(provider), 'foxy');
    for (const mutate of [v => { v.config.systemInstruction += ' changed'; }, v => { v.config.responseJsonSchema.properties.answer.type = 'number'; },
      v => { v.config.maxOutputTokens--; }]) {
      const input = request();
      await client.models.countForGeneration(input);
      mutate(input);
      await assert.rejects(client.models.generateContent(input), AiError);
    }
    assert.equal(calls.length, 3, 'changed generation cannot recount or dispatch');
  });
  test(`${provider} cancellation stops before count or generation`, async t => {
    const calls = network(t, provider), client = getAiTextClient(configuration(provider), 'foxy');
    const canceled = request(); canceled.config.abortSignal = AbortSignal.abort();
    await assert.rejects(client.models.countForGeneration(canceled), error => error instanceof AiError && error.code === 'AI_TIMEOUT');
    const input = request(); await client.models.countForGeneration(input);
    input.config.abortSignal = AbortSignal.abort();
    await assert.rejects(client.models.generateContent(input), error => error instanceof AiError && error.code === 'AI_TIMEOUT');
    assert.equal(calls.length, 1);
  });
  for (const status of [429, 503]) test(`${provider} ${status} response remains sanitized without retries`, async t => {
    const calls = network(t, provider, { status }), client = getAiTextClient(configuration(provider), 'foxy'), input = request();
    await client.models.countForGeneration(input);
    await assert.rejects(client.models.generateContent(input), error => error instanceof AiError && error.code === (status === 429 ? 'AI_RATE_LIMITED' : 'AI_UNAVAILABLE'));
    assert.equal(calls.length, 2);
  });
}

test('Claude missing credential and mismatched task fail closed without fallback', () => {
  const config = configuration('anthropic'); delete config.anthropicApiKey;
  assert.throws(() => getAiTextClient(config, 'foxy'), AiError);
  assert.throws(() => getAiTextClient(configuration('gemini'), 'grading'), AiError);
});

test('both provider selectors reject empty credentials before SDK environment fallback', () => {
  for (const provider of ['gemini', 'anthropic']) for (const value of ['', '   ', undefined]) {
    const config = configuration(provider);
    config[provider === 'gemini' ? 'apiKey' : 'anthropicApiKey'] = value;
    assert.throws(() => getAiTextClient(config, 'foxy'), AiError);
    assert.throws(() => createExecutionTransport(config, 'foxy'), AiError);
  }
});

test('direct neutral transport uses explicitly selected provider', async t => {
  const calls = network(t, 'anthropic'), transport = createExecutionTransport(configuration('anthropic'), 'foxy');
  assert.equal(transport.provider, 'anthropic');
  assert.equal(calls.length, 0);
  assert.equal(await transport.count({ model: 'synthetic-model', system: 'Synthetic', messages: [{ role: 'user', parts: [{ kind: 'text', text: 'Hello' }] }],
    maxOutputTokens: 100, signal: new AbortController().signal }), 40);
  assert.equal(calls.length, 1);
});

test('classic injected SDK count fallback receives original count request', async () => {
  const countRequest = { model: 'classic', contents: 'Synthetic' }, generationRequest = request();
  const client = { models: { countTokens: async input => { assert.equal(input, countRequest); return { totalTokens: 10 }; } } };
  assert.deepEqual(await countForExecution(client, countRequest, generationRequest), { totalTokens: 10 });
});

test('ticket map bounds old counts and native unbound count fails closed', async t => {
  const calls = network(t, 'gemini'), client = getAiTextClient(configuration('gemini'), 'foxy');
  const first = request();
  await client.models.countForGeneration(first);
  for (let i = 0; i < 128; i++) {
    const next = request(); next.contents[0].parts[0].text = `Synthetic ${i}`;
    await client.models.countForGeneration(next);
  }
  await assert.rejects(client.models.generateContent(first), AiError);
  await assert.rejects(client.models.countTokens({ model: first.model, contents: first.contents }), AiError);
  assert.equal(calls.length, 129);
});

const versions = { curriculum: ['study-plan-v1', 'study-plan-v1'], activities: ['activity-proposal-v1', 'activity-proposal-v1'],
  analysis: ['student-report-v1', 'student-report-v1'], grading: ['grading-proposal-v1', 'grading-proposal-v1'], foxy: ['foxy-chat-v2', 'foxy-answer-v1'] };
function adapterFixture(task, config) {
  const signal = new AbortController().signal;
  if (task === 'curriculum') return { create: () => createGeminiExtractionAdapter(config), count: 'countStudyPlanTokens', generate: 'extractStudyPlan',
    input: { signal, schemaVersion: 'study-plan-v1', document: { kind: 'pdf', bytes: new Uint8Array([37, 80, 68, 70]) } },
    json: { units: [{ name: 'Synthetic', topics: [{ name: 'Topic' }] }], warnings: [] } };
  if (task === 'activities') return { create: () => createGeminiActivityGenerationAdapter(config), count: 'countActivityTokens', generate: 'generateActivity',
    input: { signal, schemaVersion: 'activity-proposal-v1', type: 'ASSIGNMENT', unit: { id: 'u', name: 'Light' }, topics: [{ id: 't', name: 'Exposure' }],
      objective: 'Compare', groupLevel: 'Second year', difficulty: 'BASIC', durationMinutes: 40, context: 'Teacher context',
      counts: { assignment: 1, development: 0, singleChoice: 0, multipleChoice: 0 }, sources: [] },
    json: { status: 'READY', proposal: { schemaVersion: 'activity-proposal-v1', type: 'ASSIGNMENT', title: 'Light', objective: 'Compare', instructions: 'Explain.',
      assignmentPrompts: ['Compare.'], questions: [], warnings: [], evidence: [{ item: 'assignment', index: 0, references: [{ sourceId: 'teacher-context', page: null }] }] } } };
  if (task === 'analysis') return { create: () => createStudentAiProvider(config), count: 'countStudentAiTokens', generate: 'generateStudentAi',
    input: { signal, evidence: { activities: [] } }, json: { overview: 'Synthetic', strengths: [], supportNeeds: [], recommendations: [], limitations: [] } };
  if (task === 'grading') return { create: () => new GeminiGradingAiProvider(getAiTextClient(config, task), config), count: 'countGradingAiTokens', generate: 'generateGradingAi',
    input: { signal, evidence: { type: 'ASSIGNMENT', instructions: 'Explain', rubric: 'Compare', questions: [], answers: [], files: [] } },
    json: { schemaVersion: 'grading-proposal-v1', overallGrade: '7', overallFeedback: 'Synthetic', questions: [], warnings: [] } };
  return { create: () => createGeminiFoxyTextAdapter(config), count: 'countTokens', generate: 'generate',
    input: { signal, mode: 'GENERAL', purpose: 'CHAT', message: 'Synthetic', curriculum: null, sources: [], documents: [], warnings: [] },
    json: { schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Synthetic', markdown: 'Public text', references: [], warnings: [], missingInformation: [] } };
}
for (const provider of ['gemini', 'anthropic']) for (const task of Object.keys(versions)) {
  test(`${task} adapter uses ${provider} bridge with exact preflight and no recount`, async t => {
    const config = configuration(provider);
    Object.assign(config.executionProfile, { task, promptVersion: versions[task][0], responseVersion: versions[task][1] });
    const f = adapterFixture(task, config), calls = network(t, provider, { text: JSON.stringify(f.json) });
    const adapter = f.create();
    assert.equal(await adapter[f.count](f.input), 40);
    assert.deepEqual((await adapter[f.generate](f.input)).json, f.json);
    assert.equal(calls.length, 2);
    await assert.rejects(adapter[f.generate](f.input));
    assert.equal(calls.length, 2, 'no extra count or generation after consuming preflight');
  });
}

for (const [count, size] of [[7, 4], [2, 10_000_001]]) {
  test(`grading bridge preserves ${count} inline PDFs of ${size} bytes without reducing existing limits`, async t => {
    const config = configuration('gemini');
    Object.assign(config.executionProfile, { task: 'grading', promptVersion: 'grading-proposal-v1', responseVersion: 'grading-proposal-v1',
      maxDocumentBytes: 400_000_000, deadlineMs: 10000 });
    config.deadlineMs = 10000;
    const f = adapterFixture('grading', config);
    const bytes = Buffer.alloc(size, 32); bytes.set([37, 80, 68, 70]);
    const data = bytes.toString('base64');
    f.input.evidence.files = Array.from({ length: count }, (_, i) => ({ ref: `F${i + 1}`, kind: 'pdf', data, purpose: 'attachment' }));
    const calls = network(t, 'gemini', { text: JSON.stringify(f.json) }), adapter = f.create();
    await adapter[f.count](f.input);
    await adapter[f.generate](f.input);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].body.contents[0].parts.filter(part => part.inlineData).length, count);
  });
}
