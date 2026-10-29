import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { enqueueSubmittedAttemptGradingAi } from '../apps/api/src/classrooms/grading-ai/enqueue.ts';

const configuration = { maxConcurrency: 2, deadlineMs: 30000, dailyActorRequests: 20, dailyGlobalRequests: 20,
  maxInputTokens: 10000, maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 5 };
const result = { schemaVersion: 'grading-proposal-v1', overallGrade: null, overallFeedback: 'Devolución sintética',
  questions: [{ ref: 'Q1', points: '1.00', feedback: 'Bien' }], warnings: [] };
async function fixture(pool, database) {
  const teacher = randomUUID(), student = randomUUID(), room = randomUUID(), activity = randomUUID(), enrollment = randomUUID(),
    obligation = randomUUID(), attempt = randomUUID(), question = randomUUID();
  for (const id of [teacher, student]) await pool.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
    VALUES($1,now(),$2,$2,'Nombre','Sintético','fixture',now())`, [id, `${id}@example.test`]);
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
  const { GradingAiRuntime } = await import('../apps/api/src/classrooms/grading-ai/runtime.ts');
  return new GradingAiRuntime({ database, configuration, provider, reader: { read: async () => { throw new Error('No hay archivos en fixture'); } } });
}
function provider() {
  const calls = [];
  return { calls, countGradingAiTokens: async input => { calls.push(['count', input]); return 30; },
    generateGradingAi: async input => { calls.push(['generate', input]); return { json: structuredClone(result), inputTokens: 30, outputTokens: 20 }; } };
}


test('runtime contabiliza tokens reales y drena solicitudes activas al cerrar', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    await t.test('resultado confirmado liquida uso real, no reserva máxima', async () => {
      const f = await fixture(pool, database), p = provider(), worker = await runtime(database, p);
      assert.equal(await worker.runOnce(), true);
      assert.equal((await job(pool, f.attempt)).state, 'READY');
      const usage = (await pool.query("SELECT reserved_microusd,consumed_microusd,input_tokens,output_tokens FROM ai_usage_daily WHERE scope='global'")).rows[0];
      assert.equal(String(usage.reserved_microusd), '0');
      assert.equal(String(usage.consumed_microusd), '50'); // 30 input + 20 output at one USD/million each
      assert.equal(String(usage.input_tokens), '30'); assert.equal(String(usage.output_tokens), '20');
    });
    await t.test('cierre aborta despacho en vuelo y espera liquidación antes de volver', async () => {
      const f = await fixture(pool, database), p = provider(); let started, release, abortObserved = false;
      const entered = new Promise(resolve => { started = resolve; });
      p.generateGradingAi = async input => {
        p.calls.push(['generate', input]); started();
        return new Promise((resolve, reject) => {
          release = () => reject(new Error('cleanup timeout fixture'));
          input.signal.addEventListener('abort', () => { abortObserved = true; reject(new Error('ABORT')); }, { once: true });
        });
      };
      const worker = await runtime(database, p), running = worker.runOnce();
      await Promise.race([entered, running.then(() => { throw new Error('terminó antes del despacho'); })]);
      const closing = worker.onModuleDestroy(); let timer;
      const outcome = await Promise.race([closing.then(() => 'closed'), new Promise(resolve => { timer = setTimeout(() => resolve('timeout'), 700); })]);
      clearTimeout(timer);
      if (outcome === 'timeout') { release(); await Promise.allSettled([running, closing]); }
      assert.equal(outcome, 'closed', 'el cierre debe abortar y drenar, sin esperar el timeout del proveedor');
      assert.equal(abortObserved, true);
      const saved = await job(pool, f.attempt); assert.equal(saved.state, 'FAILED'); assert.equal(saved.error_code, 'PROVIDER_OUTCOME_UNKNOWN');
      assert.equal(String(saved.reserved_microusd), '0');
      assert.equal(await worker.runOnce(), false);
    });
  });
});
