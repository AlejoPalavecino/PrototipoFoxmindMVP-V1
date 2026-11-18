import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture, configuration } from './activity-ai-fixture.test.mjs';

const worker = () => import("../apps/api/src/modules/grading/student-analysis/infrastructure/student-ai/worker.ts");
const report = { overview: 'Progreso', strengths: [{ text: 'Entrega realizada', evidenceRefs: ['A1'] }],
  supportNeeds: [], recommendations: [], limitations: [] };
async function submitted(f) {
  const detail = await f.classrooms.detail(f.T, f.room);
  const change = async operation => f.classrooms.changeActivities(f.T, f.room, { revision: await f.revision(), operation });
  const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
  await change({ action: 'save', id, payload: { title: 'TITULO_PRIVADO', unitId: detail.units[0].id,
    topicId: detail.units[0].topics[0].id, instructions: 'TEXTO_PRIVADO', attachmentRequired: false,
    instructionFileIds: [], materialIds: [], deadline: null, allowLate: true, questions: [] } });
  await change({ action: 'publish', id });
  const session = await f.classrooms.startActivity(f.S, f.room, id, {});
  const request = { ...f.S, headers: { 'x-attempt-editor': session.editor.token, 'x-attempt-epoch': session.editor.epoch } };
  // Synthetic attempt opened earlier, avoiding host clock jitter across rapid operations.
  await f.pool.query("UPDATE attempts SET opened_at=clock_timestamp()-interval '1 second' WHERE id=$1", [session.attempt.id]);
  await f.classrooms.submitPracticalAttempt(request, f.room, session.attempt.id, { revision: session.attempt.revision, confirm: true });
  return id;
}
function setup(f) {
  const calls = [];
  const provider = {
    countStudentAiTokens: async input => { calls.push(['count', input]); return 20; },
    generateStudentAi: async input => { calls.push(['generate', input]); return { json: report, inputTokens: 20, outputTokens: 20 }; },
  };
  return { calls, provider, options: { database: f.classrooms.ports.database, progressView: f.classrooms.progressView, configuration, provider } };
}

test('student report is teacher-only, GET never generates and unrelated students and classrooms are denied', { timeout: 120000 }, async () => {
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), { calls } = setup(f);
    const value = await f.classrooms.getStudentAiReport(f.T, f.room, f.student);
    assert.ok(value && typeof value.state === 'string');
    for (const [actor, room, student] of [[f.S, f.room, f.student], [f.O, f.room, f.student],
      [f.T, f.room, randomUUID()], [f.T, randomUUID(), f.student]]) {
      await assert.rejects(f.classrooms.getStudentAiReport(actor, room, student), { code: 'FORBIDDEN' });
    }
    assert.deepEqual(calls, []);
  }));
});

test('worker skips insufficient evidence, sends anonymous facts, and does not regenerate unchanged evidence', { timeout: 120000 }, async () => {
  const { StudentAiWorker } = await worker();
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), { calls, options } = setup(f), runner = new StudentAiWorker(options);
    await runner.runOnce(); assert.deepEqual(calls, []);
    const activityId = await submitted(f);
    await runner.runOnce();
    assert.equal(calls.filter(([kind]) => kind === 'generate').length, 1);
    for (const [, input] of calls) {
      const serialized = JSON.stringify(input.evidence);
      for (const privateValue of [f.student, f.teacher, f.room, activityId, 'Synthetic', 'Activity AI', 'TITULO_PRIVADO', 'TEXTO_PRIVADO']) {
        assert.equal(serialized.includes(privateValue), false, `leaked ${privateValue}`);
      }
      assert.doesNotMatch(serialized, /\d{4}-\d{2}-\d{2}|[0-9a-f]{8}-[0-9a-f]{4}-/i);
    }
    await runner.runOnce(); assert.equal(calls.filter(([kind]) => kind === 'generate').length, 1);
    const value = await f.classrooms.getStudentAiReport(f.T, f.room, f.student);
    assert.deepEqual(value.report, report);
  }));
});

test('membership revoked during provider execution cannot publish the obsolete report', { timeout: 120000 }, async () => {
  const { StudentAiWorker } = await worker();
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), { options } = setup(f);
    await submitted(f);
    options.provider.generateStudentAi = async () => {
      await f.classrooms.remove(f.T, f.room, f.student);
      return { json: report, inputTokens: 20, outputTokens: 20 };
    };
    await new StudentAiWorker(options).runOnce();
    try {
      const value = await f.classrooms.getStudentAiReport(f.T, f.room, f.student);
      assert.notDeepEqual(value.report, report);
    } catch (error) { assert.equal(error.code, 'FORBIDDEN'); }
  }));
});

