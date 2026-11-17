import test from 'node:test';
import assert from 'node:assert/strict';
import type { FolderRow } from '../../../application/contracts.ts';
import { runCommand } from '../../application/commands.ts';

const classroomId = crypto.randomUUID();
const sourceUnitId = crypto.randomUUID();
const sourceTopicId = crypto.randomUUID();
const ownerId = crypto.randomUUID();
const command = { action: 'IMPORT_CLASSROOM_PLAN' };
const sample = { revision: '7', units: [{ id: sourceUnitId, title: 'Primera unidad', topics: [{ id: sourceTopicId, title: 'Tema' }] }] };
function folder(): FolderRow {
  return { id: crypto.randomUUID(), owner_id: ownerId, revision: 1n, status: 'DRAFT', created_at: new Date(), updated_at: new Date(),
    state: { version: 1, fields: { name: 'Mi carpeta', academicYear: 2026, bannerKey: 'general', linkedClassroomId: classroomId,
      planFileId: null, units: [] }, materials: [], conversations: [], creations: [], practices: [], exams: [], memory: {}, receipts: {} } };
}
const tx = { query: async () => [] };
const ports = { newId: () => crypto.randomUUID(), sources: async () => [],
  importPlan: async (_tx: unknown, owner: string, id: string) => {
    assert.equal(owner, ownerId); assert.equal(id, classroomId); return sample;
  } };
test('imports an authorized snapshot with private identifiers and activates without uploading', async () => {
  const room = folder();
  await runCommand(tx, room, command, ports);
  assert.equal(room.state.fields.units[0]!.title, 'Primera unidad');
  assert.notEqual(room.state.fields.units[0]!.id, sourceUnitId);
  assert.notEqual(room.state.fields.units[0]!.topics[0]!.id, sourceTopicId);
  assert.deepEqual(room.state.planOrigin, { classroomId, classroomRevision: '7' });
  room.state.fields.units[0]!.title = 'Mi edición';
  room.state.fields.linkedClassroomId = null;
  await runCommand(tx, room, { action: 'CONFIRM_FOLDER' }, ports);
  assert.equal(room.status, 'ACTIVE');
  assert.equal(room.state.fields.units[0]!.title, 'Mi edición');
  assert.equal(sample.units[0]!.title, 'Primera unidad');
});
test('a revoked or unrelated classroom cannot be copied', async () => {
  const room = folder();
  await assert.rejects(runCommand(tx, room, command, { ...ports, importPlan: async () => null }), { code: 'FORBIDDEN' });
  assert.deepEqual(room.state.fields.units, []);
});
