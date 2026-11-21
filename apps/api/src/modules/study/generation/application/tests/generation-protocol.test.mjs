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

test('new finalized answers do not alter the authorized snapshot of a source-based note or outline', async () => {
  for (const kind of ['NOTE', 'EXPLANATION', 'OUTLINE']) {
    const f = fixture(), command = { ...f.command, kind };
    const plan = await protocol.prepareStudyOperation(f.tx, f.row, command, f.ports);
    assert.equal(Object.hasOwn(plan.input, 'evidence'), false);
    f.row.state.practices.push({ status: 'FINALIZED', result: { questions: [
      { topicId: f.command.topicIds[0], score: 0, feedbackStatus: 'OBJECTIVE' },
    ] } });
    await protocol.validatePreparedStudyOperation(f.tx, f.row, command, plan, f.ports, text => text);
  }
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

test('feedback includes bounded examples from its linked conversation only while their sources remain available', async () => {
  const f = fixture(), practiceId = crypto.randomUUID(), linked = f.row.state.conversations[0];
  const ref = { id: f.sourceId, version: 'v1' };
  const eligible = Array.from({ length: 8 }, (_, index) => ({
    role: 'assistant', text: `Caso ${index}. ${'x'.repeat(1700)}`, sourceRefs: [ref],
  }));
  linked.turns.push(...eligible,
    { role: 'assistant', text: 'Vimos 4 cm en el dibujo a escala 1:50.', sourceRefs: [ref] },
    { role: 'assistant', text: 'Fuente reemplazada', sourceRefs: [{ ...ref, version: 'anterior' }] },
    { role: 'assistant', text: 'Adjunto retirado', sourceRefs: [ref], attachmentIds: [crypto.randomUUID()] },
    { role: 'user', text: 'Consulta sin respaldo', sourceRefs: [] },
    { role: 'user', text: 'Solicitud de una creación', sourceRefs: [ref], generation: { requestId: 'intent' } });
  f.row.state.conversations.push({ id: crypto.randomUUID(), title: 'Otro chat',
    turns: [{ role: 'assistant', text: 'Contexto privado del otro chat', sourceRefs: [ref] }] });
  const practice = { id: practiceId, kind: 'EXERCISE', title: 'Práctica', version: 1, status: 'FINALIZED',
    sourceRefs: [ref], answers: { question: 'Mi respuesta' }, conversationId: linked.id,
    privatePractice: { title: 'Práctica', questions: [] } };
  f.row.state.practices.push(practice);
  const command = { action: 'RETRY_FEEDBACK', practiceId, requestId: crypto.randomUUID(), revision: '1' };
  const plan = await protocol.prepareStudyOperation(f.tx, f.row, command, f.ports);
  assert.equal(plan.input.history.length, 4);
  assert.ok(plan.input.history.every(turn => turn.text.length <= 800));
  assert.deepEqual(plan.input.history.map(turn => [turn.text.slice(0, 7), turn.sourceRefs]),
    [['Caso 5.', [ref]], ['Caso 6.', [ref]], ['Caso 7.', [ref]], ['Vimos 4', [ref]]]);
  linked.turns.at(-5).sourceRefs = [{ ...ref, version: 'anterior' }];
  await assert.rejects(protocol.validatePreparedStudyOperation(f.tx, f.row, command, plan, f.ports, text => text),
    { code: 'SOURCE_UNAVAILABLE' });
  delete practice.conversationId;
  const unlinked = await protocol.prepareStudyOperation(f.tx, f.row, command, f.ports);
  assert.equal(unlinked.input.history, undefined);
});

test('feedback with sparse PDF metadata snapshots linked history after loading and reauthorizes custody', async () => {
  const f = fixture(), practiceId = crypto.randomUUID(), linked = f.row.state.conversations[0];
  const ref = { id: f.sourceId, version: 'v1' };
  linked.turns.push({ role: 'assistant', text: 'Ya probamos con 4 cm.', sourceRefs: [ref] });
  f.row.state.practices.push({ id: practiceId, kind: 'EXERCISE', title: 'Práctica', version: 1, status: 'FINALIZED',
    sourceRefs: [ref], answers: {}, conversationId: linked.id, privatePractice: { title: 'Práctica', questions: [] } });
  const command = { action: 'RETRY_FEEDBACK', practiceId, requestId: crypto.randomUUID(), revision: '1' };
  let custodyVersion = 'documento-v1', reads = 0;
  const documents = protocol.createRequestDocuments({ async prepareRead() {
    return { version: custodyVersion, async load() { reads++; return { text: '', document: { kind: 'pdf', bytes: Uint8Array.of(1) } }; } };
  } });
  const ports = { ...f.ports, files: documents.files,
    async sources(...args) { return (await f.ports.sources(...args)).map(source => ({ ...source, text: '' })); } };
  const plan = await protocol.prepareStudyOperation(f.tx, f.row, command, ports);
  assert.equal(plan.input.history, undefined);
  assert.equal(plan.input.sources.length, 0);
  assert.equal(reads, 0);
  await documents.load(plan);
  const current = await protocol.validatePreparedStudyOperation(f.tx, f.row, command, plan, ports, text => text);
  assert.deepEqual(current.input.history, [{ role: 'assistant', text: 'Ya probamos con 4 cm.', sourceRefs: [ref] }]);
  assert.equal(current.input.sources[0].document.kind, 'pdf');
  assert.equal(reads, 1);
  custodyVersion = 'documento-v2';
  await assert.rejects(protocol.validatePreparedStudyOperation(f.tx, f.row, command, plan, ports, text => text),
    { code: 'SOURCE_UNAVAILABLE' });
  assert.equal(reads, 1);
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
