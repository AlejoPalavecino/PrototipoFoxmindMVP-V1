import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupProbe } from '../scripts/p4-probe-cleanup.mjs';
test('database probe cleanup failure cannot skip independently owned object cleanup', async () => {
  const attempted = [];
  await assert.rejects(cleanupProbe([
    { name: 'database', async run() { attempted.push('database'); throw new Error('private provider detail'); } },
    { name: 'object', async run() { attempted.push('object'); } },
  ]));
  assert.deepEqual(attempted.sort(), ['database', 'object']);
});
test('both probe cleanup failures remain explicit without exposing provider data', async () => {
  await assert.rejects(cleanupProbe(['database', 'object'].map(name => ({ name, async run() { throw new Error('private provider detail'); } }))), error => {
    assert.ok(error instanceof AggregateError); assert.equal(error.errors.length, 2);
    assert.deepEqual(error.errors.map(error => error.message).sort(), ['P4 database probe cleanup failed', 'P4 object probe cleanup failed']);
    return true;
  });
});
