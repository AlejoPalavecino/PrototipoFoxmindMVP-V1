import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { withTeacherSupportDatabase } from '../scripts/teacher-support-test-runtime.mjs';
import { createAcademicRuntime } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
import { TeacherSupportService } from '../.build/api/apps/api/src/modules/grading/progress/application/teacher-support.js';
import { teacherSupportRepository } from '../.build/api/apps/api/src/modules/grading/progress/infrastructure/teacher-support-repository.js';
import { PrismaService } from '../.build/api/apps/api/src/platform/database/prisma.service.js';
import { captureSubmissionReceipt } from '../.build/api/apps/api/src/modules/participation/attempts/infrastructure/submission-receipt.js';

const now = new Date('2030-01-12T15:00:00.000Z');
const timezone = 'America/Argentina/Buenos_Aires';
const inquiry = 'Explicá cómo se modifica la percepción de la luz.';
const writing = 'Cambié la posición de la lámpara para resaltar la textura.';
const list = (service, actor, classroomId = null, page = 1, roster = false) =>
  service.listTeacherSupport(actor, { classroomId, page, roster });

function academicRuntime(database) {
  return createAcademicRuntime({
    database,
    authenticate: async (_tx, request) => request.id,
    files: { load: async () => assert.fail('unexpected file read'), loadAuthorized: async () => assert.fail('unexpected file read'),
      promoteDraftPlanInTransaction: async () => assert.fail('unexpected file write') },
    signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 1n,
    webOrigin: 'http://127.0.0.1:3000',
  });
}

function sessionDatabase(prisma, zone) {
  return {
    $transaction: (operation, options) => prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe('SELECT set_config(\'TimeZone\',$1,true)', zone);
      return operation(tx);
    }, options),
  };
}

function teacherService(prisma) {
  const runtime = academicRuntime(sessionDatabase(prisma, 'UTC'));
  return new TeacherSupportService(runtime.access, { ...teacherSupportRepository, evaluationTime: async () => now }, async () => []);
}

