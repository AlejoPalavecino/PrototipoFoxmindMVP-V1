import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const room = (id, role, extra = {}) => ({ id, role, name: id, subject: 'Ciencias', division: 'A',
  academicYear: 2026, timezone: 'UTC', coverKey: 'biology', teacher: 'Ada Sintética',
  revision: '1', archived: false, ...extra });
const filter = () => loadTsModule('apps/web/src/features/classrooms/model/collection-filter.ts').filterClassroomCards;
const ids = rows => rows.map(row => row.id);

test('teacher search uses normalized DTO names and preserves role boundaries without mutation', () => {
  const teach = [room('teach', 'teacher', { teacher: 'ＬＵＺ SINTÉTICA' })];
  const study = [room('study', 'student', { teacher: 'Otra Persona' })];
  const before = structuredClone({ teach, study });
  assert.deepEqual(ids(filter()(teach, study, 'all', '  luz sintética  ')), ['teach']);
  assert.deepEqual(ids(filter()(teach, study, 'study', 'luz')), []);
  assert.deepEqual(ids(filter()(teach, study, 'all', 'otra persona')), ['study']);
  assert.deepEqual({ teach, study }, before);
});

test('advanced criteria intersect after teacher-wins deduplication and retain stable order', () => {
  const study = [room('first', 'student'), room('both', 'student', { academicYear: 2025 })];
  const teach = [room('both', 'teacher', { archived: true, division: 'B' }),
    room('last', 'teacher', { archived: true, academicYear: 2025, division: 'B' })];
  const run = options => ids(filter()(teach, study, 'all', '', options));
  assert.deepEqual(run(), ['first', 'both', 'last']);
  assert.deepEqual(run({ state: 'active' }), ['first']);
  assert.deepEqual(run({ state: 'archived', academicYear: '2026', division: 'B' }), ['both']);
  assert.deepEqual(run({ academicYear: '2025' }), ['last']);
  assert.deepEqual(ids(filter()(teach, study, 'study', '', { state: 'archived' })), []);
  assert.deepEqual(run({ state: 'archived', division: 'b' }), [], 'division uses exact stored value');
  assert.deepEqual(run({ academicYear: '20260' }), [], 'year is exact, not a substring');
});

test('empty datasets and unknown advanced selections never fabricate matching rooms', () => {
  assert.deepEqual(filter()([], [], 'all', '', { state: 'archived' }), []);
  assert.deepEqual(filter()([room('only', 'teacher')], [], 'all', '', { division: 'Missing' }), []);
});
