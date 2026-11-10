import test from 'node:test';
import assert from 'node:assert/strict';
import { repository } from '../.build/api/apps/api/src/modules/grading/infrastructure/progress-repository.js';
import { ProgressService } from '../.build/api/apps/api/src/bootstrap/academic-grading-composition.js';

test('progress groups 200 students and 100 activities in linear passes with exact results', async () => {
  let accesses = 0;
  const students = Array.from({ length: 200 }, (_, i) => ({ studentId: `student-${i}`, firstName: 'Synthetic', lastName: `${i}`, currentMember: true }));
  const rows = students.flatMap(student => Array.from({ length: 100 }, (_, n) => ({
    get studentId() { accesses++; return student.studentId; }, id: `activity-${n}`, title: 'fixture', type: 'TP', expected: true,
    firstSubmission: n < 50 ? { id: `attempt-${n}`, number: 1, submittedAt: '2026-01-01', appliedDeadlineAt: null, late: false } : null,
    pendingResubmission: false, grade: n < 50 ? '8' : null, confirmedAttempts: n < 50 ? 1 : 0,
  })));
  const tx = { query: async sql => sql.includes('FROM enrollments e JOIN users') ? students : [{ total: 0, taught: 0 }] };
  const context = { repository, progressRows: async () => rows, studentProgress: ProgressService.prototype.studentProgress };
  const result = await ProgressService.prototype.progressView.call(context, tx, 'synthetic-room', null);
  assert.equal(result.studentCount, 200);
  assert.equal(result.completion.expected, 20000);
  assert.equal(result.completion.delivered, 10000);
  assert.equal(result.performance.average, '8.00');
  assert.equal(result.students.length, 200);
  assert.ok(accesses <= rows.length * 4, `studentId accesses ${accesses} exceed linear bound`);
});
