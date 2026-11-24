import test from 'node:test';
import assert from 'node:assert/strict';
import { SerialJobScheduler } from '../apps/api/src/modules/grading/assistance/infrastructure/grading-ai/scheduler.ts';
import { createDiagnosticSink, diagnosticCause } from '../apps/api/src/platform/diagnostics.ts';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

test('AI admission observes the existing lock through the caller transaction', async () => {
  const { lockAiAdmission } = await import("../apps/api/src/platform/ai/admission.ts");
  const calls = [];
  await lockAiAdmission({ query: async (...args) => { calls.push(args); return []; } });
  assert.deepEqual(calls, [['SELECT 1 FROM pg_advisory_xact_lock(78123002)']]);
});
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

test('diagnostic lines are deduplicated rather than a complete latency series', () => {
  let now = 100;
  const lines = [], sink = createDiagnosticSink(line => lines.push(JSON.parse(line)), { now: () => now, windowMs: 100 });
  const event = { operation: 'classroom.lock', code: 'COMPLETED', outcome: 'success', durationMs: 1,
    correlationId: 'a1111111-1111-4111-8111-111111111111' };
  for (const durationMs of [1, 2, 3]) sink.record({ ...event, durationMs });
  assert.equal(lines.length, 1);
  now += 100;
  sink.record({ ...event, durationMs: 4 });
  assert.deepEqual(lines.map(line => [line.durationMs, line.suppressedCount ?? 0]), [[1, 0], [4, 2]]);
});

test('diagnostic cause keeps only a database error code, never messages or values', () => {
  assert.equal(diagnosticCause({ code: 'P2028', message: 'Transaction already closed CANARY' }), 'P2028');
  assert.equal(diagnosticCause({ code: 'P2010', meta: { code: '40P01', message: 'deadlock CANARY' } }), '40P01');
  assert.equal(diagnosticCause({ code: 'P2010', meta: { code: 'CANARY private' } }), 'P2010');
  assert.equal(diagnosticCause({ code: '57014' }), '57014');
  assert.equal(diagnosticCause(new Error('CANARY_PRIVATE_SQL')), 'other');
  assert.equal(diagnosticCause(undefined), 'other');
  const lines = [], sink = createDiagnosticSink(line => lines.push(JSON.parse(line)), { now: () => 100 });
  const event = { operation: 'classroom.query', code: 'UNEXPECTED', outcome: 'failure', durationMs: 2,
    correlationId: 'a1111111-1111-4111-8111-111111111111' };
  sink.record({ ...event, cause: 'P2028' });
  sink.record({ ...event, operation: 'classroom.lock', cause: 'CANARY private' });
  assert.deepEqual(lines.map(line => line.cause), ['P2028', undefined]);
});
