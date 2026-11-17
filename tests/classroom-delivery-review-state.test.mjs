import test from 'node:test';
import assert from 'node:assert/strict';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';

test('historial docente distingue pendiente, revisión privada incluso cero y publicación sin filtrarlo a alumno', { timeout: 60000 }, async () => {
  const { ClassroomService } = await import('./helpers/academic-fixture.ts');
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ database, query }) => {
    const f = await homeFixture(query), a = await f.activity('teach');
    const pending = await f.attempt(a), saved = await f.attempt(a, { number: 2 }), published = await f.attempt(a, { number: 3 });
    await f.grade(a, saved, { value: '0' }); await f.grade(a, published, { value: '8', published: true });
    const service = new ClassroomService({ database, files: { load() { assert.fail("Unexpected files"); }, loadAuthorized() { assert.fail("Unexpected files"); }, promoteDraftPlanInTransaction() { assert.fail("Unexpected files"); } }, authenticate: async (_tx, request) => request.actor,
      signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 1000000n, webOrigin: 'http://127.0.0.1:3005' });
    const teacher = await service.activitySubmissions({ actor: f.teacherActor, headers: {} }, f.rooms.teach.id, a.id);
    assert.deepEqual(Object.fromEntries(teacher.attempts.map(row => [row.id, row.reviewState])), { [pending]: 'pending', [saved]: 'saved', [published]: 'published' });
    assert.equal(teacher.expectedStudentCount, 1);
    assert.deepEqual(teacher.waitingStudents, []);
    const waitingActivity = await f.activity('teach');
    await f.attempt(waitingActivity, { submitted: false });
    const waiting = await service.activitySubmissions({ actor: f.teacherActor, headers: {} }, f.rooms.teach.id, waitingActivity.id);
    assert.equal(waiting.waitingStudents.length, 1);
    assert.equal(waiting.waitingStudents[0].studentId, f.pupil);
    const student = await service.activityHistory({ actor: f.pupil, headers: {} }, f.rooms.teach.id, a.id);
    assert.ok(student.attempts.every(row => !Object.hasOwn(row, 'reviewState')));
    assert.equal(Object.hasOwn(student, 'waitingStudents'), false);
    assert.doesNotMatch(JSON.stringify(student), /reviewState|overallFeedback|overall_feedback|finalGrade|final_grade/);
    await assert.rejects(service.activitySubmissions({ actor: f.pupil, headers: {} }, f.rooms.teach.id, a.id), { code: 'FORBIDDEN' });
    await assert.rejects(service.activityHistory({ actor: f.outsider, headers: {} }, f.rooms.teach.id, a.id), { code: 'FORBIDDEN' });
  }));
});
