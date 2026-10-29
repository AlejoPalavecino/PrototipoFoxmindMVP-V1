import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { enqueueSubmittedAttemptGradingAi } from '../apps/api/src/classrooms/grading-ai/enqueue.ts';
import { GradingAiRuntime } from '../apps/api/src/classrooms/grading-ai/runtime.ts';

const configuration = { maxConcurrency: 2, deadlineMs: 30000, dailyActorRequests: 20, dailyGlobalRequests: 20,
  maxInputTokens: 10000, maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 5 };
const output = { schemaVersion: 'grading-proposal-v1', overallGrade: '7.00', overallFeedback: 'Buen trabajo', questions: [], warnings: [] };
const digest = 'a'.repeat(64);
async function fixture(pool, database, inherited = false) {
  const teacher = randomUUID(), student = randomUUID(), room = randomUUID(), activity = randomUUID(), enrollment = randomUUID(),
    obligation = randomUUID(), attempt = randomUUID(), oldAttempt = inherited ? randomUUID() : attempt, attachment = randomUUID(), instruction = randomUUID();
  for (const id of [teacher, student]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
    VALUES($1,now(),$2,$2,'Nombre','Sintético','fixture',now())`, [id, `${id}@example.test`]);
  await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,ai_grading_enabled)
    VALUES($1,now(),$2,'Aula','Materia','A',2026,'UTC','explore',1000000,true)`, [room, teacher]);
  await pool.query(`INSERT INTO activities(id,updated_at,classroom_id,type,status,ai_grading_rubric,instructions_text)
    VALUES($1,now(),$2,'ASSIGNMENT','DRAFT','Justificar','')`, [activity, room]);
  await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
  await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
  await pool.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
    VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT')`, [obligation, room, enrollment, activity]);
  if (inherited) await pool.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,submitted_at,submitted_late)
    VALUES($1,now(),$2,$3,1,'SUBMITTED',now(),false)`, [oldAttempt, obligation, activity]);
  await pool.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,submitted_at,submitted_late)
    VALUES($1,now(),$2,$3,$4,'SUBMITTED',now(),false)`, [attempt, obligation, activity, inherited ? 2 : 1]);
  for (const [fileId, owner, purpose, target] of [[attachment, student, 'attachment', oldAttempt], [instruction, teacher, 'instructions', activity]]) {
    await pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'sintético.pdf','pdf','application/pdf',10,'APPROVED','CLEAN',now(),now())`,
      [fileId, room, owner, `synthetic/${fileId}`]);
    await pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',10,now())`, [randomUUID(), fileId]);
    await pool.query(`INSERT INTO file_custodies(file_id,purpose,target_id,phase,digest,validated_digest,scanned_digest)
      VALUES($1,$2,$3,'ready',$4,$4,$4)`, [fileId, purpose, target, digest]);
  }
  await pool.query('INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position) VALUES($1,$2,$3,$4,0)', [attempt, activity, room, attachment]);
  await pool.query('INSERT INTO activity_instruction_files(activity_id,classroom_id,file_id) VALUES($1,$2,$3)', [activity, room, instruction]);
  await database.$transaction(raw => enqueueSubmittedAttemptGradingAi({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) },
    { classroomId: room, activityId: activity, attemptId: attempt }));
  return { teacher, student, room, activity, attempt, attachment, instruction, oldAttempt };
}
function adapters(f, options = {}) {
  const reads = [], calls = [], contents = { [f.attachment]: 'Respuesta adjunta sintética', [f.instruction]: 'Consigna adjunta sintética' };
  const makeReader = kind => ({ read: async (grant, signal) => {
    reads.push({ kind, grant }); assert.equal(signal.aborted, false); assert.equal(grant.ownerId, f.teacher);
    assert.equal(grant.classroomId, f.room); assert.equal(grant.attemptId, f.attempt); assert.equal(grant.digest, digest);
    assert.equal(grant.fileId, kind === 'attachment' ? f.attachment : f.instruction);
    if (options.fail === kind) throw new Error('FILE_NOT_READY');
    return { kind: 'text', text: contents[grant.fileId], warnings: [] };
  } });
  const provider = { countGradingAiTokens: async input => { calls.push(['count', input]); return 30; },
    generateGradingAi: async input => { calls.push(['generate', input]); if (options.generate) await options.generate();
      return { json: structuredClone(output), inputTokens: 30, outputTokens: 20 }; } };
  return { reads, calls, provider, reader: makeReader('attachment'), instructionReader: makeReader('instruction') };
}
const state = async (pool, id) => (await pool.query('SELECT state,proposal,dispatch_count FROM grading_ai_jobs WHERE attempt_id=$1', [id])).rows[0];
function worker(database, ports) { return new GradingAiRuntime({ database, configuration, provider: ports.provider,
  reader: ports.reader, instructionReader: ports.instructionReader }); }


test('revocaciones durante última lectura impiden incluso el preflight externo', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    for (const mutation of ['disable', 'revoke-instruction']) await t.test(mutation, async () => {
      const f = await fixture(pool, database), p = adapters(f), original = p.instructionReader.read;
      let changed = false;
      p.instructionReader.read = async (...args) => {
        const value = await original(...args);
        if (mutation === 'disable') await pool.query('UPDATE classrooms SET ai_grading_enabled=false,ai_grading_epoch=ai_grading_epoch+1 WHERE id=$1', [f.room]);
        else {
          const result = await pool.query('DELETE FROM activity_instruction_files WHERE activity_id=$1 AND file_id=$2', [f.activity, f.instruction]);
          assert.equal(result.rowCount, 1);
        }
        changed = true; return value;
      };
      await worker(database, p).runOnce(); assert.equal(changed, true, 'revocación ocurrió tras la lectura de consigna');
      assert.equal(p.calls.length, 0, 'no enviar evidencia revocada ni siquiera a conteo externo');
      const saved = await state(pool, f.attempt); assert.notEqual(saved.state, 'READY'); assert.equal(saved.proposal, null); assert.equal(saved.dispatch_count, 0);
    });
  });
});
