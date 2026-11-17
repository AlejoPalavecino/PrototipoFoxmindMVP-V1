import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyTurnPreparation } from '../apps/api/src/modules/foxy/turns/infrastructure/turn-preparation.ts';

const pair = i => ({ user: `Pregunta ${i}`, assistant: { title: `Título ${i}`, markdown: `Respuesta ${i}` } });
function fixture({ count = () => 101, historyLength = 10, model = 'synthetic', revalidate = () => true } = {}) {
  const calls = [], validated = new WeakSet(), scope = { capability: {}, snapshot: { attachments: [{}] }, documents: [] };
  const grounding = { context: { kind: 'GENERAL' }, curriculum: null,
    sources: [{ sourceKey: 's1', title: 'Fuente sintética', text: 'Fuente esencial', kind: 'ATTACHMENT', documentKeys: ['d1'] }],
    documents: [{ documentKey: 'd1', sourceKeys: ['s1'], pageCount: null, warnings: [], document: { kind: 'text', text: 'Fuente esencial sintética' } }],
    referenceMap: [], warnings: [] };
  const options = {
    turns: { loadClaimed: async () => ({ purpose: 'CHAT', message: 'Pregunta actual',
      history: Array.from({ length: historyLength }, (_, i) => pair(i)),
      metadata: { model, promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } }) },
    authority: { open: async () => { calls.push(['open']); return scope; }, close: () => calls.push(['close']),
      revalidateGrounding: async () => { calls.push(['authorize']); return revalidate(calls); } },
    loader: { load: async () => grounding },
    provider: { countTokens: async input => {
      calls.push(['count', input]);
      const tokens = await count(input, calls);
      if (tokens <= 100 && Number.isSafeInteger(tokens) && tokens > 0) validated.add(input);
      return tokens;
    } }, configuration: { model: 'synthetic', maxInputTokens: 100 },
  };
  return { calls, validated, options, prepare: () => createFoxyTurnPreparation(options).prepare({}, new AbortController().signal) };
}
const counts = fixture => fixture.calls.filter(call => call[0] === 'count');

