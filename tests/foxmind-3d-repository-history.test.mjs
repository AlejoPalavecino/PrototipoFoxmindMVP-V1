import test from 'node:test';
import assert from 'node:assert/strict';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';

test('D9 teacher submissions publish explicit gradePublished false/true without private grade payloads', { timeout: 60000 }, async () => {
  const { ClassroomService } = await import('../apps/api/src/classrooms/index.ts');
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ database, query }) => {
    const f = await homeFixture(query), a = await f.activity('teach');
    const ungraded = await f.attempt(a), privateAttempt = await f.attempt(a, { number: 2 }), published = await f.attempt(a, { number: 3 });
    await f.grade(a, privateAttempt, { value: '0' }); await f.grade(a, published, { value: '8', published: true });
    const service = new ClassroomService({ database, files: {}, authenticate: async (_tx, request) => request.actor,
      signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 1000000n, webOrigin: 'http://127.0.0.1:3005' });
    const result = await service.activitySubmissions({ actor: f.actor, headers: {} }, f.rooms.teach.id, a.id);
    const states = Object.fromEntries(result.attempts.map(row => [row.id, row.gradePublished]));
    assert.deepEqual(states, { [ungraded]: false, [privateAttempt]: false, [published]: true });
    assert.ok(result.attempts.every(row => typeof row.gradePublished === 'boolean'));
    assert.doesNotMatch(JSON.stringify(result), /overallFeedback|overall_feedback|correctAnswers|editorToken/);
    await assert.rejects(service.activitySubmissions({ actor: f.pupil, headers: {} }, f.rooms.teach.id, a.id), { code: 'FORBIDDEN' });
  }));
});
