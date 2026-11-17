import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyService } from '../../../folders/public.ts';

function fixture(provider) {
  const owner = crypto.randomUUID(), folderId = crypto.randomUUID(), conversationId = crypto.randomUUID(), sourceId = crypto.randomUUID();
  let row = { id: folderId, owner_id: owner, revision: 1n, status: 'ACTIVE', created_at: new Date(), updated_at: new Date(), state: {
    version: 1, fields: { name: 'Privada', academicYear: 2026, bannerKey: 'general', linkedClassroomId: null, planFileId: null, units: [] },
    conversations: [{ id: conversationId, title: 'Consulta', turns: [] }], materials: [], creations: [], practices: [], exams: [], memory: {}, receipts: {} } };
  let inTransaction = false, providers = 0, saves = 0;
  const calls = [], tx = {};
  const service = createStudyService({
    uow: { run: async (request, write, operation) => {
      assert.equal(inTransaction, false, 'no nested UoW'); assert.equal(write, true);
      calls.push('begin'); inTransaction = true;
      try { return await operation(tx, owner); } finally { inTransaction = false; calls.push('end'); }
    } },
    folders: { load: async (actual, actualOwner, id, write) => {
      assert.equal(actual, tx); assert.equal(actualOwner, owner); assert.equal(id, folderId); assert.equal(write, true);
      assert.equal(inTransaction, true); calls.push('load'); return structuredClone(row);
    }, save: async (actual, next, serialized) => {
      assert.equal(actual, tx); assert.equal(inTransaction, true); saves++; calls.push('save');
      row = { ...next, state: JSON.parse(serialized), revision: row.revision + 1n }; return structuredClone(row);
    } },
    sources: async actual => { assert.equal(actual, tx); assert.equal(inTransaction, true); calls.push('sources');
      return [{ id: sourceId, version: 'v1', title: 'Fuente', origin: 'OWN', fileId: sourceId, text: 'Contenido', available: true }]; },
    newId: () => crypto.randomUUID(), digest: value => value,
    generate: async (input, context) => {
      providers++; assert.equal(inTransaction, false); calls.push('provider');
      assert.equal(saves, 1); assert.equal(row.state.receipts[context.requestId].result.status, 'PENDING');
      assert.equal(row.state.conversations[0].turns.length, 0); assert.equal(row.state.creations.length, 0);
      await context.authorize(); assert.equal(inTransaction, false);
      if (provider) return provider(input, context);
      return { status: 'COMPLETE', title: 'Respuesta', markdown: 'Contenido', sourceRefs: [{ id: sourceId, version: 'v1' }], missingInformation: [] };
    },
  });
  return { service, calls, folderId, command: { action: 'CHAT', requestId: crypto.randomUUID(), revision: '1', conversationId, message: 'Hola' },
    get row() { return row; }, get providers() { return providers; }, get saves() { return saves; } };
}

test('durable preparation, each authorization and final application retain four separate UoWs', async () => {
  const f = fixture();
  const result = await f.service.command({}, f.folderId, f.command);
  assert.equal(f.providers, 1); assert.equal(f.saves, 2); assert.equal(f.row.revision, 3n);
  assert.deepEqual(f.calls, [
    'begin', 'load', 'sources', 'save', 'end',
    'begin', 'load', 'sources', 'end',
    'provider', 'begin', 'load', 'sources', 'end',
    'begin', 'load', 'sources', 'sources', 'save', 'end',
  ]);
  assert.equal(f.row.state.conversations[0].turns.length, 2);
  assert.deepEqual((await f.service.command({}, f.folderId, f.command)).result, result.result);
  assert.equal(f.providers, 1); assert.equal(f.saves, 2);
});

test('provider failure retains its identity and commits only FAILED after durable PENDING', async () => {
  const rejection = new Error('synthetic failure'), f = fixture(async () => { throw rejection; });
  await assert.rejects(f.service.command({}, f.folderId, f.command), error => error === rejection);
  assert.equal(f.providers, 1); assert.equal(f.saves, 2);
  assert.deepEqual(f.row.state.receipts[f.command.requestId].result, { status: 'FAILED' });
  assert.equal(f.row.state.conversations[0].turns.length, 0);
  assert.equal(f.row.state.creations.length, 0);
  assert.deepEqual((await f.service.command({}, f.folderId, f.command)).result, { status: 'FAILED' });
  assert.equal(f.providers, 1); assert.equal(f.saves, 2);
});
