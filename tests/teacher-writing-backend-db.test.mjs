import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withTeacherSupportDatabase } from '../scripts/teacher-support-test-runtime.mjs';
import { createAcademicRuntime } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
import { TeacherWritingWorker } from '../.build/api/apps/api/src/modules/grading/student-analysis/infrastructure/teacher-writing-worker.js';
import { PrismaService } from '../.build/api/apps/api/src/platform/database/prisma.service.js';
import { reserveAiMonthlyBudget } from '../.build/api/apps/api/src/platform/ai/monthly-budget.js';

const configuration = { model: 'synthetic-test-model', maxInputTokens: 5000, maxOutputTokens: 512, deadlineMs: 5000,
  maxConcurrency: 2, dailyActorRequests: 20, dailyGlobalRequests: 40, dailyBudgetUsd: 10,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
const feedback = { strengths: [{ text: 'Justifica una decisión en esta entrega.', evidenceRefs: ['A1'] }],
  improvements: [], nextStep: null };
const result = { json: feedback, inputTokens: 50, outputTokens: 20 };

async function account(db, role) {
  const id = randomUUID();
  await db.query(`INSERT INTO users (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES ($1,now(),$2,$2,'Persona','Privada','fixture',now(),$3)`, [id, `${id}@example.test`, role]);
  return { id };
}

async function member(db, teacher, student) {
  const classroom = randomUUID(), enrollment = randomUUID(), period = randomUUID(), unit = randomUUID(), topic = randomUUID();
  await db.query(`INSERT INTO classrooms (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES ($1,now(),$2,'Aula privada','Arte','A',2026,'UTC','explore',1)`, [classroom, teacher.id]);
  await db.query('INSERT INTO enrollments (id,updated_at,classroom_id,student_id) VALUES ($1,now(),$2,$3)', [enrollment, classroom, student.id]);
  await db.query(`INSERT INTO membership_periods (id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES ($1,now(),$2,$3,'CODE')`, [period, enrollment, classroom]);
  await db.query(`INSERT INTO units (id,updated_at,classroom_id,name,position) VALUES ($1,now(),$2,'Luz',0)`, [unit, classroom]);
  await db.query(`INSERT INTO topics (id,updated_at,classroom_id,unit_id,name,position) VALUES ($1,now(),$2,$3,'Sombra',0)`, [topic, classroom, unit]);
  return { classroom, enrollment, period, unit, topic };
}

async function written(db, { classroom, enrollment, unit, topic }, title, text, submitted = true) {
  const activity = randomUUID(), obligation = randomUUID(), attempt = randomUUID();
  await db.query(`INSERT INTO activities(id,updated_at,classroom_id,unit_id,topic_id,type,title,instructions_text,status,published_at,evaluation_rubric)
    VALUES($1,now(),$2,$3,$4,'ASSIGNMENT',$5,'Justificá una decisión.','PUBLISHED',now(),
      '[{"name":"Claridad","description":"Explicá por qué.","weight":100}]')`, [activity, classroom, unit, topic, title]);
  await db.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
    VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT')`, [obligation, classroom, enrollment, activity]);
  await db.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,status,attempt_number,opened_at,
    submitted_at,submitted_late,practical_response)
    VALUES($1,now(),$2,$3,CASE WHEN $4 THEN 'SUBMITTED'::"AttemptStatus" ELSE 'DRAFT'::"AttemptStatus" END,1,
      clock_timestamp()-interval '1 minute',CASE WHEN $4 THEN clock_timestamp() END,CASE WHEN $4 THEN false END,$5)`,
  [attempt, obligation, activity, submitted, text]);
  return { activity, attempt };
}

function runtime(database) {
  return createAcademicRuntime({ database, teacherWritingEnabled: true, authenticate: async (_tx, request) => request.id,
    files: { load: async () => assert.fail('unexpected file read'), loadAuthorized: async () => assert.fail('unexpected file read'),
      promoteDraftPlanInTransaction: async () => assert.fail('unexpected file write') },
    signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 1n, webOrigin: 'http://127.0.0.1:3000' });
}

test('explicit teacher writing uses secure current evidence, retries preflight, settles once and clears stale reports', { timeout: 120000 }, async t => {
  await withTeacherSupportDatabase(async ({ database: db, databaseUrl }) => {
    const prisma = new PrismaService(databaseUrl);
    try {
      const teacher = await account(db, 'teacher'), student = await account(db, 'student');
      const outsider = await account(db, 'teacher'), rooms = await member(db, teacher, student);
      const writing = runtime(prisma).grading.teacherWriting;
      const get = () => writing.getTeacherWriting(teacher, rooms.classroom, student.id);
      const start = () => writing.startTeacherWriting(teacher, rooms.classroom, student.id);
      const calls = [];
      let failCount = true;
      const provider = { countWritingTokens: async ({ evidence }) => {
        calls.push(['count', evidence]);
        if (failCount) throw new Error('synthetic preflight failure');
        return 50;
      }, generateWriting: async ({ evidence }) => { calls.push(['generate', evidence]); return result; } };
      const worker = new TeacherWritingWorker(prisma, configuration, provider);
      assert.equal((await get()).state, 'INSUFFICIENT');
      const original = await written(db, rooms, 'Nombre reservado de actividad', 'Cambié la posición para mejorar la iluminación.');
      await written(db, rooms, 'Borrador secreto', 'Contenido de borrador que no debe enviarse.', false);
      await t.test('GET is passive and POST deduplicates concurrent teacher requests and denies foreign readers', async () => {
        assert.equal((await get()).state, 'AVAILABLE');
        assert.equal(await worker.runOnce(), false);
        assert.deepEqual(calls, []);
        for (const actor of [student, outsider]) {
          await assert.rejects(writing.getTeacherWriting(actor, rooms.classroom, student.id), { code: 'FORBIDDEN' });
          await assert.rejects(writing.startTeacherWriting(actor, rooms.classroom, student.id), { code: 'FORBIDDEN' });
        }
        assert.deepEqual((await Promise.all([start(), start(), start()])).map(row => row.state), ['RUNNING', 'RUNNING', 'RUNNING']);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM teacher_writing_reports')).rows[0].n, 1);
      });
      await t.test('preflight can retry without a charge and READY exposes one authorized link', async () => {
        assert.equal(await worker.runOnce(), true);
        assert.equal((await get()).error, 'AI_UNAVAILABLE');
        assert.equal((await db.query('SELECT count(*)::int AS n FROM ai_monthly_reservations')).rows[0].n, 0);
        await db.query("UPDATE teacher_writing_reports SET updated_at=clock_timestamp()-interval '10 seconds'");
        failCount = false;
        assert.equal((await start()).state, 'RUNNING');
        assert.equal(await worker.runOnce(), true);
        const ready = await get();
        assert.equal(ready.state, 'READY');
        assert.deepEqual(ready.report.strengths[0].sources, [{ activityId: original.activity, attemptId: original.attempt, title: 'Nombre reservado de actividad' }]);
        const opened = await writing.getTeacherWritingEvidence(teacher, rooms.classroom, student.id, original.attempt);
        assert.equal(opened.grade, null);
        assert.match(opened.texts[0].text, /iluminación/);
        for (const [, evidence] of calls) {
          const payload = JSON.stringify(evidence);
          for (const forbidden of [teacher.id, student.id, rooms.classroom, original.activity, original.attempt,
            'Nombre reservado de actividad', 'borrador', 'Persona Privada']) assert.ok(!payload.includes(forbidden), forbidden);
          assert.match(payload, /Claridad/);
        }
        assert.equal((await start()).state, 'READY');
        assert.equal(await worker.runOnce(), false);
        assert.equal(calls.filter(([operation]) => operation === 'generate').length, 1);
        assert.deepEqual((await db.query(`SELECT owner_id,capability,status,actor_microusd::int AS amount FROM ai_monthly_reservations`)).rows,
          [{ owner_id: teacher.id, capability: 'writing-analysis', status: 'SETTLED', amount: 90 }]);
      });
      await t.test('TTL hides and scrubs an old result even when analysis configuration is disabled', async () => {
        await db.query("UPDATE teacher_writing_reports SET created_at=clock_timestamp()-interval '31 days'");
        assert.equal((await get()).state, 'AVAILABLE');
        await assert.rejects(writing.getTeacherWritingEvidence(teacher, rooms.classroom, student.id, original.attempt), { code: 'FORBIDDEN' });
        await new TeacherWritingWorker(prisma, undefined).runOnce();
        assert.equal((await db.query('SELECT count(*)::int AS n FROM teacher_writing_reports')).rows[0].n, 0);
        assert.equal((await start()).state, 'RUNNING');
        await db.query(`UPDATE teacher_writing_reports SET state='RUNNING',lease_nonce=gen_random_uuid(),
          lease_until=clock_timestamp()-interval '1 hour'`);
        await new TeacherWritingWorker(prisma, undefined).runOnce();
        assert.deepEqual((await db.query('SELECT reference_map FROM teacher_writing_reports')).rows, [{ reference_map: [] }]);
        await new TeacherWritingWorker(prisma, configuration).runOnce();
        await db.query("UPDATE teacher_writing_reports SET updated_at=clock_timestamp()-interval '10 seconds'");
      });
      await t.test('membership revocation in flight erases output and settles actual cost under the teacher only', async () => {
        let generating, release;
        const entered = new Promise(resolve => { generating = resolve; });
        const done = new Promise(resolve => { release = resolve; });
        const held = new TeacherWritingWorker(prisma, configuration, { countWritingTokens: async () => 50,
          generateWriting: async () => { generating(); await done; return result; } });
        assert.equal((await start()).state, 'RUNNING');
        const running = held.runOnce();
        try {
          await Promise.race([entered, running.then(() => assert.fail('worker never dispatched'))]);
          await db.query("UPDATE membership_periods SET ended_at=clock_timestamp(),end_reason='REMOVED',ended_by_id=$1 WHERE id=$2", [teacher.id, rooms.period]);
        } finally { release(); }
        assert.equal(await running, true);
        await assert.rejects(get(), { code: 'FORBIDDEN' });
        const [row] = (await db.query('SELECT state,report,reference_map FROM teacher_writing_reports')).rows;
        assert.deepEqual(row, { state: 'STALE', report: null, reference_map: [] });
        assert.equal((await db.query("SELECT count(*)::int AS n FROM ai_monthly_reservations WHERE owner_id=$1 AND status='SETTLED'", [teacher.id])).rows[0].n, 2);
        assert.equal((await db.query('SELECT count(*)::int AS n FROM ai_monthly_reservations WHERE owner_id=$1', [student.id])).rows[0].n, 0);
      });
      await t.test('an exhausted monthly allowance blocks even sending text for provider preflight', async () => {
        const second = await member(db, teacher, student);
        await written(db, second, 'Otra actividad', 'Ordené la respuesta por pasos.');
        await prisma.$transaction(raw => reserveAiMonthlyBudget({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) },
          { namespace: 'quota-fixture', jobId: randomUUID(), ownerId: teacher.id }, 4_999_820n,
          { capability: 'fixture', provider: 'gemini', model: 'synthetic', pricing: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 } }));
        const before = calls.length;
        assert.equal((await writing.startTeacherWriting(teacher, second.classroom, student.id)).state, 'RUNNING');
        assert.equal(await worker.runOnce(), true);
        const failed = await writing.getTeacherWriting(teacher, second.classroom, student.id);
        assert.deepEqual(failed, { state: 'FAILED', report: null, generatedAt: null, error: 'AI_MONTHLY_BUDGET_EXCEEDED' });
        assert.equal(calls.length, before);
      });
      await t.test('another teacher retains an independent monthly allowance for the same student', async () => {
        const other = await member(db, outsider, student);
        await written(db, other, 'Otra aula', 'Expuse la conclusión con un ejemplo propio.');
        assert.equal((await writing.startTeacherWriting(outsider, other.classroom, student.id)).state, 'RUNNING');
        assert.equal(await worker.runOnce(), true);
        assert.equal((await writing.getTeacherWriting(outsider, other.classroom, student.id)).state, 'READY');
        await assert.rejects(writing.getTeacherWriting(teacher, other.classroom, student.id), { code: 'FORBIDDEN' });
        assert.deepEqual((await db.query(`SELECT capability,actor_microusd::int AS amount FROM ai_monthly_reservations
          WHERE owner_id=$1`, [outsider.id])).rows, [{ capability: 'writing-analysis', amount: 90 }]);
      });
    } finally { await prisma.$disconnect(); }
  });
});
