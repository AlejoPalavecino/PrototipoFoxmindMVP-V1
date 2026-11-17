import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyService } from '../../application/service.ts';
import { createStudentUnitOfWork } from '../unit-of-work.ts';
import { createFolderRepository } from '../folder-repository.ts';
import type { FolderRow, StudyDatabase } from '../../../application/contracts.ts';
import type { StudyUnit } from '../../../../../../../../src/core/domain/study/folders.ts';

function fixture() {
  const owner = crypto.randomUUID(), classroomA = crypto.randomUUID(), classroomB = crypto.randomUUID();
  const originalUnit = { id: crypto.randomUUID(), title: 'A editada', topics: [{ id: crypto.randomUUID(), title: 'Tema A editado' }] };
  let row: FolderRow = { id: crypto.randomUUID(), owner_id: owner, status: 'DRAFT', revision: 3n, created_at: new Date(), updated_at: new Date(), state: {
    version: 1, fields: { name: 'Mi carpeta', subject: 'Historia', wizardStep: 1, academicYear: 2026, bannerKey: 'general',
      linkedClassroomId: classroomA, planFileId: null, units: [originalUnit] }, planOrigin: { classroomId: classroomA, classroomRevision: '7' },
    materials: [{ id: crypto.randomUUID(), title: 'Material propio', fileId: crypto.randomUUID(), topicIds: [] }],
    conversations: [{ id: crypto.randomUUID(), title: 'Historial', turns: [] }], creations: [], practices: [], exams: [], memory: { preserved: true }, receipts: {} } };
  let authorized = true, role = 'student', calls = 0;
  let source: { revision: string; units: StudyUnit[] } = { revision: '11', units: [{ id: crypto.randomUUID(), title: 'Unidad B', topics: [{ id: crypto.randomUUID(), title: 'Tema B' }] }] };
  const database: StudyDatabase = { async $transaction(operation) {
    const before = structuredClone(row);
    try { return await operation({ $queryRawUnsafe: async <T>(sql: string, ...values: unknown[]) => {
      let result: unknown[] = [];
      if (sql.includes('FROM users')) result = [{ account_role: role, email_verified_at: new Date() }];
      else if (sql.includes('FROM study_folders')) result = row.id === values[0] && row.owner_id === values[1] && row.status !== 'DELETED' ? [structuredClone(row)] : [];
      else if (sql.includes('UPDATE study_folders')) { row = { ...row, state: JSON.parse(String(values[2])), status: values[3] as FolderRow['status'], revision: row.revision + 1n }; result = [structuredClone(row)]; }
      return result as T;
    } }); } catch (error) { row = before; throw error; }
  } };
  const service = createStudyService({ uow: createStudentUnitOfWork({ database, authenticate: async (_tx, request) => (request as { owner?: string }).owner ?? owner }),
    folders: createFolderRepository(), newId: () => crypto.randomUUID(), digest: value => value, sources: async () => [],
    linkedClassrooms: async () => [], verifyLink: async () => {}, importPlan: async (_tx, id, classroom) => {
      calls++; assert.equal(id, owner); assert.equal(classroom, classroomB); return authorized ? source : null;
    } });
  return { service, classroomA, classroomB, get row() { return row; }, get calls() { return calls; }, get source() { return source; },
    revoke() { authorized = false; }, actor(value: string) { role = value; }, invalidSource() { source = { revision: '11', units: Array.from({ length: 101 }, () => source.units[0]!) }; },
    input(extra: Record<string, unknown> = {}) { return { action: 'IMPORT_CLASSROOM_PLAN', classroomId: classroomB, requestId: crypto.randomUUID(), revision: String(row.revision), ...extra }; } };
}

test('draft A to B replaces link, origin and private curriculum atomically while preserving other state and replay', async () => {
  const f = fixture(), before = structuredClone(f.row), input = f.input();
  const response = await f.service.command({}, f.row.id, input);
  assert.equal(response.folder.linkedClassroomId, f.classroomB);
  assert.deepEqual(response.folder.planOrigin, { classroomId: f.classroomB, classroomRevision: '11' });
  assert.equal(response.folder.units[0]!.title, 'Unidad B');
  assert.notEqual(response.folder.units[0]!.id, f.source.units[0]!.id); assert.notEqual(response.folder.units[0]!.id, before.state.fields.units[0]!.id);
  assert.notEqual(response.folder.units[0]!.topics[0]!.id, f.source.units[0]!.topics[0]!.id);
  const { units: _old, linkedClassroomId: _a, ...oldFields } = before.state.fields;
  const { units: _new, linkedClassroomId: _b, ...newFields } = f.row.state.fields;
  assert.deepEqual(newFields, oldFields);
  for (const key of ['materials', 'conversations', 'creations', 'practices', 'exams', 'memory'] as const) assert.deepEqual(f.row.state[key], before.state[key]);
  const saved = structuredClone(f.row); assert.deepEqual(await f.service.command({}, f.row.id, input), response); assert.deepEqual(f.row, saved); assert.equal(f.calls, 1);
  await assert.rejects(f.service.command({}, f.row.id, f.input()), { code: 'CONFLICT' }); assert.deepEqual(f.row, saved);
});

test('revoked B and invalid curriculum preserve both imported A and its link without receipts or revision changes', async () => {
  for (const invalid of [false, true]) {
    const f = fixture(); if (invalid) f.invalidSource(); else f.revoke(); const before = structuredClone(f.row);
    await assert.rejects(f.service.command({}, f.row.id, f.input()), { code: invalid ? 'INVALID_INPUT' : 'FORBIDDEN' });
    assert.deepEqual(f.row, before);
  }
});

test('replacement respects folder owner, student role, revision, target UUID and draft-only scope', async () => {
  for (const scenario of ['foreign', 'teacher', 'revision', 'uuid', 'ACTIVE', 'ARCHIVED', 'DELETED']) {
    const f = fixture(), request = scenario === 'foreign' ? { owner: crypto.randomUUID() } : {}, input = f.input();
    if (scenario === 'teacher') f.actor('teacher');
    if (scenario === 'revision') input.revision = '1';
    if (scenario === 'uuid') Object.assign(input, { classroomId: 'bad' });
    if (['ACTIVE', 'ARCHIVED', 'DELETED'].includes(scenario)) f.row.status = scenario as FolderRow['status'];
    const before = structuredClone(f.row);
    const code = ['foreign', 'teacher', 'DELETED'].includes(scenario) ? 'FORBIDDEN' : scenario === 'uuid' ? 'INVALID_INPUT' : 'CONFLICT';
    await assert.rejects(f.service.command(request, f.row.id, input), { code });
    assert.equal(f.calls, 0); assert.deepEqual(f.row, before);
  }
});

test('legacy import without explicit target can recover a mixed draft using its linked classroom', async () => {
  const f = fixture(); f.row.state.fields.linkedClassroomId = f.classroomB;
  const input = f.input(); delete (input as { classroomId?: string }).classroomId;
  const response = await f.service.command({}, f.row.id, input);
  assert.equal(response.folder.planOrigin!.classroomId, f.classroomB); assert.equal(response.folder.units[0]!.title, 'Unidad B');
});
