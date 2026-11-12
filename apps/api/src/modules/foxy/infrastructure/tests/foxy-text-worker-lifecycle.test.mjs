import test from 'node:test';
import assert from 'node:assert/strict';

function fixture(claim) {
  const calls = [], configuration = { model: 'synthetic', maxInputTokens: 1000, deadlineMs: 1000, maxJobAgeMs: 300000, maxConcurrency: 1 };
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

test('wake fills available slots and completion takes the next turn without waiting for a poll', async () => {
  const leases = Array.from({ length: 3 }, (_, index) => ({
    turnId: String(index), ownerId: String(index), conversationId: String(index), leaseNonce: String(index),
  }));
  const entered = leases.map(() => deferred()), generated = leases.map(() => deferred());
  const f = fixture(() => leases.shift() ?? null);
  f.options.configuration.maxConcurrency = 2;
  const scope = { capability: {}, snapshot: { context: { kind: 'GENERAL' } }, documents: [] };
  Object.assign(f.options, {
    turns: { loadClaimed: async lease => ({ purpose: 'CHAT', message: lease.turnId, metadata: { model: 'synthetic', promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } }) },
    authority: { open: async () => scope, close() {}, revalidateGrounding: async () => true },
    loader: { load: async () => ({ context: { kind: 'GENERAL' }, curriculum: null, sources: [], documents: [], referenceMap: [], warnings: [] }) },
    budget: { reserve: async () => 'RESERVED' },
    provider: { countTokens: async () => 10, generate: input => {
      const index = Number(input.message);
      entered[index].resolve(input.signal);
      return generated[index].promise;
    } },
    completion: { finish: async lease => { f.calls.push('finished:' + lease.turnId); return true; } },
  });
  const w = await worker(f);
  try {
    w.onModuleInit();
    w.wake();
    await new Promise(setImmediate);
    assert.equal(f.calls.filter(call => call === 'claim').length, 2);
    assert.equal((await Promise.all(entered.slice(0, 2).map(item => item.promise))).length, 2);
    w.wake();
    assert.equal(f.calls.filter(call => call === 'claim').length, 2);
    generated[0].resolve({ json: {}, inputTokens: 10, outputTokens: 20 });
    await new Promise(setImmediate);
    assert.equal(f.calls.filter(call => call === 'claim').length, 3);
    assert.equal(f.calls.includes('finished:1'), false);
    assert.equal((await entered[2].promise).aborted, false);
  } finally { await w.onModuleDestroy(); }
  assert.deepEqual(f.calls.filter(call => call.startsWith('finished:')).sort(), ['finished:0', 'finished:1', 'finished:2']);
});

test('a wake received during an empty claim gets another chance without waiting for the timer', async () => {
  const gate = deferred(), f = fixture(() => f.calls.length === 1 ? gate.promise : null), w = await worker(f);
  try {
    w.onModuleInit();
    w.wake();
    assert.deepEqual(f.calls, ['claim']);
    w.wake();
    gate.resolve(null);
    await new Promise(setImmediate);
    assert.deepEqual(f.calls, ['claim', 'claim']);
  } finally { await w.onModuleDestroy(); }
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