test('expired worker cannot settle or complete a replacement lease', { timeout: 120000 }, async () => {
  const { StudentAiWorker } = await worker();
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), { options } = setup(f);
    await submitted(f);
    const nonce = randomUUID();
    let beforeRow, beforeUsage;
    options.provider.generateStudentAi = async () => {
      const row = (await f.pool.query('SELECT id,lease_nonce,reserved_microusd FROM student_ai_reports WHERE classroom_id=$1', [f.room])).rows[0];
      assert.ok(row); assert.notEqual(row.lease_nonce, nonce); assert.ok(BigInt(row.reserved_microusd) > 0n);
      await f.pool.query("UPDATE student_ai_reports SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1", [row.id]);
      await f.pool.query("UPDATE student_ai_reports SET lease_nonce=$2,lease_until=clock_timestamp()+interval '1 minute' WHERE id=$1", [row.id, nonce]);
      beforeRow = (await f.pool.query('SELECT state,lease_nonce,reserved_microusd,report FROM student_ai_reports WHERE id=$1', [row.id])).rows[0];
      beforeUsage = (await f.pool.query('SELECT scope,reserved_microusd,consumed_microusd,input_tokens,output_tokens FROM ai_usage_daily ORDER BY scope')).rows;
      return { json: report, inputTokens: 20, outputTokens: 20 };
    };
    await new StudentAiWorker(options).runOnce();
    assert.ok(beforeRow, 'provider must execute with a reserved lease');
    const afterRow = (await f.pool.query('SELECT state,lease_nonce,reserved_microusd,report FROM student_ai_reports WHERE classroom_id=$1', [f.room])).rows[0];
    const afterUsage = (await f.pool.query('SELECT scope,reserved_microusd,consumed_microusd,input_tokens,output_tokens FROM ai_usage_daily ORDER BY scope')).rows;
    assert.deepEqual(afterRow, beforeRow);
    assert.deepEqual(afterUsage, beforeUsage);
  }));
});

test('shared AI quota denial preserves retry and later permits generation', { timeout: 120000 }, async () => {
  const { StudentAiWorker } = await worker();
  const { ActivityAiService } = await Promise.all([import("../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/service.js"),import("../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/worker.js"),import("../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/provenance.js")]).then(([m0,m1,m2]) => Object.freeze({ActivityAiService: m0.ActivityAiService,ActivityAiWorker: m1.ActivityAiWorker,validateActivityGeneration: m2.validateActivityGeneration}));
  const { reserve } = await import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/budget.ts");
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), { calls, options } = setup(f);
    options.configuration = { ...configuration, dailyGlobalRequests: 1 };
    await submitted(f);
    const activity = await new ActivityAiService(f.options).start(f.T, f.room, { ...f.start, revision: await f.revision() });
    const spent = await local.database.$transaction(raw => reserve({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) },
      { id: activity.view.id, owner_id: f.teacher }, 20, options.configuration, 'activity_ai_generations'));
    assert.equal(spent, true);
    const run = new StudentAiWorker(options);
    await run.runOnce();
    const rows = async () => (await f.pool.query('SELECT id,state,error_code,attempt_count,dispatch_count FROM student_ai_reports WHERE classroom_id=$1', [f.room])).rows;
    const [denied] = await rows();
    assert.equal(denied.state, 'FAILED'); assert.equal(denied.error_code, 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED');
    assert.equal((await f.classrooms.getStudentAiReport(f.T, f.room, f.student)).error, denied.error_code);
    assert.equal(denied.dispatch_count, 0); assert.equal(calls.filter(([kind]) => kind === 'generate').length, 0);
    await run.runOnce(); assert.deepEqual(await rows(), [denied]);
    // Advance only this disposable fixture beyond the retry interval and simulate a fresh daily quota.
    await f.pool.query("UPDATE student_ai_reports SET updated_at=clock_timestamp()-interval '25 hours' WHERE id=$1", [denied.id]);
    await f.pool.query("UPDATE ai_usage_daily SET request_count=0 WHERE scope='global' AND capability='study-plan-v1'");
    await run.runOnce();
    const [ready] = await rows();
    assert.equal(ready.id, denied.id); assert.equal(ready.attempt_count, denied.attempt_count);
    assert.equal(ready.state, 'READY'); assert.equal(ready.dispatch_count, 1);
    assert.equal(calls.filter(([kind]) => kind === 'generate').length, 1);
  }));
});

