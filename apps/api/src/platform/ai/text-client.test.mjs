import test from 'node:test';
import assert from 'node:assert/strict';
import { GeminiFoxyTextAdapter } from '../../modules/foxy/turns/infrastructure/providers/foxy-adapter.ts';

test('the textual preflight deadline includes the gap before generation instead of restarting', async () => {
 const calls = [], client = { models: {
  async countTokens() { calls.push('count'); return { totalTokens: 10 }; },
  async generateContent() { calls.push('generate'); return { text: JSON.stringify({ schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Synthetic', markdown: 'Answer', references: [], warnings: [], missingInformation: [] }), candidates: [{ finishReason: 'STOP' }] }; },
 } };
 const adapter = new GeminiFoxyTextAdapter({ client, configuration: { model: 'synthetic', maxInputTokens: 100, maxOutputTokens: 50, deadlineMs: 15 } });
 const input = { signal: new AbortController().signal, mode: 'GENERAL', purpose: 'CHAT', message: 'Synthetic', curriculum: null, sources: [], documents: [], warnings: [] };
 await adapter.countTokens(input);
 await new Promise(resolve => setTimeout(resolve, 30));
 await assert.rejects(adapter.generate(input), { code: 'AI_TIMEOUT' });
 assert.deepEqual(calls, ['count']);
});

import { createAiTextClient } from './text-client.ts';
import { createDefaultTextProfile } from './text-profiles.ts';
import { readFileSync } from 'node:fs';

const success = () => ({ text: '{"ok":true}', finish: 'stop', usage: { inputTokens: 10, outputTokens: 15, reasoningTokens: 5, cachedInputTokens: null } });
function neutralFixture({ count, generate, deadlineMs = 1000 } = {}) {
 const events = [], request = { system: 'Synthetic system', messages: [{ role: 'user', parts: [{ kind: 'text', text: 'Synthetic' }, { kind: 'pdf', bytes: new Uint8Array([37,80,68,70]) }] }], schema: { type: 'object' } };
 const profile = createDefaultTextProfile({ model: 'synthetic', maxInputTokens: 100, maxOutputTokens: 50, deadlineMs }, 'foxy');
 const client = createAiTextClient({ profile, transport: { provider: 'gemini', async count(input) { events.push('count'); return count ? count(input, request) : 10; }, async generate(input) { events.push('generate'); return generate ? generate(input) : success(); } } });
 const call = { key: {}, request: () => request, signal: new AbortController().signal };
 return { client, call, request, events, profile };
}

test('neutral split preflight counts once, reserves and authorizes around its sole dispatch/application', async () => {
 const f = neutralFixture(); let authority = 0;
 Object.assign(f.call, { authorize: async () => { f.events.push('authorize'); authority++; }, reserve: async tokens => { assert.equal(tokens, 10); f.events.push('reserve'); }, onDispatch: () => f.events.push('dispatch') });
 assert.equal(await f.client.count(f.call), 10);
 assert.deepEqual(f.events, ['authorize','count']);
 assert.deepEqual(await f.client.generate(f.call), success());
 assert.deepEqual(f.events, ['authorize','count','reserve','authorize','dispatch','generate','authorize']);
 assert.equal(authority, 3);
 await assert.rejects(f.client.generate(f.call), { code: 'AI_UNAVAILABLE' });
 assert.equal(f.events.filter(value => value === 'count').length, 1);
 assert.equal(f.events.filter(value => value === 'generate').length, 1);
});

test('neutral tickets bind the exact input owner and every control/source byte without dispatch or recount', async () => {
 for (const mutate of [r => { r.system += ' changed'; }, r => { r.schema.type = 'array'; }, r => { r.messages[0].parts[0].text += ' changed'; }, r => { r.messages[0].parts[1].bytes[0] ^= 1; }]) {
  const f = neutralFixture(); await f.client.count(f.call); mutate(f.request);
  await assert.rejects(f.client.generate(f.call), { code: 'AI_UNAVAILABLE' });
  assert.deepEqual(f.events, ['count']);
 }
 const f = neutralFixture(); await f.client.count(f.call);
 await assert.rejects(f.client.generate({ ...f.call, key: {} }), { code: 'AI_UNAVAILABLE' });
 await f.client.generate(f.call); assert.deepEqual(f.events, ['count','generate']);
});

test('neutral preflight rejects live mutation during count and closes the suspended run', async () => {
 const f = neutralFixture({ count: async (_input, request) => { request.system += ' mutated'; return 10; } });
 await assert.rejects(f.client.count(f.call), { code: 'AI_UNAVAILABLE' });
 await assert.rejects(f.client.generate(f.call), { code: 'AI_UNAVAILABLE' });
 assert.deepEqual(f.events, ['count']);
});

test('cancellation during the preflight pause releases it without dispatching or waiting for the provider deadline', async () => {
 const f = neutralFixture(), controller = new AbortController(); f.call.signal = controller.signal;
 await f.client.count(f.call); controller.abort();
 await new Promise(setImmediate);
 await assert.rejects(f.client.generate(f.call), { code: 'AI_TIMEOUT' });
 assert.deepEqual(f.events, ['count']);
});

test('a real SQL reservation is drained after cancellation even though the preflight pause is interruptible', async () => {
 const f = neutralFixture(), controller = new AbortController(); f.call.signal = controller.signal;
 let release, enter, finished = false;
 const ready = new Promise(resolve => { enter = resolve; }), held = new Promise(resolve => { release = resolve; });
 f.call.reserve = async () => { enter(); await held; };
 await f.client.count(f.call);
 const run = f.client.generate(f.call).then(() => { finished = true; }, error => { finished = true; return error; });
 await ready; controller.abort(); await new Promise(setImmediate);
 assert.equal(finished, false);
 release(); assert.equal((await run).code, 'AI_TIMEOUT'); assert.deepEqual(f.events, ['count']);
});

test('neutral revocation and late usage retain authorization and conservative single-dispatch semantics', async () => {
 const denied = neutralFixture(); denied.call.authorize = async () => { throw { code: 'FORBIDDEN' }; };
 await assert.rejects(denied.client.count(denied.call), { code: 'FORBIDDEN' }); assert.deepEqual(denied.events, []);
 const late = neutralFixture(); let n = 0; late.call.authorize = async () => { if (++n === 3) throw { code: 'SOURCE_UNAVAILABLE' }; };
 await late.client.count(late.call);
 await assert.rejects(late.client.generate(late.call), error => error.code === 'SOURCE_UNAVAILABLE' && error.usage.outputTokens === 15 && error.dispatched === true);
 await assert.rejects(late.client.generate(late.call)); assert.deepEqual(late.events, ['count','generate']);
 const uncertain = neutralFixture({ generate: async () => { throw new Error('PRIVATE_MARKER'); } });
 await uncertain.client.count(uncertain.call);
 await assert.rejects(uncertain.client.generate(uncertain.call), { code: 'PROVIDER_OUTCOME_UNKNOWN', message: 'PROVIDER_OUTCOME_UNKNOWN' });
 await assert.rejects(uncertain.client.generate(uncertain.call)); assert.deepEqual(uncertain.events, ['count','generate']);
});

test('five split consumers and the Study one-shot use the neutral execution owner with no adapter tickets/timers', () => {
 for (const path of [
  '../../modules/curriculum/generation/infrastructure/providers/gemini-adapter.ts',
  '../../modules/activities/generation/infrastructure/providers/activity-adapter.ts',
  '../../modules/grading/student-analysis/infrastructure/student-ai/provider.ts',
  '../../modules/grading/assistance/infrastructure/grading-ai/provider.ts',
  '../../modules/foxy/turns/infrastructure/providers/foxy-adapter.ts',
 ]) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bWeakMap\b|\bcreateHash\b|\bsetTimeout\b|\bAbortSignal\.timeout\b|\.models\.|\bcountForExecution\b|\bGenerateContentParameters\b/);
  assert.match(source, /getNeutralAiTextClient/);
 }
 const study = readFileSync(new URL('../../modules/study/generation/infrastructure/providers/study-ai-execution.ts', import.meta.url), 'utf8');
 assert.match(study, /executeAiText/); assert.doesNotMatch(study, /\.models\.|GenerateContentParameters/);
});

import { executeAiText } from './text-execution.ts';
test('the idle preflight promise closes on cancellation while an actual SQL reservation still requires draining', { timeout: 1000 }, async () => {
 const f = neutralFixture(), controller = new AbortController(); let enter, release;
 const ready = new Promise(resolve => { enter = resolve; }), hold = new Promise(resolve => { release = resolve; });
 const run = executeAiText({ profile: f.profile, request: f.request, signal: controller.signal,
  transport: { provider: 'gemini', async count() { return 10; }, async generate() { throw Error('dispatch forbidden'); } },
  async preflight() { enter(); await hold; }, reserve: async () => { throw Error('reserve forbidden'); },
 });
 await ready; controller.abort();
 await assert.rejects(run, { code: 'AI_TIMEOUT' }); release();
});

test('an injected SDK that already requires bound preflight cannot use the classic auto-count shim', async () => {
 const calls = [], client = { models: {
  async countTokens() { throw Error('unbound count forbidden'); },
  async countForGeneration() { calls.push('count'); return { totalTokens: 10 }; },
  async generateContent() { calls.push('generate'); return { text: JSON.stringify({ schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Synthetic', markdown: 'Answer', references: [], warnings: [], missingInformation: [] }), candidates: [{ finishReason: 'STOP' }] }; },
 } };
 const adapter = new GeminiFoxyTextAdapter({ client, configuration: { model: 'synthetic', maxInputTokens: 100, maxOutputTokens: 50, deadlineMs: 1000 } });
 const input = { signal: new AbortController().signal, mode: 'GENERAL', purpose: 'CHAT', message: 'Synthetic', curriculum: null, sources: [], documents: [], warnings: [] };
 await assert.rejects(adapter.generate(input), { code: 'AI_UNAVAILABLE' }); assert.deepEqual(calls, []);
 await adapter.countTokens(input); await adapter.generate(input); assert.deepEqual(calls, ['count','generate']);
});
