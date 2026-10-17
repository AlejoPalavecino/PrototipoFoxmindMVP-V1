import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runIdentityTestProcess } from '../scripts/p33-test-process.mjs';

test('module startup has a separate bound and does not consume functional time', async () => {
  const result = await runIdentityTestProcess(['-e', `setTimeout(()=>{process.send({type:'foxmind-test-ready'});process.disconnect();setTimeout(()=>{console.log('ACTUAL_WORK');},100);},350)`],
    { startupMs: 2000, workMs: 300 });
  assert.equal(result.status, 0); assert.equal(result.phase, 'complete'); assert.match(result.stdout, /ACTUAL_WORK/);
  assert.ok(result.startupMs >= 300); assert.ok(result.workMs < 300);
});
test('startup and work timeouts remain distinct failures and child exit is awaited', async () => {
  const startup = await runIdentityTestProcess(['-e', 'setInterval(()=>{},1000)'], { startupMs: 200, workMs: 100 });
  assert.equal(startup.status, null); assert.equal(startup.phase, 'startup-timeout'); assert.ok(startup.signal);
  const work = await runIdentityTestProcess(['-e', "process.send({type:'foxmind-test-ready'});process.disconnect();setInterval(()=>{},1000)"], { startupMs: 2000, workMs: 100 });
  assert.equal(work.status, null); assert.equal(work.phase, 'work-timeout'); assert.ok(work.signal);
});
test('missing readiness, bad exits and exact streams never become acceptance', async () => {
  const missing = await runIdentityTestProcess(['-e', 'process.exit(0)'], { startupMs: 2000, workMs: 200 });
  assert.equal(missing.phase, 'missing-readiness'); assert.equal(missing.status, 1);
  const failed = await runIdentityTestProcess(['-e', "process.send({type:'foxmind-test-ready'});process.disconnect();console.log('OUT');console.error('ERR');process.exitCode=7"], { startupMs: 2000, workMs: 2000 });
  assert.equal(failed.status, 7); assert.equal(failed.stdout, 'OUT\n'); assert.equal(failed.stderr, 'ERR\n');
});
