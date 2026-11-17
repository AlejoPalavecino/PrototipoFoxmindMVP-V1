import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
import { ActivityAiService } from '../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/service.js';
import { ActivityAiWorker } from '../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/worker.js';

test('generation expands a whole unit into its ordered snapshot and keeps the idea private on publish', { timeout: 120000 }, () =>
  withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local);
    await f.seedPlan({ action: 'addUnit', name: 'Contraste' });
    const second = (await f.classrooms.detail(f.T, f.room)).units[1];
    await f.seedPlan({ action: 'addTopic', unitId: second.id, name: 'Luces' });
    await f.seedPlan({ action: 'addTopic', unitId: second.id, name: 'Sombras' });
    const secondTopics = (await f.classrooms.detail(f.T, f.room)).units[1].topics;
    const { unitId, ...legacy } = f.start;
    const teacherBrief = 'Relacionar la luz con dos casos del plan.';
    const start = { ...legacy, teacherBrief, revision: await f.revision(), unitIds: [second.id], requestId: randomUUID() };
    const worker = new ActivityAiWorker(f.options), ai = new ActivityAiService(f.options);
    const foreign = await fixture(local);
    for (const selection of [{ unitIds: [foreign.unitId] }, { topicIds: [foreign.topicIds[0]] }]) {
      await assert.rejects(ai.start(f.T, f.room, { ...start, ...selection, requestId: randomUUID() }), { code: 'FORBIDDEN' });
    }
    const { teacherBrief: _removed, ...noIdea } = f.start;
    await assert.rejects(ai.start(f.T, f.room, { ...noIdea, revision: await f.revision() }), { code: 'INVALID_INPUT' });
    const seen = [];
    const generate = f.options.provider.generateActivity;
    f.options.provider.generateActivity = input => { seen.push(input); return generate(input); };
    const { view } = await ai.start(f.T, f.room, start);
    assert.deepEqual(view.unitIds, [unitId, second.id]);
    assert.deepEqual(view.topicIds, [...f.topicIds, ...secondTopics.map(topic => topic.id)]);
    await worker.runOnce();
    assert.equal(seen[0].teacherBrief, teacherBrief);
    assert.equal(seen[0].objective, start.objective);
    const response = await ai.apply(f.T, f.room, view.id, {
      revision: await f.revision(), requestId: randomUUID(), proposal: f.proposal,
    });
    const draft = (await f.classrooms.activityDetail(f.T, f.room, response.activityId)).activity;
    assert.deepEqual(draft.unitIds, view.unitIds);
    assert.deepEqual(draft.topicIds, view.topicIds);
    assert.equal(draft.teacherBrief, teacherBrief);
    const links = await local.pool.query('SELECT unit_id,topic_id FROM activity_topics WHERE activity_id=$1 ORDER BY position', [draft.id]);
    assert.deepEqual(links.rows.map(row => row.unit_id), [unitId, second.id, second.id]);
    await assert.rejects(f.classrooms.activityDetail(f.S, f.room, draft.id), { code: 'FORBIDDEN' });
    await f.classrooms.changeActivities(f.T, f.room, {
      revision: await f.revision(), operation: { action: 'publish', id: draft.id },
    });
    const { activity } = await f.classrooms.activityDetail(f.S, f.room, draft.id);
    assert.deepEqual(activity.topicIds, view.topicIds);
    assert.equal(Object.hasOwn(activity, 'teacherBrief'), false);
    assert.equal(JSON.stringify(activity).includes(teacherBrief), false);

    const next = await ai.start(f.T, f.room, { ...start, requestId: randomUUID(), revision: await f.revision() });
    await worker.runOnce();
    assert.equal((await ai.get(f.T, f.room, next.view.id)).state, 'READY');
    await f.classrooms.changeActivities(f.T, f.room, {
      revision: await f.revision(), operation: { action: 'create', type: 'ASSIGNMENT' },
    });
    await assert.rejects(ai.apply(f.T, f.room, next.view.id, {
      revision: await f.revision(), requestId: randomUUID(), proposal: f.proposal,
    }), { code: 'CONFLICT' });
  })));

