import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {seedPlan} from './helpers/plan-fixture.mjs';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { FileStore } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/store.js';
import { ClassroomService } from './helpers/academic-fixture.ts';

async function fixture(local) {
  const teacher = randomUUID(), stranger = randomUUID(), student = randomUUID(), room = randomUUID();
  for (const id of [teacher, stranger, student]) await local.pool.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Synthetic','Topics','fixture',now(),$3)`, [id, `${id}@example.test`, id === student ? 'student' : 'teacher']);
  await local.pool.query(`INSERT INTO classrooms
    (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES($1,now(),$2,'Topics','Subject','A',2026,'UTC','explore',100000000)`, [room, teacher]);
  const enrollment = randomUUID();
  await local.pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
  await local.pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
  const authenticate = async (_tx, req) => req.actor;
  const files = new FileStore(local.database, { authenticate, authorize: async () => {} }, 100000000n);
  const service = new ClassroomService({ database: local.database, files, authenticate,
    signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
  const T = { actor: teacher }, S = { actor: student }, O = { actor: stranger };
  const detail = () => service.detail(T, room);
  const revision = async () => (await detail()).revision;
  const plan = async operation => service.changePlan(T, room, { revision: await revision(), operation });
  const seed=operation=>seedPlan(local.pool.query.bind(local.pool),room,operation);
  const change = async operation => service.changeActivities(T, room, { revision: await revision(), operation });
  await seed({ action: 'addUnit', name: 'Unit A' });
  const unitId = (await detail()).units[0].id;
  for (const name of ['Topic A', 'Topic B']) await seed({ action: 'addTopic', unitId, name });
  const topicIds = (await detail()).units[0].topics.map(x => x.id);
  await seed({ action: 'addUnit', name: 'Unit B' });
  const otherUnit = (await detail()).units[1].id;
  await seed({ action: 'addTopic', unitId: otherUnit, name: 'Foreign unit topic' });
  const otherTopic = (await detail()).units[1].topics[0].id;
  const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
  const payload = { title: 'Integrative assignment', unitId, topicIds, instructions: 'Connect both topics.',
    attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false };
  return { ...local, service, T, S, O, room, id, unitId, otherUnit, topicIds, otherTopic, revision, plan,seedPlan:seed, change, payload };
}

test('D1 PostgreSQL ordered multi-topic authoring, atomic boundaries and privacy', { timeout: 120000 }, async t => {
  await withAiDatabase(async ({ pool }) => {
    const scenario = (name, run) => t.test(name, () => rollbackCase(pool, async local => run(await fixture(local))));
    await scenario('save/reopen/list and publish retain every ordered topic with singular compatibility', async f => {
      await f.change({ action: 'save', id: f.id, payload: f.payload });
      const read = () => f.service.activityDetail(f.T, f.room, f.id, true);
      assert.deepEqual((await read()).activity.topicIds, f.topicIds);
      assert.equal((await read()).activity.topicId, f.topicIds[0]);
      assert.deepEqual((await f.service.listActivities(f.T, f.room)).activities[0].topicIds, f.topicIds);
      assert.deepEqual((await f.pool.query('SELECT topic_id,position FROM activity_topics WHERE activity_id=$1 ORDER BY position', [f.id])).rows,
        f.topicIds.map((topic_id, position) => ({ topic_id, position })));
      await assert.rejects(f.service.activityDetail(f.S, f.room, f.id), { code: 'FORBIDDEN' });
      await f.change({ action: 'publish', id: f.id });
      assert.deepEqual((await f.service.activityDetail(f.S, f.room, f.id)).activity.topicIds, f.topicIds);
      assert.equal((await f.service.listActivities(f.S, f.room)).activities.length, 1);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM student_activities WHERE activity_id=$1', [f.id])).rows[0].n, 1);
    });
    await scenario('later associated topic cannot be deleted and reorder/replacement removes obsolete links', async f => {
      await f.change({ action: 'save', id: f.id, payload: f.payload });
      await assert.rejects(f.plan({ action: 'deleteTopic', id: f.topicIds[1], confirm: true }), { code: 'INVALID_INPUT' });
      await f.change({ action: 'metadata', id: f.id, title: f.payload.title, unitId: f.unitId, topicIds: [...f.topicIds].reverse() });
      assert.deepEqual((await f.service.activityDetail(f.T, f.room, f.id, true)).activity.topicIds, [...f.topicIds].reverse());
      await f.change({ action: 'save', id: f.id, payload: { ...f.payload, topicIds: [f.topicIds[0]] } });
      await f.seedPlan({ action: 'deleteTopic', id: f.topicIds[1], confirm: true });
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM activity_topics WHERE activity_id=$1', [f.id])).rows[0].n, 1);
    });
    await scenario('a non-primary topic from another unit fails atomically, as do stale and foreign writes', async f => {
      await f.change({ action: 'save', id: f.id, payload: f.payload });
      const before = await f.service.activityDetail(f.T, f.room, f.id, true);
      await assert.rejects(f.change({ action: 'save', id: f.id, payload: { ...f.payload, topicIds: [f.topicIds[0], f.otherTopic] } }), { code: 'FORBIDDEN' });
      await assert.rejects(f.service.changeActivities(f.O, f.room, { revision: await f.revision(), operation: { action: 'save', id: f.id, payload: f.payload } }), { code: 'FORBIDDEN' });
      await assert.rejects(f.service.changeActivities(f.T, f.room, { revision: '0', operation: { action: 'save', id: f.id, payload: f.payload } }), { code: 'CONFLICT' });
      assert.deepEqual(await f.service.activityDetail(f.T, f.room, f.id, true), before);
    });
    await scenario('legacy singular writes populate ordered join and DTO without changing activity identity', async f => {
      const legacy = { ...f.payload, topicId: f.topicIds[0] }; delete legacy.topicIds;
      await f.change({ action: 'save', id: f.id, payload: legacy });
      const view = (await f.service.activityDetail(f.T, f.room, f.id, true)).activity;
      assert.equal(view.id, f.id); assert.deepEqual(view.topicIds, [f.topicIds[0]]);
      assert.deepEqual((await f.pool.query('SELECT topic_id FROM activity_topics WHERE activity_id=$1', [f.id])).rows, [{ topic_id: f.topicIds[0] }]);
    });
    await scenario('switching unit atomically replaces associations and clearing a draft removes every old join', async f => {
      await f.change({ action: 'save', id: f.id, payload: f.payload });
      await f.change({ action: 'save', id: f.id, payload: { ...f.payload, unitId: f.otherUnit, topicIds: [f.otherTopic] } });
      let view = (await f.service.activityDetail(f.T, f.room, f.id, true)).activity;
      assert.equal(view.unitId, f.otherUnit); assert.deepEqual(view.topicIds, [f.otherTopic]);
      await f.change({ action: 'save', id: f.id, payload: { ...f.payload, unitId: null, topicIds: [] } });
      view = (await f.service.activityDetail(f.T, f.room, f.id, true)).activity;
      assert.equal(view.unitId, null); assert.equal(view.topicId, null); assert.deepEqual(view.topicIds, []);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM activity_topics WHERE activity_id=$1', [f.id])).rows[0].n, 0);
    });
    await scenario('post-participation metadata moves topics without reopening locked instructional content', async f => {
      await f.change({ action: 'save', id: f.id, payload: f.payload });
      await f.change({ action: 'publish', id: f.id });
      await f.pool.query('UPDATE activities SET first_started_at=now() WHERE id=$1', [f.id]);
      await f.change({ action: 'metadata', id: f.id, title: 'Moved', unitId: f.otherUnit, topicIds: [f.otherTopic] });
      const view = (await f.service.activityDetail(f.T, f.room, f.id, true)).activity;
      assert.equal(view.unitId, f.otherUnit); assert.deepEqual(view.topicIds, [f.otherTopic]);
      assert.equal(view.instructions, f.payload.instructions);
      await assert.rejects(f.change({ action: 'save', id: f.id, payload: f.payload }), { code: 'CONFLICT' });
    });
    await scenario('database association cannot bypass the activity unit/classroom boundary', async f => {
      await f.change({ action: 'save', id: f.id, payload: f.payload });
      // Savepoint preserves the enclosing rollback transaction after the expected SQL constraint failure.
      await f.pool.query('SAVEPOINT invalid_topic');
      await assert.rejects(f.pool.query(`INSERT INTO activity_topics(activity_id,topic_id,classroom_id,unit_id,position)
        VALUES($1,$2,$3,$4,2)`, [f.id, f.otherTopic, f.room, f.unitId]), error => error.code === '23503');
      await f.pool.query('ROLLBACK TO SAVEPOINT invalid_topic');
      assert.deepEqual((await f.service.activityDetail(f.T, f.room, f.id, true)).activity.topicIds, f.topicIds);
    });
  });
});
