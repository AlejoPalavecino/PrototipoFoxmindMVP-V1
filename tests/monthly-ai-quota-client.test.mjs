import test from 'node:test';
import assert from 'node:assert/strict';
import { subscribeAiQuota } from '../apps/web/src/application/clients/ai-quota-client.ts';

const base = { subjectId: 'account-a', version: 0, limitMicrousd: 3_000_000, consumedMicrousd: 0, reservedMicrousd: 0, remainingMicrousd: 3_000_000,
  periodStart: '2026-11-01T03:00:00.000Z', renewsAt: '2026-12-01T03:00:00.000Z', tools: [] };

test('the browser marks disconnection, uses a snapshot fallback, and accepts the next period', async () => {
  const observed = [];
  let stream, scheduled, aborted;
  class Stream {
    static CLOSED = 2;
    readyState = 1;
    constructor() { stream = this; }
    close() { this.readyState = Stream.CLOSED; }
    send(snapshot) { this.onmessage({ data: JSON.stringify(snapshot), lastEventId: String(snapshot.version) }); }
  }
  const stop = subscribeAiQuota('account-a', value => observed.push(value), {
    EventSource: Stream,
    fetch: async (_, options) => {
      aborted = options.signal;
      return new Response(JSON.stringify({ ...base, version: 2 }));
    },
    setTimeout: fn => { scheduled = fn; return 1; },
    clearTimeout: () => { scheduled = undefined; },
  });
  assert.equal(observed.length, 0);
  stream.send({ ...base, version: 1 });
  stream.send(base);
  assert.deepEqual(observed, [{ snapshot: { ...base, version: 1 }, connected: true }]);
  stream.onerror();
  assert.equal(observed.at(-1).connected, false);
  await scheduled();
  assert.equal(observed.at(-1).snapshot.version, 2);
  assert.equal(observed.at(-1).connected, false);
  stream.send({ ...base, periodStart: base.renewsAt });
  assert.equal(observed.at(-1).snapshot.periodStart, base.renewsAt);
  assert.equal(observed.at(-1).connected, true);
  stop();
  assert.equal(stream.readyState, Stream.CLOSED);
  assert.equal(aborted.aborted, true);
});

test('snapshot fallback works without EventSource and clears stale quota when the cookie changes accounts', async () => {
  const observed = [];
  let scheduled;
  let snapshot = base;
  const stop = subscribeAiQuota('account-a', value => observed.push(value), {
    fetch: async () => new Response(JSON.stringify(snapshot)),
    setTimeout: fn => { scheduled = fn; return 1; },
    clearTimeout: () => { scheduled = undefined; },
  });
  await scheduled();
  assert.deepEqual(observed.at(-1), { snapshot: base, connected: false });
  snapshot = { ...base, subjectId: 'account-b', version: 2 };
  await scheduled();
  assert.deepEqual(observed.at(-1), { snapshot: null, connected: false, unavailable: true });
  stop();
});