test('an already queued job without the idea continues to generate and replays its original request', { timeout: 120000 }, () =>
  withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), ai = new ActivityAiService(f.options);
    const { view } = await ai.start(f.T, f.room, f.start);
    const { teacherBrief: _removed, ...prior } = f.start;
    const { inputHash } = await import('../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/requests.js');
    const hash = inputHash('start', f.room, null, prior);
    await local.pool.query(`UPDATE activity_ai_generations SET input_payload=$2::jsonb,request_hash=$3 WHERE id=$1`,
      [view.id, JSON.stringify(prior), hash]);
    await local.pool.query('UPDATE activity_ai_requests SET input_hash=$2 WHERE generation_id=$1', [view.id, hash]);
    const replay = await ai.start(f.T, f.room, prior);
    assert.equal(replay.created, false);
    assert.equal(replay.view.id, view.id);
    await new ActivityAiWorker(f.options).runOnce();
    assert.equal((await ai.get(f.T, f.room, view.id)).state, 'READY');
  })));

test('the first student attempt serializes with an interunit content save', { timeout: 120000 }, () =>
  withAiDatabase(async local => {
    const f = await fixture(local);
    const { id } = await f.classrooms.changeActivities(f.T, f.room, { revision: await f.revision(),
      operation: { action: 'create', type: 'ASSIGNMENT' } });
    const change = async operation => f.classrooms.changeActivities(f.T, f.room, { revision: await f.revision(), operation });
    const payload = { title: 'GuÃƒÂ­a', unitIds: [f.unitId], topicIds: [], instructions: 'Primera consigna',
      attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false };
    await change({ action: 'save', id, payload });
    await change({ action: 'publish', id });
    const revision = await f.revision();
    const edit = { action: 'save', id, payload: { ...payload, instructions: 'Consigna actualizada' } };
    const [started, saved] = await Promise.allSettled([
      f.classrooms.startActivity(f.S, f.room, id, {}),
      f.classrooms.changeActivities(f.T, f.room, { revision, operation: edit }),
    ]);
    assert.equal(started.status, 'fulfilled');
    assert.equal(started.value.activity.instructions, saved.status === 'fulfilled' ? edit.payload.instructions : payload.instructions);
    if (saved.status === 'rejected') assert.equal(saved.reason.code, 'CONFLICT');
    await assert.rejects(change(edit), { code: 'CONFLICT' });
  }));

test('the added interunit migration preserves legacy topic links and activities already stored', { timeout: 120000 }, () =>
  withAiDatabase(async local => {
    const f = await fixture(local);
    const create = await f.classrooms.changeActivities(f.T, f.room, { revision: await f.revision(),
      operation: { action: 'create', type: 'ASSIGNMENT' } });
    await f.classrooms.changeActivities(f.T, f.room, { revision: await f.revision(),
      operation: { action: 'save', id: create.id, payload: { title: 'Actividad preexistente', unitId: f.unitId, topicIds: f.topicIds,
        instructions: 'Primera consigna', attachmentRequired: false, instructionFileIds: [], materialIds: [],
        questions: [], deadline: null, allowLate: false } } });
    // Reconstruct the former constraints on this disposable database before replaying the migration.
    await local.pool.query(`ALTER TABLE activity_topics DROP CONSTRAINT activity_topics_activity_id_classroom_id_fkey,
      ADD CONSTRAINT activity_topics_activity_id_unit_id_classroom_id_fkey
      FOREIGN KEY (activity_id, unit_id, classroom_id) REFERENCES activities(id, unit_id, classroom_id)
      ON DELETE RESTRICT ON UPDATE NO ACTION;
      ALTER TABLE activities DROP COLUMN teacher_brief;`);
    await local.pool.query(await readFile('prisma/migrations/202611150001_activity_interunit_brief/migration.sql', 'utf8'));
    const { activity } = await f.classrooms.activityDetail(f.T, f.room, create.id);
    assert.equal(activity.title, 'Actividad preexistente');
    assert.deepEqual(activity.topicIds, f.topicIds);
    assert.deepEqual(activity.unitIds, [f.unitId]);
    assert.equal(activity.teacherBrief, null);
  }));
