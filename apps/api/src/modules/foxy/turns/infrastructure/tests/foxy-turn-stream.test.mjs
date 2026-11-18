import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiTextTransport } from '../../../../../platform/ai/gemini-text-transport.ts';
import { createAiTextClient } from '../../../../../platform/ai/text-client.ts';
import { createDefaultTextProfile } from '../../../../../platform/ai/text-profiles.ts';
import { GeminiFoxyTextAdapter } from '../providers/foxy-adapter.ts';
import { createFoxyTurnService } from '../../application/turn-service.ts';
import { createFoxyTurnPreviews } from '../turn-preview.ts';
import { createFoxyTextWorker } from '../worker.ts';

const configuration = { model: 'synthetic', maxInputTokens: 100, maxOutputTokens: 80, deadlineMs: 5000 };
const input = { mode: 'GENERAL', purpose: 'CHAT', message: 'Conversación sintética', curriculum: null,
  sources: [], documents: [], warnings: [], signal: new AbortController().signal };
const first = '{"schemaVersion":"foxy-text-response-v1","status":"READY","title":"Sintético","markdown":"Hola ';
const response = { schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Sintético',
  markdown: 'Hola 🦊\n"texto"', references: [], warnings: [], missingInformation: [] };
function chunk(text, finishReason) {
  return { candidates: [{ finishReason, content: { parts: [{ text: 'privado', thought: true }, { text }] } }] };
}
function fixture(stream) {
  const calls = [];
  const transport = createGeminiTextTransport({ ...configuration, apiKey: 'synthetic', client: { models: {
    async countTokens() { calls.push('count'); return { totalTokens: 11 }; },
    async generateContent() { calls.push('generate'); return chunk(JSON.stringify(response), 'STOP'); },
    async generateContentStream(request) { calls.push('stream'); return stream(request); },
  } } });
  const profile = createDefaultTextProfile(configuration, 'foxy');
  const adapter = new GeminiFoxyTextAdapter({ configuration, client: createAiTextClient({ profile, transport }) });
  return { calls, adapter };
}

test('Gemini emits decoded conversational text before the stream ends, then validates the final JSON', async () => {
  const previews = [];
  const f = fixture(async function* (request) {
    assert.deepEqual(request.config.responseJsonSchema.propertyOrdering.slice(0, 4), ['schemaVersion', 'status', 'title', 'markdown']);
    yield chunk(first + '\\uD83E');
    assert.deepEqual(previews, ['Hola ']);
    yield chunk('\\uDD8A\\n\\"tex');
    assert.deepEqual(previews, ['Hola ', 'Hola 🦊\n"tex']);
    yield { ...chunk('to\\"","references":[],"warnings":[],"missingInformation":[]}', 'STOP'),
      usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 30, thoughtsTokenCount: 0 } };
  });
  await f.adapter.countTokens(input);
  const generated = await f.adapter.generate(input, text => { previews.push(text); });
  assert.deepEqual(generated.json, response);
  assert.equal(generated.outputTokens, 30);
  assert.deepEqual(f.calls, ['count', 'stream']);
});

test('does not publish fields other than owned conversational markdown, or retry a malformed stream', async () => {
  for (const part of [
    '{"schemaVersion":"foxy-text-response-v1","status":"INSUFFICIENT_CONTENT","title":"privado","markdown":"oculto',
    '{"nested":{"schemaVersion":"foxy-text-response-v1","status":"READY","title":"privado","markdown":"oculto',
    first + '\\u0000',
  ]) {
    const f = fixture(async function* () { yield chunk(part); yield chunk('', 'SAFETY'); });
    await f.adapter.countTokens(input);
    const previews = [];
    await assert.rejects(f.adapter.generate(input, text => { previews.push(text); }), { code: 'INVALID_AI_OUTPUT' });
    assert.deepEqual(previews, []);
    assert.deepEqual(f.calls, ['count', 'stream']);
  }
  const f = fixture(async function* () { assert.fail('Tools and grounded chat use whole responses'); });
  for (const request of [{ ...input, purpose: 'STUDY_MATERIAL' }, { ...input, mode: 'CLASSROOM', curriculum: { units: [] } },
    { ...input, sources: [{ sourceKey: 's1', title: 'Adjunto', kind: 'ATTACHMENT', documentKeys: [] }] }]) {
    await f.adapter.countTokens(request);
    await f.adapter.generate(request, () => assert.fail('Ineligible response emitted a preview'));
  }
  assert.deepEqual(f.calls, ['count', 'generate', 'count', 'generate', 'count', 'generate']);
});

