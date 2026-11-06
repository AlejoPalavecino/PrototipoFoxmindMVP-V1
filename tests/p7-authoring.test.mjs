import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {seedPlan} from './helpers/plan-fixture.mjs';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';

test('P7 authoring public service is available on the existing classroom chain', () => {
  for (const name of ['changeActivities', 'listActivities', 'activityDetail', 'activityDeadlineChoices', 'changePlan', 'changeLibrary', 'changeWall', 'invite'])
    assert.equal(typeof ClassroomService.prototype[name], 'function', name);
});

test('authoring type validation never coerces arrays into activity types', async () => {
  const { activityType } = await import('../apps/api/src/classrooms/activity-policy.ts');
  assert.throws(() => activityType(['ASSIGNMENT']), { code: 'INVALID_INPUT' });
  assert.equal(activityType('ASSIGNMENT'), 'ASSIGNMENT');
});

test('P7 teacher authoring preserves privacy, validation, identity and lock boundaries', { timeout: 120000 }, async t => {
  assert.equal(typeof ClassroomService.prototype.changeActivities, 'function');
  await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), other = randomUUID(), student = randomUUID(), room = randomUUID(), foreign = randomUUID();
    for (const id of [teacher, other, student]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Activity','Fixture','fixture',now(),$3)`, [id, `${id}@example.test`, id === student ? 'student' : 'teacher']);
    for (const [id, owner] of [[room, teacher], [foreign, other]]) await pool.query(`INSERT INTO classrooms
      (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Authoring fixture','Subject','A',2026,'America/New_York','explore',100000000)`, [id, owner]);
    const enrollment = randomUUID();
    await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
    await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
    const authenticate = async (_tx, req) => req.actor;
    const files = new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n);
    const service = new ClassroomService({ database, files, authenticate, signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2),
      classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher }, S = { actor: student }, O = { actor: other };
    const detail = () => service.detail(T, room);
    const change = async operation => service.changeActivities(T, room, { revision: (await detail()).revision, operation });
    await seedPlan(pool.query.bind(pool),room,{action:'addUnit',name:'Unit'});
    const unit = (await detail()).units[0].id;
    await seedPlan(pool.query.bind(pool),room,{action:'addTopic',unitId:unit,name:'Topic'});
    const topic = (await detail()).units[0].topics[0].id;
    const snapshot = async () => JSON.stringify((await pool.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM activities a) a,
      (SELECT jsonb_agg(to_jsonb(q) ORDER BY id) FROM questions q) q,
      (SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM question_options o) o,
      (SELECT jsonb_agg(to_jsonb(i) ORDER BY file_id) FROM activity_instruction_files i) i,
      (SELECT revision FROM classrooms WHERE id=$1) r`, [room])).rows);
    const deny = async (operation, code = 'INVALID_INPUT', actor = T, rev) => {
      const before = await snapshot();
      await assert.rejects(async () => service.changeActivities(actor, room, { revision: rev ?? (await detail()).revision, operation }), { code });
      assert.equal(await snapshot(), before);
    };
    const payload = (type = 'ASSIGNMENT') => ({ title: 'Practical work', unitId: unit, topicId: topic, instructions: 'First line\nSecond line',
      attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false });
    let assignment, questionnaire, evaluation;
    await t.test('private empty drafts persist for all three types and students cannot list or address them', async () => {
      for (const type of ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION']) {
        const created = await change({ action: 'create', type });
        assert.ok(created.id);
        if (type === 'ASSIGNMENT') assignment = created.id;
        if (type === 'QUESTIONNAIRE') questionnaire = created.id;
        if (type === 'EVALUATION') evaluation = created.id;
        assert.equal((await service.activityDetail(T, room, created.id, true)).activity.status, 'DRAFT');
        await assert.rejects(service.activityDetail(S, room, created.id), { code: 'FORBIDDEN' });
      }
      assert.equal((await service.listActivities(S, room)).activities.length, 0);
      await deny({ action: 'publish', id: assignment });
    });
    await t.test('draft save preserves observations and validates unit/topic, keys, revision and foreign authority', async () => {
      await change({ action: 'save', id: assignment, payload: payload() });
      assert.equal((await service.activityDetail(T, room, assignment, true)).activity.instructions, 'First line\nSecond line');
      await deny({ action: 'save', id: assignment, payload: { ...payload(), topicId: randomUUID() } }, 'FORBIDDEN');
      await deny({ action: 'save', id: assignment, payload: { ...payload(), forged: true } });
      await deny({ action: 'save', id: assignment, payload: { ...payload(), title: 'x'.repeat(201) } });
      await deny({ action: 'save', id: assignment, payload: { ...payload(), instructions: 'x'.repeat(5001) } });
      await deny({ action: 'save', id: randomUUID(), payload: payload() }, 'FORBIDDEN');
      await deny({ action: 'create', type: 'ASSIGNMENT', ownerId: teacher });
      await deny({ action: 'create', type: 'ASSIGNMENT' }, 'FORBIDDEN', S);
      await deny({ action: 'create', type: 'ASSIGNMENT' }, 'FORBIDDEN', O);
      await deny({ action: 'create', type: 'ASSIGNMENT' }, 'CONFLICT', T, '0');
    });
    const questions = [
      { type: 'DEVELOPMENT', prompt: 'Explain', points: '1.25', scoringRule: null, options: [] },
      { type: 'SINGLE_CHOICE', prompt: 'Choose one', points: '2', scoringRule: 'EXACT', options: [{ text: 'Yes', correct: true }, { text: 'No', correct: false }] },
      { type: 'MULTIPLE_CHOICE', prompt: 'Choose several', points: '6.00', scoringRule: 'PARTIAL', options: [{ text: 'A', correct: true }, { text: 'B', correct: true }, { text: 'C', correct: false }] },
    ];
    await t.test('question inputs enforce positive two-decimal points, type/key/option/rule semantics even in SQL drafts', async () => {
      const base = { ...payload(), instructions: '', questions };
      for (const id of [questionnaire, evaluation]) await change({ action: 'save', id, payload: base });
      for (const bad of ['0', '-1', '1.001', 'NaN', 'Infinity']) await deny({ action: 'save', id: evaluation,
        payload: { ...base, questions: [{ ...questions[0], points: bad }] } });
      for (const q of [
        { ...questions[0], prompt: '' }, { ...questions[0], scoringRule: 'EXACT' },
        { ...questions[1], options: [{ text: 'Only', correct: true }] },
        { ...questions[1], options: questions[1].options.map(x => ({ ...x, correct: true })) },
        { ...questions[2], options: questions[2].options.map(x => ({ ...x, correct: false })) },
        { ...questions[2], scoringRule: null },
      ]) await deny({ action: 'save', id: evaluation, payload: { ...base, questions: [q] } });
      await deny({ action: 'save', id: assignment, payload: { ...payload(), questions } });
    });
    await t.test('publication is explicit, safe student details never contain answer keys and preview starts nothing', async () => {
      for (const id of [assignment, questionnaire, evaluation]) await change({ action: 'publish', id });
      assert.equal((await service.listActivities(S, room)).activities.length, 3);
      const safe = await service.activityDetail(S, room, evaluation);
      assert.equal(safe.activity.questions.length, 3);
      const raw = JSON.stringify(safe);
      for (const key of ['correct', 'scoringRule', 'is_correct', 'editor', 'grade', 'password']) assert.ok(!raw.includes(`"${key}`), key);
      assert.ok((await service.activityDetail(T, room, evaluation, true)).activity.questions[2].options[0].correct);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts')).rows[0].n, 0);
      assert.equal((await pool.query('SELECT first_started_at FROM activities WHERE id=$1', [evaluation])).rows[0].first_started_at, null);
      await assert.rejects(service.activityDetail(S, room, evaluation, true), { code: 'FORBIDDEN' });
    });
    await t.test('deadline resolution rejects gaps and ambiguous times unless teacher selects an offset', async () => {
      assert.equal((await service.activityDeadlineChoices(T, room, { local: '2026-11-01T01:30' })).choices.length, 2);
      await deny({ action: 'save', id: assignment, payload: { ...payload(), deadline: { local: '2026-03-08T02:30' } } });
      await deny({ action: 'save', id: assignment, payload: { ...payload(), deadline: { local: '2026-11-01T01:30' } } });
      await change({ action: 'save', id: assignment, payload: { ...payload(), deadline: { local: '2026-11-01T01:30', offsetMinutes: -300 } } });
      assert.equal((await service.activityDetail(T, room, assignment, true)).activity.deadlineAt.toISOString(), '2026-11-01T06:30:00.000Z');
    });
    await t.test('after participation only organizational metadata, extension and more permissive policy change; question identities remain', async () => {
      await pool.query('UPDATE activities SET first_started_at=now() WHERE classroom_id=$1', [room]);
      const before = (await service.activityDetail(T, room, evaluation, true)).activity;
      await change({ action: 'metadata', id: evaluation, title: 'Corrected title', unitId: unit, topicId: topic });
      assert.deepEqual((await service.activityDetail(T, room, evaluation, true)).activity.questions, before.questions);
      await deny({ action: 'save', id: evaluation, payload: { ...payload(), questions } }, 'CONFLICT');
      await deny({ action: 'withdraw', id: evaluation }, 'CONFLICT');
      await deny({ action: 'deadline', id: evaluation, deadline: { local: '2026-12-01T12:00' }, allowLate: true }, 'CONFLICT');
      await deny({ action: 'deadline', id: assignment, deadline: null, allowLate: false }, 'CONFLICT');
      await deny({ action: 'deadline', id: assignment, deadline: { local: '2026-10-31T12:00' }, allowLate: false }, 'CONFLICT');
      await change({ action: 'deadline', id: assignment, deadline: { local: '2026-12-01T12:00' }, allowLate: true });
      await deny({ action: 'deadline', id: assignment, deadline: { local: '2026-12-02T12:00' }, allowLate: false }, 'CONFLICT');
    });
    await t.test('withdraw before participation removes student visibility; archive and departure deny mutation/access', async () => {
      await pool.query('UPDATE activities SET first_started_at=NULL WHERE id=$1', [questionnaire]);
      await change({ action: 'withdraw', id: questionnaire });
      await assert.rejects(service.activityDetail(S, room, questionnaire), { code: 'FORBIDDEN' });
      await service.setArchive(T, room, { revision: (await detail()).revision, archived: true });
      await deny({ action: 'create', type: 'ASSIGNMENT' }, 'CONFLICT');
      assert.ok((await service.listActivities(S, room)).activities.length);
      await pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$2 WHERE enrollment_id=$1", [enrollment, student]);
      await assert.rejects(service.listActivities(S, room), { code: 'FORBIDDEN' });
    });
  });
});
