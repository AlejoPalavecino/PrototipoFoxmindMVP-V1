import test from 'node:test';
import assert from 'node:assert/strict';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';

test('AI rubric remains editable and is applied only to a private activity draft', { timeout: 120000 }, async () => {
  const { ActivityAiService } = await import("../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/service.js");
  const { ActivityAiWorker } = await import("../.build/api/apps/api/src/modules/activities/generation/infrastructure/activity-ai/worker.js");
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local);
    const generated = [{ name: 'Conceptos', description: 'Relaciona las fuentes.', weight: 100 }];
    f.proposal.evaluationRubric = generated;
    const service = new ActivityAiService(f.options);
    const { view } = await service.start(f.T, f.room, f.start);
    await new ActivityAiWorker(f.options).runOnce();
    const ready = await service.get(f.T, f.room, view.id);
    assert.equal(ready.state, 'READY');
    const edited = [{ name: 'Criterio revisado por docente', description: 'Evidencias pertinentes.', weight: 100 }];
    const { randomUUID } = await import('node:crypto');
    const applied = await service.apply(f.T, f.room, view.id, { revision: await f.revision(), requestId: randomUUID(), proposal: { ...f.proposal, evaluationRubric: edited } });
    const draft = (await f.classrooms.activityDetail(f.T, f.room, applied.activityId, true)).activity;
    assert.equal(draft.status, 'DRAFT'); assert.deepEqual(draft.evaluationRubric, edited);
    await assert.rejects(f.classrooms.activityDetail(f.S, f.room, applied.activityId), { code: 'FORBIDDEN' });
  }));
});

test('Public rubric persists independently, enforces access and stays immutable after participation', { timeout: 120000 }, async () => {
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), service = f.classrooms;
    const change = async operation => service.changeActivities(f.T, f.room, { revision: await f.revision(), operation });
    const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
    const criteria = [{ name: 'Contenido', description: 'Evidencias pertinentes', weight: 60 }, { name: 'Claridad', description: 'Argumentos ordenados', weight: 40 }];
    const payload = { title: 'Actividad con criterios', unitId: f.unitId, topicIds: f.topicIds, instructions: 'Relacioná los conceptos.',
      attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: true,
      aiGradingRubric: 'Instrucción privada de prueba', evaluationRubric: criteria };
    const read = actor => service.activityDetail(actor, f.room, id, actor === f.T);
    assert.deepEqual((await read(f.T)).activity.evaluationRubric, []);
    await change({ action: 'save', id, payload });
    assert.deepEqual((await read(f.T)).activity.evaluationRubric, criteria);
    await assert.rejects(read(f.S), { code: 'FORBIDDEN' });
    await assert.rejects(read(f.O), { code: 'FORBIDDEN' });
    const before = (await local.pool.query('SELECT evaluation_rubric,ai_grading_rubric FROM activities WHERE id=$1', [id])).rows;
    await assert.rejects(change({ action: 'save', id, payload: { ...payload, evaluationRubric: [{ ...criteria[0], weight: 90 }] } }), { code: 'INVALID_INPUT' });
    assert.deepEqual((await local.pool.query('SELECT evaluation_rubric,ai_grading_rubric FROM activities WHERE id=$1', [id])).rows, before);
    await change({ action: 'publish', id });
    const student = (await read(f.S)).activity;
    assert.deepEqual(student.evaluationRubric, criteria);
    assert.equal('aiGradingRubric' in student, false);
    assert.equal(JSON.stringify(student).includes(payload.aiGradingRubric), false);
    // Old clients omitting the new field cannot erase a rubric on a content save.
    const legacy = { ...payload }; delete legacy.evaluationRubric;
    await change({ action: 'save', id, payload: legacy });
    assert.deepEqual((await read(f.S)).activity.evaluationRubric, criteria);
    await service.startActivity(f.S, f.room, id, {});
    await assert.rejects(change({ action: 'save', id, payload }), { code: 'CONFLICT' });
    assert.deepEqual((await read(f.S)).activity.evaluationRubric, criteria);
  }));
});
