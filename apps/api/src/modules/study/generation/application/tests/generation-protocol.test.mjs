import test from 'node:test';
import assert from 'node:assert/strict';
import * as protocol from '../../public.ts';

function fixture() {
  const id = crypto.randomUUID(), topicId = crypto.randomUUID(), sourceId = crypto.randomUUID(), conversationId = crypto.randomUUID();
  const row = { id, owner_id: crypto.randomUUID(), revision: 1n, status: 'ACTIVE',
    created_at: new Date(), updated_at: new Date(), state: { version: 1,
      fields: { name: 'Privada', academicYear: 2026, bannerKey: 'general', linkedClassroomId: null, planFileId: null,
        units: [{ id: crypto.randomUUID(), title: 'Unidad', topics: [{ id: topicId, title: 'Tema' }] }] },
      materials: [], conversations: [{ id: conversationId, title: 'Consulta', turns: [] }], creations: [], practices: [], exams: [], memory: {}, receipts: {} } };
  const source = { id: sourceId, version: 'v1', title: 'Material', origin: 'OWN', fileId: sourceId, text: 'Contenido', available: true };
  let available = true, ids = 0, providers = 0;
  const ports = { newId: () => { ids++; return crypto.randomUUID(); }, sources: async () => available ? [structuredClone(source)] : [],
    generate: async () => { providers++; assert.fail('preparation/validation/application must never dispatch'); } };
  const command = { action: 'GENERATE', kind: 'NOTE', conversationId, message: 'Apunte', topicIds: [topicId], sourceIds: [sourceId], requestId: crypto.randomUUID(), revision: '1' };
  return { row, ports, command, tx: {}, sourceId, revoke: () => { available = false; }, get ids() { return ids; }, get providers() { return providers; } };
}

test('preparation and validation have no provider, resource, receipt or ID allocation effects', async () => {
  const f = fixture(), before = structuredClone(f.row);
  const plan = await protocol.prepareStudyOperation(f.tx, f.row, f.command, f.ports);
  assert.equal(plan.mode, 'generate'); assert.equal(plan.input.action, 'NOTE');
  assert.deepEqual(f.row, before); assert.equal(f.ids, 0); assert.equal(f.providers, 0);
  await protocol.validatePreparedStudyOperation(f.tx, f.row, f.command, plan, f.ports, text => text);
  assert.deepEqual(f.row, before); assert.equal(f.ids, 0); assert.equal(f.providers, 0);
});

test('reservation creates only one durable request; apply creates exactly one resource card', async () => {
  const f = fixture(), plan = await protocol.prepareStudyOperation(f.tx, f.row, f.command, f.ports);
  protocol.reserveStudyOperation(f.row, plan, f.ports);
  protocol.reserveStudyOperation(f.row, plan, f.ports);
  assert.equal(f.row.state.conversations[0].turns.length, 1);
  assert.equal(f.row.state.creations.length, 0); assert.equal(f.ids, 1);
  const validated = await protocol.validatePreparedStudyOperation(f.tx, f.row, f.command, plan, f.ports, text => text);
  const result = await protocol.applyPreparedStudyOperation(f.tx, f.row, validated, { mode: 'generate', value: {
    status: 'COMPLETE', title: 'Apunte', markdown: 'Contenido', sourceRefs: [{ id: f.sourceId, version: 'v1' }], missingInformation: [] } }, f.ports);
  assert.equal(f.row.state.creations.length, 1);
  assert.equal(f.row.state.conversations[0].turns.length, 2);
  assert.equal(f.row.state.conversations[0].turns[1].creationId, result.creation.id);
  assert.equal(f.providers, 0);
});

test('revoked sources fail validation and final apply without creating a resource', async () => {
  const f = fixture(), plan = await protocol.prepareStudyOperation(f.tx, f.row, f.command, f.ports);
  f.revoke();
  await assert.rejects(protocol.validatePreparedStudyOperation(f.tx, f.row, f.command, plan, f.ports, text => text), { code: 'SOURCE_UNAVAILABLE' });
  await assert.rejects(protocol.applyPreparedStudyOperation(f.tx, f.row, plan, { mode: 'generate', value: {
    status: 'COMPLETE', title: 'Apunte', markdown: 'Contenido', sourceRefs: [], missingInformation: [] } }, f.ports), { code: 'SOURCE_UNAVAILABLE' });
  assert.equal(f.row.state.creations.length, 0); assert.equal(f.providers, 0);
});

test('feedback preparation and validation preserve finalized answers and never generate', async () => {
  const f = fixture(), practiceId = crypto.randomUUID();
  f.row.state.practices.push({ id: practiceId, kind: 'QUIZ', title: 'Practica', version: 1, status: 'FINALIZED',
    sourceRefs: [{ id: f.sourceId, version: 'v1' }], answers: { question: 'Mi respuesta' },
    privatePractice: { title: 'Practica', questions: [] } });
  const command = { action: 'RETRY_FEEDBACK', practiceId, requestId: crypto.randomUUID(), revision: '1' };
  const before = structuredClone(f.row);
  const plan = await protocol.prepareStudyOperation(f.tx, f.row, command, f.ports);
  assert.equal(plan.mode, 'feedback');
  assert.deepEqual(plan.input.answers, { question: 'Mi respuesta' });
  protocol.reserveStudyOperation(f.row, plan, f.ports);
  const current = await protocol.validatePreparedStudyOperation(f.tx, f.row, command, plan, f.ports, text => text);
  assert.deepEqual(f.row, before); assert.equal(f.ids, 0); assert.equal(f.providers, 0);
  await protocol.applyPreparedStudyOperation(f.tx, f.row, current, { mode: 'feedback', value: {
    orientative: true, status: 'COMPLETE', title: 'Devolucion', markdown: 'Revisa la idea',
    sourceRefs: [{ id: f.sourceId, version: 'v1' }], missingInformation: [] } }, f.ports);
  assert.deepEqual(f.row.state.practices[0].answers, { question: 'Mi respuesta' });
  assert.equal(f.row.state.practices[0].feedback.markdown, 'Revisa la idea');
  assert.equal(f.row.state.creations.length, 0);
});

test('provider failure identity crosses explicit execution unchanged', async () => {
  const f = fixture(), plan = await protocol.prepareStudyOperation(f.tx, f.row, f.command, f.ports);
  const rejection = new Error('synthetic provider rejection');
  await assert.rejects(protocol.executePreparedStudyOperation(plan, { generate: async () => { throw rejection; } },
    { ownerId: f.row.owner_id, requestId: f.command.requestId }), error => error === rejection);
  assert.equal(f.row.state.creations.length, 0);
});

test('legacy generation without a conversation preserves its default Spanish instruction', async () => {
  const f = fixture(); delete f.command.conversationId; delete f.command.message;
  const plan = await protocol.prepareStudyOperation(f.tx, f.row, f.command, f.ports);
  assert.equal(plan.input.message, 'Generá note para los temas seleccionados.');
  protocol.reserveStudyOperation(f.row, plan, f.ports);
  assert.equal(f.row.state.conversations[0].turns.length, 0);
});
