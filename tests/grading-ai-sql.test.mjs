import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';

const configuration = { maxConcurrency: 1, deadlineMs: 30000, dailyActorRequests: 2, dailyGlobalRequests: 2,
  maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 1 };
const proposal = { schemaVersion: 'grading-proposal-v1', overallGrade: '7.00', overallFeedback: 'Bien', questions: [], warnings: [] };
async function setup(pool) {
  const teacher = randomUUID(), student = randomUUID(), room = randomUUID(), activity = randomUUID(), enrollment = randomUUID(),
    obligation = randomUUID(), attempt = randomUUID(), job = randomUUID();
  for (const id of [teacher, student]) await pool.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
    VALUES($1,now(),$2,$2,'Synthetic','Fixture','fixture',now())`, [id, `${id}@example.test`]);
  await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,ai_grading_enabled)
    VALUES($1,now(),$2,'Aula','Materia','A',2026,'UTC','explore',1000000,true)`, [room, teacher]);
  await pool.query(`INSERT INTO activities(id,updated_at,classroom_id,type,status,ai_grading_rubric)
    VALUES($1,now(),$2,'ASSIGNMENT','DRAFT','Justificar')`, [activity, room]);
  await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
  await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
  await pool.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
    VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT')`, [obligation, room, enrollment, activity]);
  await pool.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,submitted_at,submitted_late)
    VALUES($1,now(),$2,$3,1,'SUBMITTED',now(),false)`, [attempt, obligation, activity]);
  await pool.query(`INSERT INTO grading_ai_jobs(id,classroom_id,activity_id,attempt_id,owner_id,rubric_snapshot,epoch)
    VALUES($1,$2,$3,$4,$5,'Justificar',0)`, [job, room, activity, attempt, teacher]);
  return { teacher, student, room, activity, enrollment, attempt, job };
}
const state = async (pool, id) => (await pool.query('SELECT state,lease_nonce,dispatch_count,error_code,proposal,reserved_microusd FROM grading_ai_jobs WHERE id=$1', [id])).rows[0];
const queue = async database => (await import('../apps/api/src/classrooms/grading-ai/sql-queue.ts')).createGradingAiSqlQueue({ database, configuration });

test('SQL durable grading AI en PostgreSQL efímero aislado', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    await t.test('claim simultáneo solo concede un lease al mismo trabajo', async () => {
      const f = await setup(pool), q = await queue(database);
      const claims = await Promise.all([q.claim(), q.claim()]);
      const taken = claims.filter(Boolean); assert.equal(taken.length, 1);
      assert.equal(taken[0].id, f.job); assert.ok(taken[0].leaseNonce);
      const saved = await state(pool, f.job); assert.equal(saved.state, 'RUNNING'); assert.equal(saved.lease_nonce, taken[0].leaseNonce);
      await pool.query("UPDATE grading_ai_jobs SET state='STALE',lease_nonce=NULL,lease_until=NULL WHERE id=$1", [f.job]);
    });
    await t.test('cambio de epoch invalida claim y no persiste propuesta tardía', async () => {
      const f = await setup(pool), q = await queue(database), claimed = await q.claim();
      assert.equal(claimed.id, f.job); assert.equal(await q.isCurrent(claimed), true);
      await pool.query('UPDATE classrooms SET ai_grading_enabled=false,ai_grading_epoch=ai_grading_epoch+1 WHERE id=$1', [f.room]);
      assert.equal(await q.isCurrent(claimed), false); await q.finish(claimed, 'READY', proposal);
      const saved = await state(pool, f.job); assert.notEqual(saved.state, 'READY'); assert.equal(saved.proposal, null);
    });
    await t.test('lease reemplazado no permite a worker anterior cambiar estado ni propuesta', async () => {
      const f = await setup(pool), q = await queue(database), claimed = await q.claim(), replacement = randomUUID();
      assert.equal(claimed.id, f.job);
      await pool.query("UPDATE grading_ai_jobs SET lease_nonce=$2,lease_until=now()+interval '1 minute' WHERE id=$1", [f.job, replacement]);
      await q.finish(claimed, 'READY', proposal);
      const saved = await state(pool, f.job); assert.equal(saved.lease_nonce, replacement); assert.equal(saved.state, 'RUNNING'); assert.equal(saved.proposal, null);
      await pool.query("UPDATE grading_ai_jobs SET state='STALE',lease_nonce=NULL,lease_until=NULL WHERE id=$1", [f.job]);
    });
    await t.test('otra capacidad activa participa del límite de concurrencia global', async () => {
      const f = await setup(pool), q = await queue(database);
      await pool.query(`INSERT INTO student_ai_reports(id,enrollment_id,classroom_id,owner_id,evidence_hash,state,lease_nonce,lease_until)
        VALUES($1,$2,$3,$4,'hash','RUNNING',$5,now()+interval '1 minute')`, [randomUUID(), f.enrollment, f.room, f.teacher, randomUUID()]);
      assert.equal(await q.claim(), null); assert.equal((await state(pool, f.job)).state, 'QUEUED');
      await pool.query("UPDATE student_ai_reports SET state='FAILED',lease_nonce=NULL,lease_until=NULL WHERE enrollment_id=$1", [f.enrollment]);
      await pool.query("UPDATE grading_ai_jobs SET state='STALE' WHERE id=$1", [f.job]);
    });
    await t.test('presupuesto ya consumido por otras capacidades impide reservar y no despacha', async () => {
      const f = await setup(pool), q = await queue(database), claimed = await q.claim(); assert.equal(claimed.id, f.job);
      await pool.query(`INSERT INTO ai_usage_daily(day,scope,capability,request_count) VALUES((now() AT TIME ZONE 'UTC')::date,'global','study-plan-v1',$1)
        ON CONFLICT(day,scope,capability) DO UPDATE SET request_count=$1`, [configuration.dailyGlobalRequests]);
      assert.equal(await q.reserve(claimed, 30), false);
      const saved = await state(pool, f.job); assert.equal(saved.dispatch_count, 0); assert.equal(String(saved.reserved_microusd), '0');
      await pool.query("UPDATE grading_ai_jobs SET state='STALE',lease_nonce=NULL,lease_until=NULL WHERE id=$1", [f.job]);
      await pool.query('DELETE FROM ai_usage_daily');
    });
    await t.test('recuperación de lease vencido tras despacho lo marca incierto y no lo vuelve a reclamar', async () => {
      const f = await setup(pool), q = await queue(database), claimed = await q.claim(); assert.equal(claimed.id, f.job);
      assert.equal(await q.reserve(claimed, 30), true);
      await pool.query("UPDATE grading_ai_jobs SET lease_until=now()-interval '1 second' WHERE id=$1", [f.job]);
      await q.recover(); const saved = await state(pool, f.job);
      assert.equal(saved.state, 'FAILED'); assert.equal(saved.error_code, 'PROVIDER_OUTCOME_UNKNOWN');
      assert.equal(String(saved.reserved_microusd), '0'); assert.equal(await q.claim(), null);
    });
  });
});
