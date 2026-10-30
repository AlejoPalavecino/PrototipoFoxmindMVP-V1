import test from 'node:test';
import assert from 'node:assert/strict';
import { SerialJobScheduler } from '../apps/api/src/classrooms/grading-ai/scheduler.ts';
import { createDiagnosticSink } from '../apps/api/src/diagnostics.ts';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
test('scheduler drains 40 jobs serially, yields between cycles, then idles and stops', async () => {
  let calls = 0, active = 0, maxActive = 0;
  const scheduler = new SerialJobScheduler(async () => {
    active++; maxActive = Math.max(maxActive, active); await pause(1); active--;
    return ++calls <= 40;
  }, { idleMs: 500, yieldMs: 0, maxJobsPerCycle: 10, cyclePauseMs: 1 });
  scheduler.start();
  try {
    const deadline = Date.now() + 3000;
    while (calls < 41 && Date.now() < deadline) await pause(5);
    assert.equal(calls, 41);
    assert.equal(maxActive, 1);
    await pause(30);
    assert.equal(calls, 41, 'empty queue must not busy-loop');
  } finally { await scheduler.stop(); }
  const stoppedAt = calls; await pause(30); assert.equal(calls, stoppedAt);
});

test('diagnostic adapter serializes allowlisted fields without private error fields', () => {
  const lines = [], sink = createDiagnosticSink(line => lines.push(line), { now: () => 100 });
  sink.record({ operation: 'classroom.operation', code: 'UNEXPECTED', outcome: 'failure', durationMs: 2,
    correlationId: 'a1111111-1111-4111-8111-111111111111', rawError: 'CANARY_PRIVATE_SQL_TOKEN_EMAIL_PROMPT' });
  assert.equal(lines.length, 1);
  assert.doesNotMatch(lines[0], /CANARY_PRIVATE_SQL_TOKEN_EMAIL_PROMPT|rawError/);
  assert.match(lines[0], /a1111111-1111-4111-8111-111111111111/);
});