test('a late STOP cannot revive a safety-blocked candidate or permit more text after completion', async () => {
  for (const terminal of ['SAFETY', 'STOP']) {
    const f = fixture(async function* () {
      yield chunk(terminal === 'SAFETY' ? '' : JSON.stringify(response), terminal);
      yield chunk(terminal === 'SAFETY' ? JSON.stringify(response) : ' ', 'STOP');
      yield { usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 30 } };
    });
    await f.adapter.countTokens(input);
    await assert.rejects(f.adapter.generate(input, () => assert.fail('Terminal chunks must stay private')), {
      code: 'INVALID_AI_OUTPUT', usage: { inputTokens: 11, outputTokens: 30, reasoningTokens: null, cachedInputTokens: null },
    });
    assert.deepEqual(f.calls, ['count', 'stream']);
  }
});

test('a safety terminal retracts visible markdown while the stream waits for final usage', async () => {
  let unblock, terminalSeen;
  const pendingUsage = new Promise(resolve => { unblock = resolve; });
  const terminalConsumed = new Promise(resolve => { terminalSeen = resolve; });
  const previews = [];
  const f = fixture(async function* () {
    yield chunk(first);
    yield chunk('', 'SAFETY');
    terminalSeen();
    await pendingUsage;
    yield { usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 22 } };
  });
  await f.adapter.countTokens(input);
  const completion = f.adapter.generate(input, markdown => { previews.push(markdown); });
  try {
    await terminalConsumed;
    assert.deepEqual(previews, ['Hola ', undefined]);
  } finally { unblock(); }
  await assert.rejects(completion, {
    code: 'INVALID_AI_OUTPUT', usage: { inputTokens: 11, outputTokens: 22, reasoningTokens: null, cachedInputTokens: null },
  });
});

test('only the authenticated running turn read can include its optional preview', async () => {
  const tx = {}, turn = { id: 'turn', state: 'RUNNING', purpose: 'CHAT', answer: null };
  let owner = 'owner', canRead = true;
  const previews = [];
  const service = createFoxyTurnService({
    uow: { run: async (_request, _write, operation) => operation(tx, { id: owner }) },
    conversations: { get: async () => ({}) },
    turns: { get: async () => canRead ? turn : null, list: async () => [turn] },
    readPreview: async (...args) => { previews.push(args); return 'Hola'; },
  });
  assert.equal((await service.get({}, 'conversation', 'turn')).partialMarkdown, 'Hola');
  assert.deepEqual(previews, [[tx, 'owner', 'conversation', 'turn']]);
  assert.equal((await service.list({}, 'conversation', { afterSequence: 0, limit: 10 })).items[0].partialMarkdown, undefined);
  turn.state = 'CANCELLED';
  assert.equal((await service.get({}, 'conversation', 'turn')).partialMarkdown, undefined);
  turn.state = 'RUNNING'; owner = 'other'; canRead = false;
  await assert.rejects(service.get({}, 'conversation', 'turn'), { code: 'NOT_FOUND' });
  assert.equal(previews.length, 1);
});

test('only a successful cancellation transaction aborts the local preview', async () => {
  let commits = false, cancellations = 0;
  const service = createFoxyTurnService({
    uow: { run: async (_request, _write, operation) => {
      const result = await operation({}, { id: 'owner' });
      if (!commits) throw new Error('rolled back');
      return result;
    } },
    conversations: { get: async () => ({ context: { kind: 'GENERAL' } }) },
    turns: { cancel: async () => ({ id: 'turn', state: 'CANCELLED', purpose: 'CHAT', answer: null }) },
    cancelPreview: (...args) => { assert.deepEqual(args, ['owner', 'conversation', 'turn']); cancellations++; },
  });
  await assert.rejects(service.cancel({}, 'conversation', 'turn'), /rolled back/);
  assert.equal(cancellations, 0);
  commits = true;
  assert.equal((await service.cancel({}, 'conversation', 'turn')).state, 'CANCELLED');
  assert.equal(cancellations, 1);
});

