import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';

test('Foxy handoff is atomic, idempotent, teacher-only and keeps source and draft private', { timeout: 120000 }, async () => {
  const { createFoxyResourceService } = await import('../.build/api/apps/api/src/foxy-ai/resource-service.js');
  const { createFoxyResourceRepository } = await import('../.build/api/apps/api/src/foxy-ai/resource-repository.js');
  const { createFoxyConversationRepository } = await import('../.build/api/apps/api/src/foxy-ai/conversation-repository.js');
  const { createFoxyTurnRepository } = await import('../.build/api/apps/api/src/foxy-ai/turn-repository.js');
  const { createFoxyUnitOfWork } = await import('../.build/api/apps/api/src/foxy-ai/unit-of-work.js');
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), tx = { query: async (sql, ...args) => (await local.pool.query(sql, args)).rows };
    const resources = createFoxyResourceRepository(), service = createFoxyResourceService({ resources,
      uow: createFoxyUnitOfWork({ database: local.database, authenticate: async (_tx, req) => req.actor }) });
    const hash = 'a'.repeat(64), context = { kind: 'GENERAL' };
    const { conversation } = await createFoxyConversationRepository().create(tx, f.teacher, { requestId: randomUUID(), title: 'Recurso privado', context }, hash);
    const { turn } = await createFoxyTurnRepository().enqueue(tx, f.teacher, conversation.id,
      { requestId: randomUUID(), revision: '0', purpose: 'ACTIVITY_IDEAS', text: 'Preparar actividad', selection: { topicIds: [], sourceIds: [] } },
      { context, curriculum: null, sources: [] }, hash, { model: 'synthetic', promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' });
    const answer = { schemaVersion: 'foxy-answer-v1', title: 'Recurso', markdown: 'Contenido revisable.', references: [], warnings: [], missingInformation: [] };
    await tx.query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid", turn.id, JSON.stringify(answer));
    const { resource } = await service.fromTurn(f.T, conversation.id, turn.id);
    const payload = { title: 'Trabajo revisado', objective: 'Relacionar conceptos.', instructions: 'Explicá con evidencia.', teacherComment: 'Consultá tus fuentes.',
      unitId: f.unitId, topicIds: f.topicIds, evaluationRubric: [{ name: 'Evidencias', description: 'Justifica.', weight: 100 }] };
    const input = { requestId: randomUUID(), resourceRevision: resource.revision, classroomId: f.room, classroomRevision: await f.revision(), payload };
    const before = await service.get(f.T, resource.id), count = async () => Number((await local.pool.query('SELECT count(*) n FROM activities WHERE classroom_id=$1', [f.room])).rows[0].n);
    const result = await service.prepareActivity(f.T, resource.id, input);
    assert.deepEqual(await service.prepareActivity(f.T, resource.id, input), result); assert.equal(await count(), 1);
    const draft = (await f.classrooms.activityDetail(f.T, f.room, result.activityId, true)).activity;
    assert.equal(draft.status, 'DRAFT'); assert.equal(draft.instructions, payload.instructions); assert.equal(draft.objective, payload.objective);
    assert.deepEqual(draft.evaluationRubric, payload.evaluationRubric); assert.deepEqual(await service.get(f.T, resource.id), before);
    await assert.rejects(f.classrooms.activityDetail(f.S, f.room, result.activityId), { code: 'FORBIDDEN' });
    await assert.rejects(service.prepareActivity(f.O, resource.id, { ...input, requestId: randomUUID() }), { code: 'NOT_FOUND' });
    await assert.rejects(service.prepareActivity(f.S, resource.id, { ...input, requestId: randomUUID() }), { code: 'FORBIDDEN' });
    await assert.rejects(service.prepareActivity(f.T, resource.id, { ...input, payload: { ...payload, title: 'Alterado' } }), { code: 'CONFLICT' });
    await assert.rejects(service.prepareActivity(f.T, resource.id, { ...input, requestId: randomUUID() }), { code: 'CONFLICT' });
    await assert.rejects(service.prepareActivity(f.T, resource.id, { ...input, requestId: randomUUID(), classroomRevision: await f.revision(), resourceRevision: '999' }), { code: 'CONFLICT' });
    await assert.rejects(service.prepareActivity(f.T, resource.id, { ...input, requestId: randomUUID(), classroomRevision: await f.revision(), payload: { ...payload, evaluationRubric: [{ ...payload.evaluationRubric[0], weight: 80 }] } }), { code: 'INVALID_INPUT' });
    assert.equal(await count(), 1);
    // Failure after creating the activity must roll back both it and classroom revision.
    await tx.query("CREATE FUNCTION fail_handoff_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture handoff failure'; END $$");
    await tx.query('CREATE TRIGGER fail_handoff_fixture BEFORE INSERT ON foxy_resource_requests FOR EACH ROW EXECUTE FUNCTION fail_handoff_fixture()');
    const revision = await f.revision();
    await assert.rejects(service.prepareActivity(f.T, resource.id, { ...input, requestId: randomUUID(), classroomRevision: revision }), { code: 'SERVICE_UNAVAILABLE' });
    assert.equal(await count(), 1); assert.equal(await f.revision(), revision);
    await tx.query('DROP TRIGGER fail_handoff_fixture ON foxy_resource_requests');
    await tx.query('UPDATE classrooms SET archived_at=now() WHERE id=$1::uuid', f.room);
    await assert.rejects(service.prepareActivity(f.T, resource.id, { ...input, requestId: randomUUID(), classroomRevision: revision }), { code: 'CONFLICT' });
  }));
});
