import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { enqueueSubmittedAttemptGradingAi } from '../apps/api/src/modules/grading/infrastructure/grading-ai/enqueue.ts';

const configuration = { maxConcurrency: 2, deadlineMs: 30000, dailyActorRequests: 20, dailyGlobalRequests: 20,
  maxInputTokens: 10000, maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 5 };
const result = { schemaVersion: 'grading-proposal-v1', overallGrade: null, overallFeedback: 'Devolución sintética',
  questions: [{ ref: 'Q1', points: '1.00', feedback: 'Bien' }], warnings: [] };
async function fixture(pool, database) {
  const teacher = randomUUID(), student = randomUUID(), room = randomUUID(), activity = randomUUID(), enrollment = randomUUID(),
    obligation = randomUUID(), attempt = randomUUID(), question = randomUUID();
  for (const id of [teacher, student]) await pool.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Nombre','Sintético','fixture',now(),$3)`, [id, `${id}@example.test`, id === student ? 'student' : 'teacher']);
  await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,ai_grading_enabled)
    VALUES($1,now(),$2,'Aula','Materia','A',2026,'UTC','explore',1000000,true)`, [room, teacher]);
  await pool.query(`INSERT INTO activities(id,updated_at,classroom_id,type,status,ai_grading_rubric,instructions_text)
    VALUES($1,now(),$2,'QUESTIONNAIRE','DRAFT','Explicar el criterio','Responde')`, [activity, room]);
  await pool.query(`INSERT INTO questions(id,updated_at,activity_id,type,prompt,position,available_points)
    VALUES($1,now(),$2,'DEVELOPMENT','Consigna sintética',0,2)`, [question, activity]);
  await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
  await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
  await pool.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
    VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT')`, [obligation, room, enrollment, activity]);
  await pool.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status)
    VALUES($1,now(),$2,$3,1,'DRAFT')`, [attempt, obligation, activity]);
  await pool.query(`INSERT INTO answers(id,updated_at,attempt_id,activity_id,question_id,development_text)
    VALUES($1,now(),$2,$3,$4,'Respuesta sintética')`, [randomUUID(), attempt, activity, question]);
  // Simulates the submission boundary, not the HTTP endpoint or its authentication.
  await database.$transaction(async raw => {
    await raw.$queryRawUnsafe("UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1 RETURNING id", attempt);
    assert.equal(await enqueueSubmittedAttemptGradingAi({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) },
      { classroomId: room, activityId: activity, attemptId: attempt }), true);
  });
  return { teacher, student, room, activity, enrollment, obligation, attempt, question };
}
const job = async (pool, attempt) => (await pool.query('SELECT state,proposal,error_code,reserved_microusd,dispatch_count FROM grading_ai_jobs WHERE attempt_id=$1', [attempt])).rows[0];
const count = async (pool, table, column, id) => Number((await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE ${column}=$1`, [id])).rows[0].n);
async function runtime(database, provider) {
  const { GradingAiRuntime } = await import("../apps/api/src/modules/grading/infrastructure/grading-ai/runtime.ts");
  return new GradingAiRuntime({ database, configuration, provider, reader: { read: async () => { throw new Error('No hay archivos en fixture'); } } });
}
function provider() {
  const calls = [];
  return { calls, countGradingAiTokens: async input => { calls.push(['count', input]); return 30; },
    generateGradingAi: async input => { calls.push(['generate', input]); return { json: structuredClone(result), inputTokens: 30, outputTokens: 20 }; } };
}

test('runtime integral con cola SQL, proveedor sintético y PostgreSQL propio', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    await t.test('entrega crea job y genera READY privado desde respuesta y consigna reales', async () => {
      const f = await fixture(pool, database), p = provider(), worker = await runtime(database, p);
      assert.equal((await job(pool, f.attempt)).state, 'QUEUED'); assert.equal(await worker.runOnce(), true);
      const saved = await job(pool, f.attempt); assert.equal(saved.state, 'READY'); assert.deepEqual(saved.proposal, result);
      assert.equal(String(saved.reserved_microusd), '0'); assert.equal(saved.dispatch_count, 1);
      const sent = JSON.stringify(p.calls.find(c => c[0] === 'generate')[1].evidence);
      assert.ok(sent.includes('Respuesta sintética')); assert.ok(sent.includes('Consigna sintética')); assert.ok(sent.includes('Explicar el criterio'));
      assert.ok(!sent.includes(f.student)); assert.ok(!sent.includes(f.teacher));
      assert.equal(await count(pool, 'attempt_grades', 'attempt_id', f.attempt), 0);
      assert.equal(await count(pool, 'notifications', 'attempt_id', f.attempt), 0);
      assert.ok(Number((await pool.query("SELECT coalesce(sum(request_count),0)::int n FROM ai_usage_daily WHERE scope='global'")).rows[0].n) > 0);
    });
    for (const change of ['disable', 'grade']) await t.test(`${change} en vuelo impide persistir READY y no publica`, async () => {
      const f = await fixture(pool, database), p = provider(); let release, entered;
      const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
      p.generateGradingAi = async input => { p.calls.push(['generate', input]); entered(); await gate; return { json: structuredClone(result), inputTokens: 30, outputTokens: 20 }; };
      const worker = await runtime(database, p), running = worker.runOnce();
      await Promise.race([started, running.then(() => { throw new Error('Procesador terminó antes del proveedor'); })]);
      if (change === 'disable') await pool.query('UPDATE classrooms SET ai_grading_enabled=false,ai_grading_epoch=ai_grading_epoch+1 WHERE id=$1', [f.room]);
      else await pool.query(`INSERT INTO attempt_grades(id,updated_at,attempt_id,student_activity_id,activity_id,graded_by_id,overall_feedback)
        VALUES($1,now(),$2,$3,$4,$5,'Edición docente concurrente')`, [randomUUID(), f.attempt, f.obligation, f.activity, f.teacher]);
      release(); await running;
      const saved = await job(pool, f.attempt); assert.equal(saved.state, 'STALE'); assert.equal(saved.proposal, null);
      assert.equal(await count(pool, 'notifications', 'attempt_id', f.attempt), 0);
    });
    await t.test('timeout tras despacho liquida reserva y no reenvía en siguiente ejecución', async () => {
      const f = await fixture(pool, database), p = provider();
      p.generateGradingAi = async input => { p.calls.push(['generate', input]); throw new Error('TIMEOUT'); };
      const worker = await runtime(database, p); await worker.runOnce();
      const saved = await job(pool, f.attempt); assert.equal(saved.state, 'FAILED'); assert.equal(saved.error_code, 'PROVIDER_OUTCOME_UNKNOWN');
      assert.equal(String(saved.reserved_microusd), '0'); await worker.runOnce();
      assert.equal(p.calls.filter(c => c[0] === 'generate').length, 1);
    });
  });
});