test('teacher receives titles for matching evidence only; provider never receives titles', { timeout: 120000 }, async () => {
  const { StudentAiWorker } = await worker();
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), { calls, options } = setup(f);
    await submitted(f);
    await new StudentAiWorker(options).runOnce();
    const ready = await f.classrooms.getStudentAiReport(f.T, f.room, f.student);
    assert.equal(ready.state, 'READY');
    assert.deepEqual(ready.evidenceReferences, [{ ref: 'A1', title: 'TITULO_PRIVADO' }]);
    for (const [, input] of calls) assert.doesNotMatch(JSON.stringify(input.evidence), /TITULO_PRIVADO/);
    // A stored report with a nonmatching digest must not expose its reference mapping.
    await f.pool.query('UPDATE student_ai_reports SET evidence_hash=$2 WHERE classroom_id=$1', [f.room, '0'.repeat(64)]);
    const stale = await f.classrooms.getStudentAiReport(f.T, f.room, f.student);
    assert.notEqual(stale.state, 'READY'); assert.equal(stale.report, null);
    assert.deepEqual(stale.evidenceReferences ?? [], []);
  }));
});

test('reordering indistinguishable activities invalidates the prior reference mapping', { timeout: 120000 }, async () => {
  const { StudentAiWorker } = await worker();
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), { options } = setup(f);
    const first = await submitted(f), second = await submitted(f);
    await f.pool.query("UPDATE activities SET title='SEGUNDA' WHERE id=$1", [second]);
    await f.pool.query("UPDATE activities SET published_at=CASE WHEN id=$1::uuid THEN '2025-01-01'::timestamptz ELSE '2025-01-02'::timestamptz END WHERE id IN ($1::uuid,$2::uuid)", [first, second]);
    await new StudentAiWorker(options).runOnce();
    const initial = await f.classrooms.getStudentAiReport(f.T, f.room, f.student);
    assert.equal(initial.state, 'READY');
    await f.pool.query("UPDATE activities SET published_at=CASE WHEN id=$1::uuid THEN '2025-01-02'::timestamptz ELSE '2025-01-01'::timestamptz END WHERE id IN ($1::uuid,$2::uuid)", [first, second]);
    const reordered = await f.classrooms.getStudentAiReport(f.T, f.room, f.student);
    assert.notEqual(reordered.state, 'READY'); assert.equal(reordered.report, null);
    assert.deepEqual(reordered.evidenceReferences ?? [], []);
  }));
});

test('report retry keeps a stored V1 profile and fresh evidence uses the active V2 profile', { timeout: 120000 }, async () => {
  const { StudentAiWorker } = await worker();
  const { configuredExecutionProfiles } = await import('../apps/api/src/platform/ai/execution-snapshot.ts');
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    await local.pool.query("SET LOCAL application_name = 'foxmind-api-ai-execution-v1'");
    const f = await fixture(local), { options } = setup(f);
    const active = configuredExecutionProfiles(configuration);
    const legacy = { ...active, analysis: { ...active.analysis, promptVersion: 'student-report-v1' } };
    await f.pool.query('INSERT INTO ai_execution_policy(singleton,baseline_profiles,active_profiles) VALUES(true,$1,$1)', [JSON.stringify(legacy)]);
    await submitted(f);
    const attempts = [];
    let preflightUnavailable = true;
    options.providerForExecution = ({ executionProfile }) => ({
      async countStudentAiTokens() {
        attempts.push(['count', executionProfile.promptVersion]);
        if (preflightUnavailable) throw new Error('synthetic preflight unavailable');
        return 20;
      },
      async generateStudentAi() {
        attempts.push(['generate', executionProfile.promptVersion]);
        return { json: report, inputTokens: 20, outputTokens: 20 };
      },
    });
    const worker = new StudentAiWorker(options);
    await worker.runOnce();
    await f.pool.query('UPDATE ai_execution_policy SET active_profiles=$1 WHERE singleton', [JSON.stringify(active)]);
    await f.pool.query("UPDATE student_ai_reports SET updated_at=clock_timestamp()-interval '2 minutes' WHERE classroom_id=$1", [f.room]);
    preflightUnavailable = false;
    await worker.runOnce();
    assert.equal((await f.classrooms.getStudentAiReport(f.T, f.room, f.student)).state, 'READY');
    await submitted(f);
    await worker.runOnce();
    assert.equal((await f.classrooms.getStudentAiReport(f.T, f.room, f.student)).state, 'READY');
    assert.deepEqual(attempts, [
      ['count', 'student-report-v1'],
      ['count', 'student-report-v1'], ['generate', 'student-report-v1'],
      ['count', 'student-report-v2'], ['generate', 'student-report-v2'],
    ]);
  }));
});
