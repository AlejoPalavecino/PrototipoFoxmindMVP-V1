import test from 'node:test';
import assert from 'node:assert/strict';
import { withGradingFixture, tableHash, gradingTables } from './p8-grading-helpers.mjs';
import { withProgressFixture, academicTables } from './p8-progress-helpers.mjs';
import { saveComplete, publish } from './p8-publication-helpers.mjs';
import { ClassroomService } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
import { randomUUID } from 'node:crypto';

test('progress public operations read existing academic state without creating obligations', async () => {
  await withGradingFixture(async f => {
    const before = await tableHash(f.pool, gradingTables);
    const own = await f.service.getProgress(f.S, f.room);
    assert.equal(own.scope, 'self');
    assert.equal(own.completion.expected, 0);
    assert.equal(own.completion.percentage, null);
    assert.equal(own.completion.emptyLabel, 'Sin actividades pendientes de seguimiento');
    assert.equal(own.performance.average, null);
    assert.equal(await tableHash(f.pool, gradingTables), before);
  });
});

test('persisted progress rules, exact averages, first receipt, eligibility and fresh permissions', { timeout: 180000 }, async t => {
  await withProgressFixture(async f => {
    const { service, T, S, F, room, pool } = f, P = { actor: f.peer, headers: {} };
    const own = () => service.getProgress(S, room), all = () => service.getProgress(T, room);
    const reject = async work => { const before = await tableHash(pool, academicTables);
      await assert.rejects(async () => work(), { code: 'FORBIDDEN' }); assert.equal(await tableHash(pool, academicTables), before); };
    let first, second, attempts = [], failed = false;
    const check = (name, work) => t.test(name, { skip: failed ? 'Earlier progress prerequisite failed' : false }, async () => {
      try { await work(); } catch (error) { failed = true; throw error; }
    });
    await check('two expected activities and three submissions of one remain 50%; reopening preserves delivery/history', async () => {
      first = await f.createAssignment('First expected'); second = await f.createAssignment('Second expected');
      attempts.push(await f.submit(first));
      for (let index = 0; index < 2; index++) { await f.reopen(first); attempts.push(await f.submit(first)); }
      await f.reopen(first);
      const data = await own();
      assert.equal(data.completion.expected, 2); assert.equal(data.completion.delivered, 1); assert.equal(data.completion.percentage, '50.00');
      assert.equal(data.completion.pendingResubmissions, 1); assert.equal(data.performance.average, null);
      assert.equal(data.activities.find(row => row.id === first.id).firstSubmission.id, attempts[0]);
      assert.equal((await service.activityHistory(S, room, first.id)).attempts.length, 4);
      assert.equal((await all()).completion.expected, 4); assert.equal((await all()).completion.delivered, 1);
      assert.ok(!/"(?:students|studentCount|gradedStudents|audit|reason|feedback|correct|scoringRule)"/.test(JSON.stringify(data)));
    });
    await check('pending private grading is excluded; 8 and 6 yield 7; published zero, lower replacement and historical correction remain exact', async () => {
      await publish(f, attempts[0], await saveComplete(f, attempts[0], '2', '8'));
      await saveComplete(f, attempts[1], '2', '1');
      assert.equal((await own()).performance.average, '8.00');
      const secondAttempt = await f.submit(second); await publish(f, secondAttempt, await saveComplete(f, secondAttempt, '2', '6'));
      assert.equal((await own()).performance.average, '7.00'); assert.equal((await own()).completion.percentage, '100.00');
      await publish(f, attempts[1]); assert.equal((await own()).performance.average, '3.50');
      await service.correctPublishedGrade(T, room, attempts[0], { revision: (await service.detail(T, room)).revision,
        newGrade: '10', reason: 'Historical correction stays historical', confirm: true });
      assert.equal((await own()).performance.average, '3.50');
      await publish(f, attempts[2], await saveComplete(f, attempts[2], '2', '0'));
      assert.equal((await own()).activities.find(row => row.id === first.id).grade, '0.00');
      assert.equal((await own()).performance.average, '3.00');
      await service.correctPublishedGrade(T, room, attempts[2], { revision: (await service.detail(T, room)).revision,
        newGrade: '8.34', reason: 'Persisted effective correction', confirm: true });
      await service.correctPublishedGrade(T, room, secondAttempt, { revision: (await service.detail(T, room)).revision,
        newGrade: '8.35', reason: 'Exact-half average evidence', confirm: true });
      assert.equal((await own()).performance.average, '8.35');
    });
    await check('class mean is mean of exact individual means, not pooled and not rounded student displays', async () => {
      const firstGrade = (await own()).activities.find(row => row.id === first.id).grade; assert.equal(firstGrade, '8.34');
      const peerAttempt = await f.submit(first, P);
      await publish(f, peerAttempt, await saveComplete(f, peerAttempt, '2', '4'));
      const correct = async (attempt, newGrade) => service.correctPublishedGrade(T, room, attempt, {
        revision: (await service.detail(T, room)).revision, newGrade, reason: 'Progress calculation fixture', confirm: true });
      const secondAttempt = (await own()).activities.find(row => row.id === second.id).firstSubmission.id;
      await correct(attempts[2], '10'); await correct(secondAttempt, '10');
      assert.equal((await all()).performance.average, '7.00'); assert.equal((await all()).performance.gradedStudents, 2);
      await correct(attempts[2], '0'); await correct(secondAttempt, '0.01'); await correct(peerAttempt, '0');
      assert.equal((await own()).performance.average, '0.01'); assert.equal((await all()).performance.average, '0.00');
    });
    await check('first late receipt survives on-time resubmission and later deadline extension; first on-time receipt survives late resubmission', async () => {
      const lateFirst = await f.createAssignment('Late first', { local: '2020-01-01T12:00' });
      const lateId = await f.submit(lateFirst);
      const before = (await own()).activities.find(row => row.id === lateFirst.id).firstSubmission;
      assert.equal(before.id, lateId); assert.equal(before.late, true); assert.equal(new Date(before.appliedDeadlineAt).getUTCFullYear(), 2020);
      await f.change({ action: 'deadline', id: lateFirst.id, deadline: { local: '2035-01-01T12:00' }, allowLate: true });
      await f.reopen(lateFirst); const onTimeId = await f.submit(lateFirst);
      assert.equal((await service.activityHistory(S, room, lateFirst.id)).attempts.find(row => row.id === onTimeId).submittedLate, false);
      assert.deepEqual((await own()).activities.find(row => row.id === lateFirst.id).firstSubmission, before);
      const onTimeFirst = await f.createAssignment('On-time first', { local: '2035-01-01T12:00' });
      const onTimeAttempt = await f.submit(onTimeFirst);
      // Owned historical clock fixture: later receipt preserves the real server's prior on-time snapshot.
      await pool.query("UPDATE activities SET deadline_at='2020-01-01T12:00:00Z' WHERE id=$1", [onTimeFirst.id]);
      await f.reopen(onTimeFirst); const later = await f.submit(onTimeFirst);
      assert.equal((await service.activityHistory(S, room, onTimeFirst.id)).attempts.find(row => row.id === later).submittedLate, true);
      const firstReceipt = (await own()).activities.find(row => row.id === onTimeFirst.id).firstSubmission;
      assert.equal(firstReceipt.id, onTimeAttempt); assert.equal(firstReceipt.late, false);
    });
    await check('TAUGHT changes only plan progress; reads remain academically write-free and a fresh service preserves results', async () => {
      const before = await own(), topic = (await service.detail(T, room)).units[0].topics[0].id;
      await service.changePlan(T, room, { revision: (await service.detail(T, room)).revision, operation: { action: 'setTopicState', id: topic, status: 'TAUGHT' } });
      const after = await own(); assert.deepEqual(after.completion, before.completion); assert.deepEqual(after.performance, before.performance);
      assert.deepEqual(after.plan, { total: 1, taught: 1, percentage: '100.00' });
      const hash = await tableHash(pool, academicTables);
      assert.deepEqual(await new ClassroomService(f.ports).getProgress(S, room), after);
      await all(); await service.getStudentProgress(T, room, f.student);
      assert.equal(await tableHash(pool, academicTables), hash);
    });
    await check('teacher current roster excludes departures; history is separate, reentry reuses all rows without multiplying pairs', async () => {
      const before = await own(), historicalHash = await tableHash(pool, ['attempts', 'attempt_grades', 'question_grades', 'grade_corrections']);
      await service.leave(S, room); await reject(() => own());
      const remaining = await all(); assert.equal(remaining.studentCount, 1); assert.equal(remaining.performance.average, '0.00');
      const historical = await service.getStudentProgress(T, room, f.student); assert.equal(historical.currentMember, false);
      assert.deepEqual(historical.completion, before.completion); assert.deepEqual(historical.performance, before.performance);
      const absenceOpen = await f.createAssignment('Absence open');
      const absenceExpired = await f.createAssignment('Absence expired', { local: '2020-01-01T12:00' });
      const invitation = await service.invite(T, room, `${f.student}@example.test`); await service.acceptInvitation(S, invitation.id);
      const rejoined = await own(); assert.equal(rejoined.completion.expected, before.completion.expected + 1);
      assert.equal(rejoined.activities.find(row => row.id === absenceOpen.id).expected, true);
      assert.equal(rejoined.activities.find(row => row.id === absenceExpired.id).expected, false);
      assert.equal((await all()).studentCount, 2); assert.equal(rejoined.completion.delivered, before.completion.delivered);
      assert.equal(await tableHash(pool, ['attempts', 'attempt_grades', 'question_grades', 'grade_corrections']), historicalHash);
      await service.authorizeFirstSubmission(T, room, absenceExpired.id, { revision: (await service.detail(T, room)).revision,
        studentId: f.student, deadline: { local: '2035-01-01T12:00' } });
      assert.equal((await own()).completion.expected, before.completion.expected + 2);
    });
    await check('withdrawn unstarted activities never create an invisible completion denominator', async () => {
      const extra = await f.createAssignment('Withdrawn unstarted'), before = (await own()).completion.expected;
      await f.change({ action: 'withdraw', id: extra.id });
      assert.equal((await own()).completion.expected, before - 1);
      assert.ok(!(await own()).activities.some(row => row.id === extra.id));
    });
    await check('unverified/foreign/cross-room/peer/removed callers deny; archived current reads remain permitted', async () => {
      await reject(() => service.getProgress(F, room)); await reject(() => service.getStudentProgress(S, room, f.peer));
      await reject(() => service.getStudentProgress(T, room, randomUUID())); await reject(() => service.getStudentProgress(T, randomUUID(), f.student));
      await pool.query('UPDATE users SET email_verified_at=NULL WHERE id=$1', [f.peer]);
      await reject(() => service.getProgress(P, room)); await pool.query('UPDATE users SET email_verified_at=now() WHERE id=$1', [f.peer]);
      await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [room]);
      assert.equal((await own()).archived, true); assert.equal((await all()).archived, true);
      assert.equal((await service.getStudentProgress(T, room, f.student)).archived, true);
      await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [room]);
      await service.remove(T, room, f.student); await reject(() => own());
      assert.equal((await service.getStudentProgress(T, room, f.student)).currentMember, false);
    });
  });
});