test('retains only the live lease, revalidates the current context for each read and discards an in-flight read on cancellation', async () => {
  const previews = createFoxyTurnPreviews();
  const lease = { ownerId: 'owner', conversationId: 'conversation', turnId: 'turn' };
  const ownerRead = tx => previews.read(tx, 'owner', 'conversation', 'turn');
  const controller = new AbortController();
  let revocation = false, returnCheck;
  const handle = previews.open(lease, controller, async tx => {
    if (revocation) throw Object.assign(new Error(), { code: 'FORBIDDEN' });
    return tx === 'immediate' || new Promise(resolve => { returnCheck = resolve; });
  });
  assert.equal(handle.publish('Texto parcial'), true);
  assert.equal(await previews.read('immediate', 'other', 'conversation', 'turn'), undefined);
  assert.equal(await previews.read('immediate', 'owner', 'other', 'turn'), undefined);
  assert.equal(await ownerRead('immediate'), 'Texto parcial');
  revocation = true;
  assert.equal(await ownerRead('immediate'), undefined);
  revocation = false;
  const checking = ownerRead('pending');
  previews.cancel('owner', 'conversation', 'turn');
  returnCheck(true);
  assert.equal(controller.signal.aborted, true);
  assert.equal(await checking, undefined);
  assert.equal(handle.publish('respuesta tardía'), false);
  assert.equal(await ownerRead('immediate'), undefined);
});

test('worker exposes a live preview only while the authorized generation is pending', async () => {
  const previews = createFoxyTurnPreviews();
  const lease = { ownerId: 'owner', conversationId: 'conversation', turnId: 'turn' };
  const snapshot = { context: { kind: 'GENERAL' }, sources: [], curriculum: null };
  const grounding = { ...snapshot, documents: [], referenceMap: [], warnings: [] };
  const outcome = [], metrics = [];
  let publishPreview, done, started;
  const generated = new Promise(resolve => { done = resolve; });
  const firstPartial = new Promise(resolve => { started = resolve; });
  const worker = createFoxyTextWorker({
    database: { $transaction: async fn => fn({ $queryRawUnsafe: async () => [] }) },
    queue: { claim: async () => lease },
    turns: { loadClaimed: async () => ({ purpose: 'CHAT', message: input.message,
      metadata: { model: configuration.model, promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } }) },
    loader: { load: async () => grounding }, previews,
    authority: { open: async () => ({ capability: {}, snapshot, documents: [] }), close() {},
      revalidateGrounding: async (_capability, signal, tx) => !signal.aborted && !!tx },
    provider: { countTokens: async () => 11, async generate(_input, publish) {
      publishPreview = publish;
      publish('Hola ');
      started();
      return generated;
    } },
    budget: { reserve: async () => 'RESERVED' },
    completion: { async finish(job, result) { outcome.push([job, result]); return true; } },
    createTimings: () => ({ now: () => 12, setFlow() {}, stage(stage) { metrics.push(stage); }, measure: (_stage, task) => task() }),
    configuration: { ...configuration, maxJobAgeMs: 5000, maxConcurrency: 1 },
  });
  const running = worker.runOnce();
  await firstPartial;
  const owned = () => previews.read({}, lease.ownerId, lease.conversationId, lease.turnId);
  assert.equal(await owned(), 'Hola ');
  assert.equal(outcome.length, 0);
  publishPreview('Hola 🦊');
  assert.equal(await owned(), 'Hola 🦊');
  assert.deepEqual(metrics.filter(stage => stage === 'first_text'), ['first_text']);
  done({ json: response, inputTokens: 11, outputTokens: 30 });
  assert.equal(await running, true);
  assert.equal(await owned(), undefined);
  assert.equal(outcome[0][1].answer.markdown, response.markdown);
});