async function withPrisma(databaseUrl, run) {
  const prisma = new PrismaService(databaseUrl);
  try {
    return await run(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyPrismaClock(db, prisma) {
  const epoch = async () => Number((await db.query('SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS ms')).rows[0].ms);
  const teacher = await account(db, 'Docente de fechas', 'teacher');
  const student = await account(db, 'Estudiante de fechas', 'student');
  const classroom = await room(db, teacher, 'Aula de fechas');
  const enrollment = await enroll(db, classroom, student);
  const deadline = new Date(Math.floor((await epoch() - 60_000) / 60_000) * 60_000);
  const dateParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric',
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(deadline).map(part => [part.type, part.value]));
  const pending = await obligation(db, classroom, enrollment, 'Vencida hace un minuto', null);
  for (const sessionZone of ['UTC', timezone]) {
    const runtime = academicRuntime(sessionDatabase(prisma, sessionZone));
    const service = runtime.grading.teacherSupport;
    const authoring = runtime.activities.authoring;
    const previous = await authoring.activityDetail(teacher, classroom.id, pending.activityId);
    await authoring.changeActivities(teacher, classroom.id, {
      revision: previous.revision,
      operation: { action: 'deadline', id: pending.activityId, allowLate: false,
        deadline: { local: `${dateParts.year}-${dateParts.month}-${dateParts.day}T${dateParts.hour}:${dateParts.minute}` } },
    });
    const activity = (await authoring.activityDetail(teacher, classroom.id, pending.activityId)).activity;
    assert.equal(new Date(activity.deadlineAt).toISOString(), deadline.toISOString(), sessionZone);
    const written = await obligation(db, classroom, enrollment, 'Entrega escrita ' + sessionZone, null);
    const { attempts, practicalSubmissions } = runtime.participation;
    const started = await attempts.startActivity(student, classroom.id, written.activityId, {});
    const attemptId = started.attempt.id;
    const editor = { 'x-attempt-editor': started.editor.token, 'x-attempt-epoch': started.editor.epoch };
    const request = { ...student, headers: editor };
    const saved = await practicalSubmissions.savePracticalResponse(request, classroom.id, attemptId, {
      revision: started.attempt.revision, text: writing,
    });
    const receivedAt = captureSubmissionReceipt(request).toISOString();
    const receipt = await practicalSubmissions.submitPracticalAttempt(request, classroom.id, attemptId, { revision: saved.revision, confirm: true });
    assert.equal(receipt.submittedAt.toISOString(), receivedAt, sessionZone);
    const grading = await runtime.grading.review.getAttemptGrading(teacher, classroom.id, attemptId);
    const grade = await runtime.grading.review.saveAttemptGrading(teacher, classroom.id, attemptId, {
      revision: grading.revision, overallGrade: '8', overallFeedback: 'Devolución sobre la composición.', questions: [],
    });
    await runtime.grading.publication.publishAttemptGrade(teacher, classroom.id, attemptId, {
      revision: grade.revision, confirm: true,
    });
    const before = await epoch();
    const record = await service.getTeacherSupport(teacher, classroom.id, student.id);
    const evaluatedAt = Date.parse(record.evaluatedAt);
    assert.ok(evaluatedAt >= before && evaluatedAt <= await epoch(), `${sessionZone}: evaluación fuera del intervalo UTC`);
    assert.equal(record.priority, 'medium', sessionZone);
    assert.equal(Date.parse(record.pending[0].deadlineAt), deadline.getTime(), sessionZone);
    const listing = await list(service, teacher);
    assert.equal(listing.items[0].priority, 'medium', sessionZone);
    const evidence = await service.getTeacherSupportEvidence(teacher, classroom.id, student.id, attemptId);
    const existing = await practicalSubmissions.assignmentSubmission(teacher, classroom.id, attemptId);
    assert.equal(existing.submittedAt.toISOString(), receivedAt, sessionZone);
    assert.equal(evidence.submittedAt, receivedAt, sessionZone);
  }
}

async function measureList(db, service) {
  const teacher = await account(db, 'Docente en carga', 'teacher');
  const classrooms = [];
  for (let index = 1; index <= 4; index++) classrooms.push(await room(db, teacher, 'Aula de carga ' + index));
  const ids = classrooms.map(classroom => classroom.id);
  await db.query(`
    WITH names AS (SELECT gen_random_uuid() AS id, i FROM generate_series(1,45) i),
    people AS (
      INSERT INTO users (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      SELECT id,now(),id::text||'@example.test',id::text||'@example.test','Estudiante',lpad(i::text,2,'0'),'fixture',now(),'student'
      FROM names RETURNING id
    ), enrollments_added AS (
      INSERT INTO enrollments (id,updated_at,classroom_id,student_id)
      SELECT gen_random_uuid(),now(),c.id,p.id FROM classrooms c CROSS JOIN people p WHERE c.id=ANY($1::uuid[])
      RETURNING id,classroom_id
    )
    INSERT INTO membership_periods (id,updated_at,enrollment_id,classroom_id,entry_method)
    SELECT gen_random_uuid(),now(),id,classroom_id,'CODE' FROM enrollments_added`, [ids]);
  await db.query(`
    WITH activities_added AS (
      INSERT INTO activities (id,updated_at,classroom_id,unit_id,topic_id,type,title,status,published_at,deadline_at)
      SELECT gen_random_uuid(),now(),u.classroom_id,u.id,t.id,'ASSIGNMENT',i::text,'PUBLISHED',
        '2029-12-25T12:00Z','2030-01-10T12:00Z'
      FROM units u JOIN topics t ON t.unit_id=u.id CROSS JOIN generate_series(1,25) i WHERE u.classroom_id=ANY($1::uuid[])
      RETURNING id,classroom_id,title
    ), obligations_added AS (
      INSERT INTO student_activities (id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
      SELECT gen_random_uuid(),now(),a.classroom_id,e.id,a.id,true,'INITIAL_ENROLLMENT'
      FROM activities_added a JOIN enrollments e ON e.classroom_id=a.classroom_id
      RETURNING id,activity_id,enrollment_id
    )
    INSERT INTO attempts (id,updated_at,student_activity_id,activity_id,status,attempt_number,opened_at,submitted_at,submitted_late)
    SELECT gen_random_uuid(),now(),o.id,o.activity_id,'SUBMITTED',1,'2030-01-05T12:00Z','2030-01-06T12:00Z',false
    FROM obligations_added o JOIN activities_added a ON a.id=o.activity_id
    JOIN enrollments e ON e.id=o.enrollment_id JOIN users u ON u.id=e.student_id
    WHERE (u.last_name::int%3)<a.title::int`, [ids]);
  const started = performance.now();
  const first = await list(service, teacher);
  const cold = Number((performance.now() - started).toFixed(1));
  assert.deepEqual(first.counts, { high: 60, medium: 60, low: 60 });
  assert.equal(first.total, 180);
  assert.equal(first.items.length, 20);
  const second = await list(service, teacher, null, 2);
  assert.deepEqual(second.counts, first.counts);
  assert.equal(second.page, 2);
  assert.equal(second.items.length, 20);
  const keys = [...first.items, ...second.items].map(row => row.classroomId + row.studentId);
  assert.equal(new Set(keys).size, keys.length);
  const scoped = await list(service, teacher, ids[0]);
  assert.equal(scoped.total, 45);
  assert.deepEqual(scoped.counts, { high: 15, medium: 15, low: 15 });
  async function sampleList() {
    const samples = [];
    for (let sample = 0; sample < 5; sample++) {
      const started = performance.now();
      await list(service, teacher);
      samples.push(Number((performance.now() - started).toFixed(1)));
    }
    return samples;
  }
  const newlySeeded = [cold, ...await sampleList()];
  await db.query('ANALYZE');
  return { newlySeeded, analyzed: await sampleList() };
}

async function account(db, firstName, role) {
  const id = randomUUID();
  await db.query(`INSERT INTO users (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES ($1,now(),$2,$2,$3,'Sintético','fixture',now(),$4)`, [id, `${id}@example.test`, firstName, role]);
  return { id };
}

async function room(db, teacher, name) {
  const id = randomUUID(), unit = randomUUID(), topic = randomUUID();
  await db.query(`INSERT INTO classrooms (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES ($1,now(),$2,$3,'Arte','A',2030,$4,'explore',1)`, [id, teacher.id, name, timezone]);
  await db.query(`INSERT INTO units (id,updated_at,classroom_id,name,position) VALUES ($1,now(),$2,'La luz',0)`, [unit, id]);
  await db.query(`INSERT INTO topics (id,updated_at,classroom_id,unit_id,name,position) VALUES ($1,now(),$2,$3,'La sombra',0)`, [topic, id, unit]);
  return { id, unit, topic };
}

async function enroll(db, classroom, student) {
  const id = randomUUID();
  await db.query(`INSERT INTO enrollments (id,updated_at,classroom_id,student_id) VALUES ($1,now(),$2,$3)`, [id, classroom.id, student.id]);
  await db.query(`INSERT INTO membership_periods (id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES ($1,now(),$2,$3,'CODE')`, [randomUUID(), id, classroom.id]);
  return id;
}

async function obligation(db, classroom, enrollment, title, deadline, expected = true) {
  const activityId = randomUUID(), id = randomUUID();
  await db.query(`INSERT INTO activities (id,updated_at,classroom_id,unit_id,topic_id,type,title,instructions_text,status,published_at,deadline_at)
    VALUES ($1,now(),$2,$3,$4,'ASSIGNMENT',$5,$6,'PUBLISHED','2029-12-01T12:00Z',$7)`,
  [activityId, classroom.id, classroom.unit, classroom.topic, title, inquiry, deadline]);
  await db.query(`INSERT INTO student_activities (id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
    VALUES ($1,now(),$2,$3,$4,$5,'INITIAL_ENROLLMENT')`, [id, classroom.id, enrollment, activityId, expected]);
  return { id, activityId };
}

async function deliver(db, work, teacher, grade) {
  const attemptId = randomUUID();
  await db.query(`INSERT INTO attempts (id,updated_at,student_activity_id,activity_id,status,attempt_number,opened_at,submitted_at,submitted_late,practical_response)
    VALUES ($1,now(),$2,$3,'SUBMITTED',1,'2029-12-01T12:00Z','2029-12-05T12:00Z',false,$4)`, [attemptId, work.id, work.activityId, writing]);
  if (grade !== null) {
    const gradeId = randomUUID();
    await db.query(`INSERT INTO attempt_grades (id,updated_at,attempt_id,student_activity_id,activity_id,graded_by_id,final_grade,
      overall_feedback,is_published,published_at,rubric_snapshot,rubric_marks)
      VALUES ($1,now(),$2,$3,$4,$5,$6,'Retroalimentación publicada.',true,'2029-12-06T12:00Z',$7,$8)`, [
      gradeId, attemptId, work.id, work.activityId, teacher.id, grade,
      JSON.stringify([{ name: 'Claridad', description: '', weight: 50 }, { name: 'Justificación', description: '', weight: 50 }]),
      JSON.stringify([{ criterionIndex: 0, score: '10' }, { criterionIndex: 1, score: '8' }]),
    ]);
    await db.query(`UPDATE student_activities SET effective_grade_id=$1 WHERE id=$2`, [gradeId, work.id]);
  }
  return attemptId;
}

test('PostgreSQL support honors dates, effective publication, membership and page boundaries', { timeout: 100000 }, async t => {
  await withTeacherSupportDatabase(({ database: db, databaseUrl }) => withPrisma(databaseUrl, async prisma => {
    await verifyPrismaClock(db, prisma);
    const service = teacherService(prisma);
    const teacher = await account(db, 'Ana', 'teacher'), student = await account(db, 'Tomás', 'student');
    const outsider = await account(db, 'Flor', 'teacher');
    const classroom = await room(db, teacher, 'Taller'), foreign = await room(db, outsider, 'Otro taller');
    const enrollment = await enroll(db, classroom, student);
    const older = await obligation(db, classroom, enrollment, 'Contraste', '2030-01-03T02:00:00Z');
    const recent = await obligation(db, classroom, enrollment, 'Sombras', '2030-01-08T03:00:00Z');
    const extended = await obligation(db, classroom, enrollment, 'Encuadre', '2030-01-08T03:00:00Z');
    await obligation(db, classroom, enrollment, 'Optativa', '2030-01-08T03:00:00Z', false);
    const legacy = await obligation(db, classroom, enrollment, 'Planos', '2029-12-10T03:00:00Z');
    await deliver(db, legacy, teacher, null);
    const draftId = randomUUID();
    await db.query(`INSERT INTO attempts (id,updated_at,student_activity_id,activity_id,status,attempt_number,individual_deadline_at,practical_response)
      VALUES ($1,now(),$2,$3,'DRAFT',1,'2030-01-13T03:00:00Z','Borrador privado')`, [draftId, extended.id, extended.activityId]);
    let record = await service.getTeacherSupport(teacher, classroom.id, student.id);
    assert.equal(record.priority, 'high');
    assert.equal(record.timeZone, timezone);
    assert.deepEqual(record.pending.map(row => row.title), ['Contraste', 'Sombras']);
    assert.deepEqual(record.completion, { expected: 2, delivered: 0 });
    assert.deepEqual(record.observations, []);
    await db.query('UPDATE activities SET deadline_at=$1 WHERE id=$2', [now, recent.activityId]);
    assert.equal((await service.getTeacherSupport(teacher, classroom.id, student.id)).pending.length, 2, 'expires exactly at deadline');
    await db.query('UPDATE activities SET deadline_at=$1 WHERE id=$2', ['2030-01-15T12:00:00Z', recent.activityId]);
    assert.equal((await service.getTeacherSupport(teacher, classroom.id, student.id)).priority, 'high', 'single ten-day delay is high in aula time even with nine UTC dates elapsed');
    const gradedAttempt = await deliver(db, older, teacher, '0');
    assert.equal((await list(service, teacher)).total, 0);
    assert.equal((await list(service, teacher, classroom.id.toUpperCase(), 1, true)).items[0].priority, 'insufficient');
    await db.query('UPDATE activities SET deadline_at=$1 WHERE id=$2', ['2030-01-09T12:00Z', recent.activityId]);
    assert.equal((await list(service, teacher)).items[0].priority, 'medium');
    await deliver(db, recent, teacher, null);
    record = await service.getTeacherSupport(teacher, classroom.id, student.id);
    assert.equal(record.priority, 'low');
    assert.deepEqual(record.completion, { expected: 2, delivered: 2 });
    assert.deepEqual(record.performance, { graded: 1, average: '0.00' });
    assert.equal(record.observations[0].attemptId, gradedAttempt);
    assert.match(record.observations[0].strengths[0], /Claridad.*Puntaje máximo/);
    assert.match(record.observations[0].improvements[0], /Justificación.*Menor puntaje/);
    assert.match(record.observations[0].nextStep, /próxima entrega.*Justificación.*criterio/);
    const evidence = await service.getTeacherSupportEvidence(teacher, classroom.id, student.id, gradedAttempt);
    assert.equal(evidence.timeZone, timezone);
    assert.equal(evidence.instructions, inquiry);
    assert.deepEqual(evidence.texts, [{ prompt: null, text: writing }]);
    const reopenedId = randomUUID();
    await db.query(`INSERT INTO attempts (id,updated_at,student_activity_id,activity_id,status,attempt_number,practical_response)
      VALUES ($1,now(),$2,$3,'DRAFT',2,'Otro borrador privado')`, [reopenedId, older.id, older.activityId]);
    record = await service.getTeacherSupport(teacher, classroom.id, student.id);
    assert.equal(record.priority, 'low');
    assert.equal(record.performance.average, '0.00');
    assert.equal(record.observations[0].attemptId, gradedAttempt);
    await assert.rejects(() => list(service, student), { code: 'FORBIDDEN' });
    await assert.rejects(() => list(service, teacher, foreign.id), { code: 'FORBIDDEN' });
    for (const [actor, id] of [[teacher, draftId], [teacher, reopenedId], [student, gradedAttempt], [outsider, gradedAttempt]]) {
      await assert.rejects(() => service.getTeacherSupportEvidence(actor, classroom.id, student.id, id), { code: 'FORBIDDEN' });
    }
    await db.query("UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$1 WHERE enrollment_id=$2", [teacher.id, enrollment]);
    assert.equal((await list(service, teacher, classroom.id, 1, true)).total, 0);
    await assert.rejects(() => service.getTeacherSupportEvidence(teacher, classroom.id, student.id, gradedAttempt), { code: 'FORBIDDEN' });
    const { newlySeeded, analyzed } = await measureList(db, service);
    t.diagnostic(`List (4 classrooms, 180 memberships, 4500 obligations), service + database, milliseconds:
      newly seeded [${newlySeeded.join(', ')}], after ANALYZE [${analyzed.join(', ')}].`);
  }));
});