test('ten history pairs and oversized essential source need only original and base counts', async t => {
  for (const byError of [false, true]) {
    const f = fixture({ count: () => { if (byError) throw Object.assign(Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' }); return 101; } });
    await assert.rejects(f.prepare(), { code: 'AI_INPUT_LIMIT' });
    assert.deepEqual(counts(f).map(([, input]) => input.history.length), [10, 0]);
    assert.ok(f.calls.some(([kind]) => kind === 'close'));
    const [original, base] = counts(f).map(([, input]) => input);
    assert.equal(base.sources, original.sources);
    assert.equal(base.documents, original.documents);
    assert.equal(base.message, original.message);
    t.diagnostic(JSON.stringify({ fixture: 'synthetic-oversized-base', previousCounts: 11, currentCounts: counts(f).length }));
  }
});

test('binary suffix search returns an actually validated input with complete latest pairs', async t => {
  const f = fixture({ count: input => 20 + input.history.length * 20 });
  const result = await f.prepare();
  assert.deepEqual(result.input.history, [pair(6), pair(7), pair(8), pair(9)]);
  assert.equal(result.count, 100);
  assert.ok(f.validated.has(result.input), 'return the exact successful object, preserving its preflight ticket');
  assert.ok(counts(f).length <= 6);
  t.diagnostic(JSON.stringify({ fixture: 'synthetic-four-pairs-fit', previousCounts: 7, currentCounts: counts(f).length }));
  assert.equal(f.calls.filter(([kind]) => kind === 'authorize').length, counts(f).length);
  const original = counts(f)[0][1];
  for (const [, input] of counts(f)) {
    assert.equal(input.sources, original.sources);
    assert.equal(input.documents, original.documents);
    assert.equal(input.message, original.message);
  }
});

test('revoked source and incompatible pending model stop before another count', async () => {
  const revoked = fixture({ revalidate: calls => calls.filter(([kind]) => kind === 'authorize').length === 1 });
  await assert.rejects(revoked.prepare(), { code: 'CONFLICT' });
  assert.equal(counts(revoked).length, 1);
  const incompatible = fixture({ model: 'different-pending-model' });
  await assert.rejects(incompatible.prepare(), { code: 'AI_UNAVAILABLE' });
  assert.equal(counts(incompatible).length, 0);
  assert.equal(incompatible.calls.length, 0);
});

test('small history keeps sequential trimming and non-limit failures never retry', async () => {
  const small = fixture({ historyLength: 5, count: input => input.history.length > 3 ? 101 : 80 });
  await small.prepare();
  assert.deepEqual(counts(small).map(([, input]) => input.history.length), [5, 4, 3]);
  const failure = fixture({ count: () => { throw Object.assign(Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' }); } });
  await assert.rejects(failure.prepare(), { code: 'AI_UNAVAILABLE' });
  assert.equal(counts(failure).length, 1);
});

test('non-monotonic counts still return only a successfully counted input', async () => {
  const f = fixture({ count: input => input.history.length === 0 || input.history.length === 7 ? 70 : 101 });
  const result = await f.prepare();
  assert.ok(f.validated.has(result.input));
  assert.ok(result.count <= 100);
});

test('selected suffix retains the real Gemini adapter ticket without another count at generation', async () => {
  const { GeminiFoxyTextAdapter } = await import('../apps/api/src/modules/foxy/turns/infrastructure/providers/foxy-adapter.ts');
  let tokens = 0, sdkCounts = 0, generations = 0;
  const client = { models: {
    countTokens: async () => { sdkCounts++; return { totalTokens: tokens }; },
    generateContent: async () => { generations++; return {
      text: JSON.stringify({ schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Respuesta',
        markdown: 'Texto sintético', references: [], warnings: [], missingInformation: [] }),
      candidates: [{ finishReason: 'STOP' }],
    }; },
  } };
  const adapter = new GeminiFoxyTextAdapter({ client, configuration: { model: 'synthetic',
    maxInputTokens: 100, maxOutputTokens: 100, deadlineMs: 1000 } });
  const f = fixture();
  f.options.provider.countTokens = async input => { tokens = 20 + input.history.length * 20; return adapter.countTokens(input); };
  const result = await f.prepare(), before = sdkCounts;
  await adapter.generate(result.input);
  assert.equal(sdkCounts, before);
  assert.equal(generations, 1);
  assert.deepEqual(result.input.history, [pair(6), pair(7), pair(8), pair(9)]);
});

test('failed base checks do not retry non-limit failures or invalid counts', async () => {
  for (const failure of [NaN, 0, 1.5, Object.assign(Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' })]) {
    const f = fixture({ count: input => {
      if (input.history.length) return 101;
      if (failure instanceof Error) throw failure;
      return failure;
    } });
    await assert.rejects(f.prepare(), { code: 'AI_UNAVAILABLE' });
    assert.equal(counts(f).length, 2);
  }
});
test('classroom material without chat attachments is reauthorized before every external count', async () => {
  let revoked = false;
  const f = fixture({ count: () => { revoked = true; return 101; }, revalidate: () => !revoked });
  f.options.authority.open = async () => ({ capability: {}, snapshot: { context: { kind: 'CLASSROOM' } }, documents: [] });
  f.options.loader.load = async () => ({ context: { kind: 'CLASSROOM' },
    curriculum: { units: [], selectedTopicIds: [] }, documents: [], referenceMap: [], warnings: [],
    sources: [{ sourceKey: 's1', title: 'Synthetic', kind: 'MATERIAL', text: 'PRIVATE_MARKER', documentKeys: [] }] });
  await assert.rejects(f.prepare(), { code: 'CONFLICT' });
  assert.equal(counts(f).length, 1, 'revoked academic material cannot be sent in another count');
});
