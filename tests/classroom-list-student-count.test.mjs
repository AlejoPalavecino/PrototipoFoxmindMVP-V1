import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
const teacher = '10000000-0000-4000-8000-000000000001', student = '20000000-0000-4000-8000-000000000002';
const room = { id: '30000000-0000-4000-8000-000000000003', teacher_id: teacher, student_count: 17, plan_progress: { taught: 1, total: 4 } };
async function list(actorId, rows) {
  const { createCatalogOperations } = loadTsModule('apps/api/src/modules/classrooms/catalog/application/classroom-queries.ts');
  const { createCatalogRepository } = loadTsModule('apps/api/src/modules/classrooms/catalog/infrastructure/classroom-queries-repository.ts');
  const { mine } = createCatalogOperations(createCatalogRepository(), { readCode() {}, digest() {} });
  const calls = [];
  const tx = { query: async (sql, ...params) => { calls.push({ sql, params }); return rows; } };
  const result = await mine({ run: async (_request, write, work) => { assert.equal(write, false); return work(tx, { id: actorId }); }, summary: row => ({ id: row.id }) }, {});
  return { result, calls };
}
test('classroom list includes the persisted active student count for teacher and student', async () => {
  for (const [actorId, section] of [[teacher, 'teach'], [student, 'study']]) {
    const { result, calls } = await list(actorId, [room]);
    assert.deepEqual(result[section], [{ id: room.id, planProgress: room.plan_progress, studentCount: 17 }]);
    assert.equal(result[section === 'teach' ? 'study' : 'teach'].length, 0);
    assert.deepEqual(calls[0].params, [actorId]);
  }
});
test('count projection retains the owner or active membership SQL boundary and returns no extra classrooms', async () => {
  const { result, calls } = await list(student, []);
  assert.deepEqual(result, { teach: [], study: [] });
  assert.equal(calls.length, 1);
  const sql = calls[0].sql;
  assert.match(sql, /WHERE c\.teacher_id=\$1::uuid OR EXISTS\(SELECT 1 FROM enrollments e\s+JOIN membership_periods m ON m\.enrollment_id=e\.id WHERE e\.classroom_id=c\.id AND e\.student_id=\$1::uuid AND m\.ended_at IS NULL\)/);
  assert.match(sql, /SELECT count\(\*\)::int FROM enrollments e WHERE e\.classroom_id=c\.id\s+AND EXISTS \(SELECT 1 FROM membership_periods mp WHERE mp\.enrollment_id=e\.id AND mp\.ended_at IS NULL\)/);
});
