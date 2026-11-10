import test from 'node:test';
import assert from 'node:assert/strict';

function fixture(claim) {
  const calls = [], configuration = { model: 'synthetic', maxInputTokens: 1000, deadlineMs: 1000, maxJobAgeMs: 300000 };
  const options = { configuration, queue: { claim: async () => { calls.push('claim'); return claim(); } },
    database: { $transaction: async fn => fn({ $queryRawUnsafe: async () => [] }) },
    turns: {}, authority: {}, loader: {}, provider: {}, budget: {}, completion: {} };
  return { calls, options };
}
async function worker(f) { const { createFoxyTextWorker } = await import("../worker.ts");
  assert.equal(typeof createFoxyTextWorker, 'function'); return createFoxyTextWorker(f.options); }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

test('concurrent runOnce calls share one active claim', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), w = await worker(f);
  const first = w.runOnce(), second = w.runOnce(); await Promise.resolve();
  assert.equal(f.calls.length, 1); gate.resolve(null);
  assert.deepEqual(await Promise.all([first, second]), [false, false]);
  await w.onModuleDestroy(); assert.equal(await w.runOnce(), false); assert.equal(f.calls.length, 1);
});

test('initialization is idempotent, polling is serial, timer is unrefed and destroy cancels it', async () => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout, timers = [];
  globalThis.setTimeout = fn => { const timer = { fn, cleared: false, unrefed: false, unref() { this.unrefed = true; } }; timers.push(timer); return timer; };
  globalThis.clearTimeout = timer => { if (timer) timer.cleared = true; };
  const gate = deferred(), f = fixture(() => gate.promise);
  try {
    const w = await worker(f); w.onModuleInit(); w.onModuleInit();
    assert.equal(timers.length, 1); assert.equal(timers[0].unrefed, true);
    timers[0].fn(); await Promise.resolve(); assert.equal(f.calls.length, 1);
    assert.equal(timers.length, 1, 'no next poll before active claim finishes');
    gate.resolve(null); await new Promise(resolve => originalSet(resolve, 0));
    assert.equal(timers.length, 2); assert.equal(timers[1].unrefed, true);
    await w.onModuleDestroy(); assert.equal(timers[1].cleared, true);
    timers[1].fn(); await Promise.resolve(); assert.equal(f.calls.length, 1);
  } finally { globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; }
});

test('destroy waits for an in-flight claim, then suppresses work and late claims', async () => {
  const gate = deferred(), f = fixture(() => gate.promise), w = await worker(f);
  const running = w.runOnce(); await Promise.resolve(); let stopped = false;
  const stopping = w.onModuleDestroy().then(() => { stopped = true; });
  await Promise.resolve(); assert.equal(stopped, false);
  gate.resolve(null); await Promise.all([running, stopping]);
  assert.equal(await w.runOnce(), false); assert.deepEqual(f.calls, ['claim']);
});

test('scheduled claim rejection is observed and shutdown leaves no unhandled rejection', async () => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout, timers = [], errors = [];
  const onUnhandled = error => errors.push(error); process.on('unhandledRejection', onUnhandled);
  globalThis.setTimeout = fn => { const timer = { fn, unref() {} }; timers.push(timer); return timer; };
  globalThis.clearTimeout = () => {};
  try {
    const f = fixture(async () => { throw Error('synthetic'); }), w = await worker(f);
    w.onModuleInit(); timers[0].fn(); await new Promise(resolve => originalSet(resolve, 0));
    await w.onModuleDestroy(); await new Promise(resolve => originalSet(resolve, 0)); assert.deepEqual(errors, []);
  } finally { process.off('unhandledRejection', onUnhandled); globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; }
});

test('destroy aborts a dispatched provider, awaits terminal handling and ignores a late response', async () => {
  const generated = deferred(), entered = deferred(), calls = [], lease = { turnId: 'turn', ownerId: 'owner', conversationId: 'conversation', leaseNonce: 'nonce' };
  const f = fixture(async () => lease), scope = { capability: {}, snapshot: { context: { kind: 'GENERAL' } }, documents: [] };
  Object.assign(f.options, {
    turns: { loadClaimed: async () => ({ purpose: 'CHAT', message: 'Hola', metadata: { model: 'synthetic', promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } }) },
    authority: { open: async () => scope, close: () => calls.push('close'), revalidateGrounding: async () => true },
    loader: { load: async () => ({ context: { kind: 'GENERAL' }, curriculum: null, sources: [], documents: [], referenceMap: [], warnings: [] }) },
    budget: { reserve: async () => 'RESERVED' },
    provider: { countTokens: async () => 10, generate: input => { entered.resolve(input.signal); return generated.promise; } },
    completion: { finish: async (_lease, outcome) => { calls.push(outcome.errorCode ?? outcome.state); return true; } },
  });
  const w = await worker(f), running = w.runOnce(), signal = await entered.promise;
  await w.onModuleDestroy(); assert.equal(signal.aborted, true); await running;
  assert.deepEqual(calls, ['PROVIDER_OUTCOME_UNKNOWN', 'close']);
  generated.resolve({ json: {}, inputTokens: 0, outputTokens: 0 }); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(calls, ['PROVIDER_OUTCOME_UNKNOWN', 'close']);
  assert.equal(await w.runOnce(), false);
});
