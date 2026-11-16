import test from 'node:test';
import assert from 'node:assert/strict';
import { executeAiText } from '../apps/api/src/platform/ai/text-execution.ts';
import { createDefaultTextProfile, createTextRegistry } from '../apps/api/src/platform/ai/text-profiles.ts';

const configuration = { model: 'synthetic-gemini', maxInputTokens: 100, maxOutputTokens: 50, deadlineMs: 1000 };
const profile = () => createDefaultTextProfile(configuration, 'study');
const request = () => ({ system: 'Synthetic instruction', messages: [{ role: 'user', parts: [{ kind: 'text', text: 'PRIVATE_MARKER' }] }], schema: { type: 'object' } });
const success = () => ({ text: '{"ok":true}', finish: 'stop', usage: { inputTokens: 10, outputTokens: 15, reasoningTokens: 5, cachedInputTokens: null } });
function fixture() {
  const calls = [], events = [];
  const transport = { provider: 'gemini', async count(input) { calls.push(['count', input]); return 10; }, async generate(input) { calls.push(['generate', input]); return success(); } };
  return { calls, events, transport, run: options => executeAiText({ profile: profile(), transport, request: request(), record: event => events.push(event), ...options }) };
}
test('default task profiles preserve configured Gemini, registry snapshots and rejects incompatible selection', async () => {
  const p = profile(), f = fixture(), profiles = [p];
  const registry = createTextRegistry(profiles, [f.transport]);
  p.model = 'mutated-after-registration';
  const selected = registry.resolve('study');
  assert.equal(selected.profile.model, configuration.model);
  assert.throws(() => registry.resolve('grading'), { code: 'AI_UNAVAILABLE' });
  assert.throws(() => registry.resolve('study', { provider: 'anthropic', model: 'other', version: '1' }), { code: 'AI_UNAVAILABLE' });
  assert.throws(() => createTextRegistry([profile()], [{ ...f.transport, provider: 'anthropic' }]), { code: 'AI_UNAVAILABLE' });
  assert.throws(() => createDefaultTextProfile({ ...configuration, deadlineMs: 0 }, 'study'), { code: 'AI_UNAVAILABLE' });
  assert.equal(f.calls.length, 0);
});
test('authorizes before count, reserve, dispatch and application; sends frozen copy and no sensitive metrics', async () => {
  const f = fixture(), order = [], input = request();
  const originalCount = f.transport.count, originalGenerate = f.transport.generate;
  f.transport.count = async value => { order.push('count'); input.messages[0].parts[0].text = 'mutated'; return originalCount(value); };
  f.transport.generate = async value => { order.push('generate'); return originalGenerate(value); };
  const result = await f.run({ request: input, authorize: async () => { order.push('authorize'); }, reserve: async tokens => { assert.equal(tokens, 10); order.push('reserve'); }, onDispatch: () => order.push('dispatch') });
  assert.deepEqual(order, ['authorize', 'count', 'reserve', 'authorize', 'dispatch', 'generate', 'authorize']);
  assert.equal(f.calls[1][1].messages[0].parts[0].text, 'PRIVATE_MARKER');
  assert.equal(result.usage.outputTokens, 15);
  assert.equal(JSON.stringify(f.events).includes('PRIVATE_MARKER'), false);
  assert.deepEqual(f.events.map(e => e.stage), ['count', 'generate']);
});
test('fails closed on unexpected payload fields, unsupported documents and provider before any transmission', async () => {
  for (const options of [
    { request: { ...request(), password: 'PRIVATE_MARKER' } },
    { request: { ...request(), messages: [{ role: 'user', parts: [{ kind: 'url', url: 'https://example.invalid' }] }] } },
    { profile: { ...profile(), capabilities: ['text'] } },
    { profile: { ...profile(), provider: 'anthropic' } },
    { profile: { ...profile(), capabilities: ['text', 'json'], maxDocumentBytes: 1 }, request: { ...request(), messages: [{ role: 'user', parts: [{ kind: 'pdf', bytes: new Uint8Array(2) }] }] } },
  ]) {
    const f = fixture(); await assert.rejects(f.run(options)); assert.equal(f.calls.length, 0);
  }
});
test('revocation before count transmits nothing; revocation after reservation prevents generate', async () => {
  let n = 0;
  const f = fixture();
  await assert.rejects(f.run({ authorize: async () => { throw Object.assign(new Error('secret'), { code: 'FORBIDDEN' }); } }), { code: 'FORBIDDEN', message: 'FORBIDDEN' });
  assert.equal(f.calls.length, 0);
  await assert.rejects(f.run({ authorize: async () => { if (++n === 2) throw { code: 'SOURCE_UNAVAILABLE' }; } }), { code: 'SOURCE_UNAVAILABLE' });
  assert.equal(f.calls.length, 1);
});
test('count limit, invalid count and reserve rejection prevent generation', async () => {
  for (const value of [101, -1, NaN, undefined, 0]) {
    const f = fixture(); f.transport.count = async () => value;
    await assert.rejects(f.run()); assert.equal(f.calls.length, 0);
  }
  const f = fixture();
  await assert.rejects(f.run({ reserve: async () => { throw { code: 'QUOTA_EXCEEDED' }; } }), { code: 'QUOTA_EXCEEDED' });
  assert.equal(f.calls.length, 1);
});
test('single total deadline stops generation after count/reservation and aborts hanging operations', async () => {
  const f = fixture(); let clock = 0;
  await assert.rejects(f.run({ now: () => clock, reserve: async () => { clock = 1001; } }), { code: 'AI_TIMEOUT' });
  assert.equal(f.calls.length, 1);
  const h = fixture(); h.transport.count = async () => new Promise(() => {});
  await assert.rejects(h.run({ profile: { ...profile(), deadlineMs: 15 } }), { code: 'AI_TIMEOUT' });
});
test('errors are sanitized and there is no retry or fallback after dispatch', async () => {
  for (const [status, code] of [[429, 'AI_RATE_LIMITED'], [400, 'AI_UNAVAILABLE'], [undefined, 'PROVIDER_OUTCOME_UNKNOWN']]) {
    const f = fixture(); let attempts = 0;
    f.transport.generate = async () => { attempts++; throw Object.assign(new Error('PRIVATE_MARKER'), { status }); };
    await assert.rejects(f.run(), { code, message: code }); assert.equal(attempts, 1);
    assert.equal(JSON.stringify(f.events).includes('PRIVATE_MARKER'), false);
  }
});
test('blocked, truncated, invalid JSON and invalid usage never become a complete output', async () => {
  for (const change of [{ finish: 'blocked' }, { finish: 'length' }, { text: '{bad' }, { text: 'x'.repeat(1000001) }, { usage: { inputTokens: -1, outputTokens: NaN } }]) {
    const f = fixture(); f.transport.generate = async () => ({ ...success(), ...change });
    await assert.rejects(f.run(), { code: 'INVALID_AI_OUTPUT' });
    assert.equal(f.events.at(-1).outcome, 'failure', 'rejected output must not be recorded as success');
  }
});
test('late authorization errors retain known usage for settlement and diagnostics cannot break execution', async () => {
  const f = fixture(); let n = 0;
  await assert.rejects(f.run({ authorize: async () => { if (++n === 3) throw { code: 'SOURCE_UNAVAILABLE' }; } }), error => error.code === 'SOURCE_UNAVAILABLE' && error.usage.outputTokens === 15);
  assert.deepEqual(await f.run({ record: () => { throw new Error('sink failed'); } }), success());
});
test('deadline cannot race an in-flight SQL reservation and finalize before it commits', async () => {
  const f = fixture(), controller = new AbortController();
  let release, entered, finished = false;
  const held = new Promise(resolve => { release = resolve; });
  const ready = new Promise(resolve => { entered = resolve; });
  const running = f.run({ signal: controller.signal, reserve: async () => { entered(); await held; } })
    .then(() => { finished = true; }, error => { finished = true; return error; });
  await ready; controller.abort();
  await new Promise(setImmediate);
  assert.equal(finished, false, 'settlement must await the known reservation outcome');
  release();
  assert.equal((await running).code, 'AI_TIMEOUT');
  assert.equal(f.calls.filter(([stage]) => stage === 'generate').length, 0);
});
test('local metric sink whitelists fields, bounds volume and never logs private payloads', async () => {
  const { createAiTextMetricSink } = await import('../apps/api/src/platform/ai/text-metrics.ts');
  const lines = [], record = createAiTextMetricSink(line => lines.push(line), { maxEvents: 2 });
  const event = { task: 'study', provider: 'gemini', stage: 'count', durationMs: 12, code: 'COMPLETED', outcome: 'success' };
  record({ ...event, prompt: 'PRIVATE_MARKER', error: 'PRIVATE_MARKER', apiKey: 'PRIVATE_MARKER' });
  record({ ...event, code: 'PRIVATE_MARKER' });
  record({ ...event, task: 'PRIVATE_MARKER' });
  record({ ...event, durationMs: -1 });
  record(event); record(event);
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), event);
  assert.equal(lines.join('').includes('PRIVATE_MARKER'), false);
  createAiTextMetricSink(() => { throw new Error('sink'); })(event);
});
