import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { test } from 'node:test';
import { withIdentityDatabase } from '../scripts/p33-identity-test-env.mjs';

// Public helper only: fake Docker always fails before PostgreSQL construction.
// Capture numeric fields only; never retain arguments, environment or credentials.
async function probe({ times = [0], failure = 'run', paused = false, removal = 0 } = {}) {
  const originalSpawn = childProcess.spawnSync;
  const originalNow = Date.now;
  const calls = [];
  let tick = 0;
  let callbacks = 0;
  Date.now = () => times[Math.min(tick++, times.length - 1)];
  childProcess.spawnSync = (command, args, options) => {
    if (command !== 'docker') throw new Error('Unexpected non-Docker execution');
    let result;
    if (args[0] === 'run') result = failure === 'run'
      ? { status: null, error: Object.assign(new Error('Synthetic timeout'), { code: 'ETIMEDOUT' }) }
      : { status: 0, stdout: 'synthetic' };
    else if (args[0] === 'rm') result = { status: removal };
    else if (args[0] === 'unpause') result = { status: 0 };
    else if (args[1] === '--format' && args[2] === '{{.State.Paused}}')
      result = { status: 0, stdout: String(paused) };
    else if (args[2] === '{{.State.Health.Status}}') result = failure === 'health'
      ? { status: 1 } : { status: 0, stdout: 'healthy' };
    else result = { status: 1 }; // Port inspection fails: never connect to PG.
    calls.push({ timeout: options.timeout, status: result.status });
    return result;
  };
  syncBuiltinESMExports();
  try {
    await assert.rejects(withIdentityDatabase(() => { callbacks++; }), {
      message: removal === 0 ? 'Owned Docker operation unavailable' : 'Owned database cleanup unavailable',
    });
    assert.equal(callbacks, 0);
    return calls;
  } finally {
    childProcess.spawnSync = originalSpawn;
    Date.now = originalNow;
    syncBuiltinESMExports();
  }
}

test('fixture launch alone receives an 8000ms ceiling (synthetic cleanup only)', async () => {
  const calls = await probe();
  assert.equal(calls[0].timeout, 8000);
});

test('health inspection retains 4000ms and cleanup retains 1000/2000ms', async () => {
  const calls = await probe({ failure: 'health' });
  assert.deepEqual(calls.slice(1), [
    { timeout: 4000, status: 1 }, { timeout: 1000, status: 0 }, { timeout: 2000, status: 0 },
  ]);
});

test('port inspection also retains 4000ms without opening PostgreSQL', async () => {
  const calls = await probe({ failure: 'port' });
  assert.deepEqual(calls.slice(1), [
    { timeout: 4000, status: 0 }, { timeout: 4000, status: 1 },
    { timeout: 1000, status: 0 }, { timeout: 2000, status: 0 },
  ]);
});

test('launch clamps to remaining 26000ms global budget and the 1ms floor', async () => {
  for (const [elapsed, expected] of [[23000, 3000], [25999, 1], [27000, 1]]) {
    const calls = await probe({ times: [0, elapsed] });
    assert.equal(calls[0].timeout, expected);
    assert.deepEqual(calls.slice(1), [
      { timeout: 1000, status: 0 }, { timeout: 2000, status: 0 },
    ]);
  }
});

test('other Docker operations still clamp to the remaining global deadline', async () => {
  const health = await probe({ failure: 'health', times: [0, 0, 20000, 23500] });
  assert.equal(health[1].timeout, 2500);
  const port = await probe({ failure: 'port', times: [0, 0, 0, 0, 24000] });
  assert.equal(port[2].timeout, 2000);
});

test('paused synthetic fixture retains 1000ms unpause and 2000ms removal after deadline', async () => {
  const calls = await probe({ times: [0, 27000], paused: true });
  assert.deepEqual(calls.slice(1), [
    { timeout: 1000, status: 0 }, { timeout: 1000, status: 0 }, { timeout: 2000, status: 0 },
  ]);
});

test('cleanup failure remains a failure, not fabricated setup success', async () => {
  const calls = await probe({ removal: 1 });
  assert.deepEqual(calls.slice(1), [
    { timeout: 1000, status: 0 }, { timeout: 2000, status: 1 },
  ]);
});
