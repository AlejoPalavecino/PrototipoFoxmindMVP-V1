import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const now = '2026-10-23T12:00:00.000Z', future = '2026-11-02T15:00:00.000Z';
const range = { startDate: '2026-10-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' };
async function seed(query, createAcademicAgenda) {
  const [actor, teacherActor, other, pupil] = Array.from({ length: 4 }, () => randomUUID());
  for (const id of [actor, teacherActor, other, pupil]) await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Agenda','Fixture','not-login',now(),$3)`, id, `${id}@example.invalid`, [actor, pupil].includes(id) ? 'student' : 'teacher');
  const rooms = [];
  for (const [teacher, student] of [[other, actor], [teacherActor, pupil]]) {
    const [room, unit, topic, enrollment, period] = Array.from({ length: 5 }, () => randomUUID());
    await query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Agenda aula','Ciencias','A',2026,'America/Argentina/Buenos_Aires','explore',1000000)`, room, teacher);
    await query("INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unidad',0)", unit, room);
    await query("INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Tema',0)", topic, room, unit);
    await query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', enrollment, room, student);
    await query("INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')", period, enrollment, room);
    rooms.push({ room, unit, topic, enrollment, period });
  }
  const activity = async (roomIndex, changes = {}) => {
    const r = rooms[roomIndex], id = randomUUID(), obligation = randomUUID();
    const { deadline = future, status = 'PUBLISHED', expected = true, firstDeadline = null } = changes;
    await query(`INSERT INTO activities(id,updated_at,classroom_id,unit_id,topic_id,type,title,status,published_at,deadline_at)
      VALUES($1,now(),$2,$3,$4,'ASSIGNMENT','Entrega',$5,now(),$6)`, id, r.room, r.unit, r.topic, status, deadline);
    await query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason,first_submission_deadline_at)
      VALUES($1,now(),$2,$3,$4,$5,'INITIAL_ENROLLMENT',$6)`, obligation, r.room, r.enrollment, id, expected, firstDeadline);
    return { id, obligation, target: { classroomId: r.room, activityId: id } };
  };
  const port = userId => createAcademicAgenda({ query }, { userId, now });
  return { actor, teacherActor, other, pupil, rooms, activity, port, query };
}
test('academic agenda derives real obligations and current access without academic writes', { timeout: 60000 }, async t => {
  const { createAcademicAgenda } = loadTsModule("apps/api/src/modules/classrooms/academic-projection/infrastructure/agenda.ts");
  assert.equal(typeof createAcademicAgenda, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    const check = (name, run) => t.test(name, async () => transaction(async ({ query }) => run(await seed(query, createAcademicAgenda))));
    await check('separate student and teacher accounts see their deadlines without individual metadata', async f => {
      const studied = await f.activity(0), taught = await f.activity(1, { firstDeadline: '2026-11-20T15:00:00.000Z' });
      const rows = [...await f.port(f.actor).upcoming(20), ...await f.port(f.teacherActor).upcoming(20)];
      assert.equal(rows.length, 2);
      const student = rows.find(x => x.target.activityId === studied.id), teacher = rows.find(x => x.target.activityId === taught.id);
      assert.equal(student.role, 'student'); assert.equal(teacher.role, 'teacher');
      assert.equal(teacher.deadlineAt, future); assert.equal(teacher.timeZone, 'America/Argentina/Buenos_Aires');
      for (const key of ['studentId', 'enrollmentId', 'firstSubmissionDeadlineAt', 'individualDeadlineAt', 'answers', 'grade'])
        assert.equal(Object.hasOwn(teacher, key), false, key);
      assert.equal((await f.port(f.other).upcoming(20)).filter(x => x.target.classroomId === f.rooms[1].room).length, 0);
    });
    await check('nonexpected, draft, withdrawn, no-deadline, expired and exact-now are excluded from upcoming', async f => {
      const visible = await f.activity(0);
      for (const changes of [{ expected: false }, { status: 'DRAFT' }, { status: 'WITHDRAWN' }, { deadline: null },
        { deadline: '2026-10-22T12:00:00.000Z' }, { deadline: now }]) await f.activity(0, changes);
      assert.deepEqual((await f.port(f.actor).upcoming(20)).map(x => x.target.activityId), [visible.id]);
      assert.ok((await f.port(f.actor).list(range)).some(x => x.deadlineAt === '2026-10-22T12:00:00.000Z'));
    });
    await check('first authorized deadline and general extensions use the later deadline', async f => {
      const a = await f.activity(0, { firstDeadline: '2026-11-20T15:00:00.000Z' });
      assert.equal((await f.port(f.actor).upcoming(20))[0].deadlineAt, '2026-11-20T15:00:00.000Z');
      await f.query('UPDATE activities SET deadline_at=$2 WHERE id=$1', a.id, '2026-11-25T15:00:00.000Z');
      assert.equal((await f.port(f.actor).upcoming(20))[0].deadlineAt, '2026-11-25T15:00:00.000Z');
    });
    await check('submitted first attempt disappears; reopened draft returns with effective extension', async f => {
      const a = await f.activity(0), first = randomUUID();
      await f.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,opened_at,submitted_at,applied_deadline_at,submitted_late)
        VALUES($1,now(),$2,$3,1,'SUBMITTED',$4::timestamptz-interval '1 hour',$4,$5,false)`, first, a.obligation, a.id, now, future);
      assert.deepEqual(await f.port(f.actor).upcoming(20), []);
      const reopened = randomUUID();
      await f.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,enabled_by_id,individual_deadline_at)
        VALUES($1,now(),$2,$3,2,'DRAFT',$4,$5)`, reopened, a.obligation, a.id, f.other, '2026-11-15T15:00:00.000Z');
      let row = (await f.port(f.actor).upcoming(20))[0];
      assert.equal(row.resubmission, true); assert.equal(row.pending, true); assert.equal(row.deadlineAt, '2026-11-15T15:00:00.000Z');
      await f.query('UPDATE activities SET deadline_at=$2 WHERE id=$1', a.id, '2026-11-21T15:00:00.000Z');
      row = (await f.port(f.actor).upcoming(20))[0]; assert.equal(row.deadlineAt, '2026-11-21T15:00:00.000Z');
      assert.equal((await f.query('SELECT status FROM attempts WHERE id=$1', first))[0].status, 'SUBMITTED');
    });
    await check('archive and ended membership hide upcoming; opening rechecks current access', async f => {
      const a = await f.activity(0), port = f.port(f.actor);
      assert.deepEqual(await port.resolveTarget(a.target), a.target);
      await f.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$2 WHERE id=$1", f.rooms[0].period, f.actor);
      assert.deepEqual(await port.upcoming(20), []); assert.equal(await port.resolveTarget(a.target), null);
      const taught = await f.activity(1); await f.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', f.rooms[1].room);
      assert.deepEqual(await port.upcoming(20), []);
      assert.equal((await f.query('SELECT count(*)::int n FROM attempts'))[0].n, 0);
      assert.ok(taught.id);
    });
    assert.equal((await pool.query('SELECT count(*)::int n FROM users')).rows[0].n, 0);
  });
});
