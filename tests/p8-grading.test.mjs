import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { randomUUID } from 'node:crypto';
import { withGradingFixture, tableHash, gradingTables, protectedTables } from './p8-grading-helpers.mjs';

test('private grading is exposed on the final service without losing P7 methods', () => {
  for (const name of ['getAttemptGrading', 'saveAttemptGrading', 'activityAttempt', 'reopenActivity', 'saveAttemptAnswer', 'submitPracticalAttempt']) {
    assert.equal(typeof ClassroomService.prototype[name], 'function', name);
  }
});

test('controlled SQL private correction preserves pending/zero, every receipt and historical authority', { timeout: 150000 }, async t => {
  await withGradingFixture(async f => {
    const { service, T, S, F, room, pool, create, input } = f;
    const rejected = (fn, code) => f.rejected(async () => fn(), code);
    let failed = false; const check = (name, fn) => t.test(name, { skip: failed ? 'Earlier private-grading prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; throw e; } });
    const activities = [];
    for (const type of ['QUESTIONNAIRE', 'EVALUATION', 'ASSIGNMENT']) activities.push(await create(type));
    await check('GET preview is read-only and server objectives are exact without inserting any draft', async () => {
      const before = await tableHash(pool, gradingTables), view = await service.getAttemptGrading(T, room, activities[0].attempt);
      assert.equal(view.grade.id, null); assert.equal(view.grade.finalGrade, null); assert.equal(view.grade.pending, true);
      assert.deepEqual(view.activity.questions[1].earned, { numerator: '4', denominator: '1' });
      assert.equal(await tableHash(pool, gradingTables), before);
    });
    for (const [index, activity] of activities.entries()) await check(`${index} private save persists/reloads feedback, nullable pending and genuine zero without publication`, async () => {
      const protectedBefore = await tableHash(pool, protectedTables), preview = await service.getAttemptGrading(T, room, activity.attempt), body = input(preview);
      body.overallFeedback = 'General private feedback 😀';
      if (index !== 2) body.questions[0].feedback = 'Pending manual feedback';
      let result = await service.saveAttemptGrading(T, room, activity.attempt, body);
      assert.equal(result.grade.isPublished, false); assert.equal(result.grade.finalGrade, null);
      if (index !== 2) {
        const pending = (await pool.query('SELECT earned_numerator,earned_denominator,feedback FROM question_grades WHERE question_id=$1', [preview.activity.questions[0].id])).rows[0];
        assert.deepEqual(pending, { earned_numerator: null, earned_denominator: null, feedback: 'Pending manual feedback' });
      }
      const restored = await new ClassroomService(f.ports).getAttemptGrading(T, room, activity.attempt);
      assert.deepEqual(restored, result); const complete = input(restored);
      complete.overallFeedback = body.overallFeedback;
      if (index === 2) complete.overallGrade = '0'; else { complete.questions[0].points = '0'; complete.questions[0].feedback = 'Explicit earned zero'; }
      result = await service.saveAttemptGrading(T, room, activity.attempt, complete);
      assert.equal(result.grade.finalGrade, index === 2 ? '0.00' : '5.00'); assert.equal(result.grade.pending, false);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [activity.attempt])).rows[0].n, 1);
      assert.equal(await tableHash(pool, protectedTables), protectedBefore);
      const own = await service.activityAttempt(S, room, activity.attempt);
      assert.ok(!/"(?:finalGrade|overallFeedback|manualPoints|earned|correct|scoringRule)"/.test(JSON.stringify(own)));
      await rejected(() => service.getAttemptGrading(S, room, activity.attempt), 'FORBIDDEN');
    });
    await check('forged objectives, excess precision, foreign IDs, student and DRAFT are rejected without mutation', async () => {
      const activity = activities[0], view = await service.getAttemptGrading(T, room, activity.attempt), body = input(view);
      for (const invalid of [ { ...body, overallGrade: '8.50' }, { ...body, publish: true },
        { ...body, questions: body.questions.map((q, i) => ({ ...q, points: i ? '6' : '1' })) },
        { ...body, questions: body.questions.map((q, i) => ({ ...q, points: i ? null : '8.345' })) },
        { ...body, questions: body.questions.map(q => ({ ...q, questionId: randomUUID() })) } ])
        await rejected(() => service.saveAttemptGrading(T, room, activity.attempt, invalid), 'INVALID_INPUT');
      await rejected(() => service.getAttemptGrading(F, room, activity.attempt), 'FORBIDDEN');
      await rejected(() => service.saveAttemptGrading(S, room, activity.attempt, body), 'FORBIDDEN');
      await rejected(() => service.getAttemptGrading(T, randomUUID(), activity.attempt), 'FORBIDDEN');
      const draft = await create('QUESTIONNAIRE', { submitted: false });
      await rejected(() => service.getAttemptGrading(T, room, draft.attempt), 'FORBIDDEN');
    });
    await check('confirmed incomplete blanks are zero without manual work; competing classroom CAS admits one writer', async () => {
      const blank = await create('EVALUATION', { blank: true }), view = await service.getAttemptGrading(T, room, blank.attempt);
      assert.equal(view.grade.finalGrade, '0.00'); assert.equal(view.activity.questions[0].manual, false);
      const body = input(view), results = await Promise.allSettled([1, 2].map(() => service.saveAttemptGrading(T, room, blank.attempt, body)));
      assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
      assert.equal(results.filter(row => row.status === 'rejected' && row.reason.code === 'CONFLICT').length, 1);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [blank.attempt])).rows[0].n, 1);
      await rejected(() => service.saveAttemptGrading(T, room, blank.attempt, body), 'CONFLICT');
    });
    await check('published drafts deny private edits; archives read only; teacher retains former-student correction', async () => {
      const activity = activities[0], view = await service.getAttemptGrading(T, room, activity.attempt);
      await pool.query('UPDATE attempt_grades SET is_published=true,published_at=now() WHERE attempt_id=$1', [activity.attempt]);
      await rejected(() => service.saveAttemptGrading(T, room, activity.attempt, input(view)), 'CONFLICT');
      const other = activities[1]; await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [room]);
      const archived = await service.getAttemptGrading(T, room, other.attempt); assert.equal(archived.canSave, false);
      await rejected(() => service.saveAttemptGrading(T, room, other.attempt, input(archived)), 'CONFLICT');
      await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [room]);
      await pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$1 WHERE enrollment_id IN (SELECT id FROM enrollments WHERE student_id=$1)", [f.student]);
      const former = await service.getAttemptGrading(T, room, other.attempt);
      const body = input(former); body.questions[0].points = '2';
      assert.equal((await service.saveAttemptGrading(T, room, other.attempt, body)).grade.finalGrade, '7.50');
      await rejected(() => service.getAttemptGrading(S, room, other.attempt), 'FORBIDDEN');
    });
  });
});
