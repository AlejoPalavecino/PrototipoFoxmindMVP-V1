import test from 'node:test';
import assert from 'node:assert/strict';
import { activityEvent, deadlineChanged } from '../.build/api/apps/api/src/classrooms/activity-events.js';
import { academicTarget, academicNotificationSelection } from '../.build/api/apps/api/src/classrooms/academic-notifications.js';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import pg from 'pg';

test('deadline notifications distinguish real instants/reception changes from repeated identical saves', () => {
  assert.equal(deadlineChanged(null, null, false, false), false);
  assert.equal(deadlineChanged(new Date(1), new Date(1), false, false), false);
  assert.equal(deadlineChanged(new Date(1), new Date(2), false, false), true);
  assert.equal(deadlineChanged(null, null, false, true), true);
});

test('public publication and its notifications roll back together when event persistence fails', { timeout: 120000 }, async () => {
  const oldParser = pg.types.getTypeParser(20); pg.types.setTypeParser(20, BigInt);
  try { await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), room = randomUUID(), unit = randomUUID(), topic = randomUUID(), enrollment = randomUUID();
    for (const id of [teacher, student]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Event','Fixture','fixture',now(),$3)`, [id, `${id}@example.test`, id === student ? 'student' : 'teacher']);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Event','Science','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unit',0)`, [unit, room]);
    await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Topic',0)`, [topic, room, unit]);
    await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
    await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
    const authenticate = async (_tx, req) => req.actor;
    const service = new ClassroomService({ database, authenticate, files: new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n),
      signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher, headers: {} };
    const change = async operation => service.changeActivities(T, room, { revision: (await service.detail(T, room)).revision, operation });
    const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
    await change({ action: 'save', id, payload: { title: 'Atomic event', unitId: unit, topicId: topic, instructions: 'Instructions', attachmentRequired: false,
      instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false } });
    const snapshot = async () => (await pool.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM classrooms t) rooms,
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM activities t) activities,
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM student_activities t) obligations,
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t) notifications`)).rows;
    await pool.query(`CREATE FUNCTION reject_fixture_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'controlled event failure'; END $$;
      CREATE TRIGGER reject_fixture_event BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION reject_fixture_event()`);
    try { const before = await snapshot(); await assert.rejects(() => change({ action: 'publish', id }), { code: 'SERVICE_UNAVAILABLE' }); assert.deepEqual(await snapshot(), before); }
    finally { await pool.query('DROP TRIGGER reject_fixture_event ON notifications; DROP FUNCTION reject_fixture_event()'); }
    await change({ action: 'publish', id });
    assert.equal((await pool.query('SELECT count(*)::int n FROM notifications')).rows[0].n, 1);
    assert.equal((await pool.query('SELECT status FROM activities WHERE id=$1', [id])).rows[0].status, 'PUBLISHED');
  }); } finally { pg.types.setTypeParser(20, oldParser); }
});

test('source events use current-recipient EXISTS within source transaction, with no permanent per-activity dedup or email', async () => {
  const calls = [], tx = { query: async (...args) => { calls.push(args); return []; } };
  await activityEvent(tx, 'room', 'activity', 'ACTIVITY_PUBLISHED');
  await activityEvent(tx, 'room', 'activity', 'ATTEMPT_REOPENED', 'student', 'attempt');
  assert.equal(calls.length, 2); assert.match(calls[0][0], /EXISTS\(SELECT 1 FROM enrollments/); assert.ok(!calls[0][0].includes('NOT EXISTS'));
  assert.deepEqual(calls[1].slice(1), ['room', 'activity', 'ATTEMPT_REOPENED', 'student', 'attempt']);
});

test('academic target and predicate require current published target, own reopened attempt or teacher received submission', () => {
  for (const [eventType, attemptId, kind] of [['ACTIVITY_PUBLISHED', null, 'activity'], ['ATTEMPT_REOPENED', 'attempt', 'attempt'], ['SUBMISSION_RECEIVED', 'attempt', 'submission']])
    assert.deepEqual(academicTarget({ eventType, attemptId, classroomId: 'room', activityId: 'activity' }), { kind, classroomId: 'room', activityId: 'activity', attemptId });
  assert.match(academicNotificationSelection, /a.status='PUBLISHED'/); assert.match(academicNotificationSelection, /attempt.status='SUBMITTED'/);
  assert.match(academicNotificationSelection, /owner.student_id=\$1::uuid/); assert.match(academicNotificationSelection, /m.ended_at IS NULL/);
});
