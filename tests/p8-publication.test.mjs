import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomService } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
import { randomUUID } from 'node:crypto';
import { withGradingFixture, tableHash, gradingTables, saveComplete, publish, resubmit, safeResult, exactActivity } from './p8-publication-helpers.mjs';

test('publication and safe own results are public operations on the final classroom service', () => {
  for (const method of ['publishAttemptGrade', 'getAttemptResult', 'saveAttemptGrading', 'activityAttempt']) {
    assert.equal(typeof ClassroomService.prototype[method], 'function', method);
  }
});

test('atomic publication, safe result, effective replacement and current grade notifications', { timeout: 150000 }, async t => {
  await withGradingFixture(async f => {
    const { service, T, S, F, room, pool } = f;
    const reject = (work, code = 'CONFLICT') => f.rejected(async () => work(), code);
    let failed = false;
    const check = (name, work) => t.test(name, { skip: failed ? 'Earlier publication prerequisite failed' : false }, async () => {
      try { await work(); } catch (e) { failed = true; throw e; }
    });
    const items = [];
    for (const type of ['QUESTIONNAIRE', 'EVALUATION', 'ASSIGNMENT']) items.push(await f.create(type));
    await check('unsaved, pending, false confirmation, injected authority and foreign commands are write-free', async () => {
      const item = items[0], view = await service.getAttemptGrading(T, room, item.attempt);
      await reject(() => publish(f, item.attempt, view));
      const pending = await service.saveAttemptGrading(T, room, item.attempt, f.input(view));
      assert.deepEqual(await service.getAttemptResult(S, room, item.attempt), { status: 'pending', attemptId: item.attempt });
      await pool.query('UPDATE attempt_grades SET final_grade=10 WHERE attempt_id=$1', [item.attempt]);
      await reject(() => publish(f, item.attempt, pending));
      for (const body of [{ revision: pending.revision, confirm: false }, { revision: pending.revision, confirm: true, finalGrade: '10' }, { revision: pending.revision }])
        await reject(() => service.publishAttemptGrade(T, room, item.attempt, body), 'INVALID_INPUT');
      await reject(() => service.publishAttemptGrade(S, room, item.attempt, { revision: pending.revision, confirm: true }), 'FORBIDDEN');
      await reject(() => service.getAttemptResult(F, room, item.attempt), 'FORBIDDEN');
      await reject(() => service.getAttemptResult(T, randomUUID(), item.attempt), 'FORBIDDEN');
      const draft = await f.create('ASSIGNMENT', { submitted: false });
      await reject(() => service.getAttemptResult(T, room, draft.attempt), 'FORBIDDEN');
      await reject(() => publish(f, draft.attempt), 'FORBIDDEN');
    });
    await check('raw missing automatic coverage and sub-cent manual rationals cannot be masked by teacher preview', async () => {
      const item = items[0]; let view = await saveComplete(f, item.attempt);
      const manual = view.activity.questions[0].id, automatic = view.activity.questions[1].id;
      await pool.query('DELETE FROM question_grades WHERE attempt_grade_id=$1 AND question_id=$2', [view.grade.id, automatic]);
      await reject(() => publish(f, item.attempt, view));
      view = await saveComplete(f, item.attempt);
      await pool.query('UPDATE question_grades SET earned_numerator=1,earned_denominator=3 WHERE attempt_grade_id=$1 AND question_id=$2', [view.grade.id, manual]);
      await reject(() => publish(f, item.attempt, view));
      await pool.query('UPDATE question_grades SET earned_numerator=3,earned_denominator=1 WHERE attempt_grade_id=$1 AND question_id=$2', [view.grade.id, manual]);
      await reject(() => publish(f, item.attempt, view));
      await pool.query('UPDATE question_grades SET earned_numerator=2,earned_denominator=1 WHERE attempt_grade_id=$1 AND question_id=$2', [view.grade.id, manual]);
      await saveComplete(f, item.attempt);
    });
    for (const [index, item] of items.entries()) await check(`type ${index} only explicit publication releases own persisted grade and selected answers`, async () => {
      let view = await saveComplete(f, item.attempt, '0', '0');
      if (index === 2) {
        const body = f.input(view); body.overallGrade = '0'; body.overallFeedback = null;
        view = await service.saveAttemptGrading(T, room, item.attempt, body);
      }
      const immutable = ['activities', 'questions', 'question_options', 'attempts', 'answers', 'answer_selections', 'files', 'uploads', 'file_custodies', 'attempt_attachments', 'grade_corrections'];
      const before = await tableHash(pool, immutable), count = (await pool.query("SELECT count(*)::int n FROM notifications WHERE event_type='GRADE_PUBLISHED'")).rows[0].n;
      const published = await publish(f, item.attempt, view);
      assert.equal(published.grade.isPublished, true); assert.equal(published.canSave, false);
      assert.equal(published.grade.finalGrade, index === 2 ? '0.00' : '5.00');
      const result = await service.getAttemptResult(S, room, item.attempt); safeResult(result);
      assert.equal(result.status, 'published'); assert.equal(result.grade.finalGrade, published.grade.finalGrade); assert.equal(result.grade.isEffective, true);
      await reject(() => service.getAttemptResult({ actor: f.peer, headers: {} }, room, item.attempt), 'FORBIDDEN');
      assert.ok(result.grade.publishedAt); assert.deepEqual(result, await service.getAttemptResult(T, room, item.attempt));
      if (index !== 2) { assert.deepEqual(result.questions[1].answer.selectedOptions.map(o => o.text).sort(), ['A', 'B']); assert.equal(result.questions[1].answer.selectedOptions.length, 2); }
      assert.equal(await tableHash(pool, immutable), before);
      assert.equal((await pool.query("SELECT count(*)::int n FROM notifications WHERE event_type='GRADE_PUBLISHED'")).rows[0].n, count + 1);
      await reject(() => publish(f, item.attempt, published));
      await reject(() => service.saveAttemptGrading(T, room, item.attempt, f.input(published)));
      const event = (await service.listNotifications(S)).find(n => n.eventType === 'GRADE_PUBLISHED' && n.attemptId === item.attempt);
      assert.equal(event.gradeId, result.grade.id);
      assert.deepEqual(await service.openNotification(S, event.id), { kind: 'grade', classroomId: room, activityId: item.id, attemptId: item.attempt, gradeId: result.grade.id });
    });
    await check('publication recalculates exact 8.345 -> 8.35 and 6.666... -> 6.67, never trusts a stored aggregate or automatic row', async () => {
      for (const [partial, expected] of [[false, '8.35'], [true, '6.67']]) {
        const attempt = await exactActivity(f, partial), saved = await saveComplete(f, attempt, '16.69');
        await pool.query('UPDATE attempt_grades SET final_grade=1 WHERE id=$1', [saved.grade.id]);
        if (partial) await pool.query('UPDATE question_grades SET earned_numerator=0,earned_denominator=1 WHERE attempt_grade_id=$1', [saved.grade.id]);
        const view = await publish(f, attempt, saved); assert.equal(view.grade.finalGrade, expected);
        assert.equal((await service.getAttemptResult(S, room, attempt)).grade.finalGrade, expected);
        await pool.query('UPDATE attempt_grades SET final_grade=9 WHERE id=$1', [saved.grade.id]);
        assert.equal((await service.getAttemptGrading(T, room, attempt)).grade.finalGrade, '9.00', 'published teacher consultation uses stored grade for later audited corrections');
      }
    });
    await check('concurrent publication admits one transition, one event and rejects stale CAS', async () => {
      const item = await f.create('ASSIGNMENT'), view = await saveComplete(f, item.attempt), body = { revision: view.revision, confirm: true };
      await reject(() => service.publishAttemptGrade(T, room, item.attempt, { ...body, revision: '0' }));
      const attempts = await Promise.allSettled([1, 2].map(() => service.publishAttemptGrade(T, room, item.attempt, body)));
      assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(attempts.filter(r => r.status === 'rejected' && r.reason.code === 'CONFLICT').length, 1);
      assert.equal((await pool.query("SELECT count(*)::int n FROM notifications WHERE event_type='GRADE_PUBLISHED' AND attempt_id=$1", [item.attempt])).rows[0].n, 1);
    });
    await check('6 -> private 8 preserves 6 -> published 8 -> published 6 lowers effective grade, never MAX', async () => {
      const item = await f.create('ASSIGNMENT'); await publish(f, item.attempt, await saveComplete(f, item.attempt));
      const next = await resubmit(f, item); const private8 = await saveComplete(f, next, '2', '8');
      assert.equal((await service.getAttemptResult(S, room, item.attempt)).grade.isEffective, true);
      assert.deepEqual(await service.getAttemptResult(S, room, next), { status: 'pending', attemptId: next });
      await publish(f, next, private8); assert.equal((await service.getAttemptResult(S, room, item.attempt)).grade.isEffective, false);
      const third = await resubmit(f, item); await publish(f, third, await saveComplete(f, third, '2', '6'));
      assert.equal((await service.getAttemptResult(S, room, third)).grade.finalGrade, '6.00');
      assert.equal((await service.getAttemptResult(S, room, next)).grade.isEffective, false);
    });
    await check('event failure rolls back grade, pointer, revision and rational updates', async () => {
      const item = await f.create('ASSIGNMENT'), view = await saveComplete(f, item.attempt);
      const before = await tableHash(pool, gradingTables);
      const database = { $transaction: work => f.database.$transaction(raw => work({ $queryRawUnsafe: (sql, ...args) => {
        if (sql.includes('INSERT INTO notifications')) throw Error('Owned fixture event failure');
        return raw.$queryRawUnsafe(sql, ...args);
      } })) };
      const broken = new ClassroomService({ ...f.ports, database });
      await assert.rejects(() => broken.publishAttemptGrade(T, room, item.attempt, { revision: view.revision, confirm: true }), { code: 'SERVICE_UNAVAILABLE' });
      assert.equal(await tableHash(pool, gradingTables), before);
    });
    await check('forged same-activity grade/attempt/recipient and private targets never list or mark read', async () => {
      const original = items[2], secondAttempt = await resubmit(f, original), saved = await saveComplete(f, secondAttempt);
      const published = (await pool.query('SELECT id FROM attempt_grades WHERE attempt_id=$1', [original.attempt])).rows[0].id;
      for (const [recipient, attempt, grade] of [[f.student, secondAttempt, published], [f.peer, original.attempt, published], [f.student, secondAttempt, saved.grade.id]]) {
        const id = randomUUID();
        await pool.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id,attempt_grade_id)
          VALUES($1,now(),$2,$3,'GRADE_PUBLISHED',$4,$5,$6)`, [id, recipient, room, original.id, attempt, grade]);
        const request = { actor: recipient, headers: {} };
        assert.ok(!(await service.listNotifications(request)).some(n => n.id === id));
        await reject(() => service.readNotification(request, id), 'FORBIDDEN'); await reject(() => service.openNotification(request, id), 'FORBIDDEN');
        assert.equal((await pool.query('SELECT read_at FROM notifications WHERE id=$1', [id])).rows[0].read_at, null);
      }
    });
    await check('archive permits result consultation only; former student loses result/event access while teacher retains history', async () => {
      const item = items[0], event = (await service.listNotifications(S)).find(n => n.attemptId === item.attempt && n.eventType === 'GRADE_PUBLISHED');
      await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [room]);
      assert.equal((await service.getAttemptResult(S, room, item.attempt)).status, 'published');
      const pending = await service.getAttemptGrading(T, room, (await pool.query('SELECT attempt_id FROM attempt_grades WHERE NOT is_published LIMIT 1')).rows[0].attempt_id);
      await reject(() => service.publishAttemptGrade(T, room, pending.attempt.id, { revision: pending.revision, confirm: true }));
      assert.equal((await service.openNotification(S, event.id)).kind, 'grade');
      await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [room]);
      await pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$1 WHERE enrollment_id IN (SELECT id FROM enrollments WHERE student_id=$1)", [f.student]);
      await reject(() => service.getAttemptResult(S, room, item.attempt), 'FORBIDDEN');
      await reject(() => service.openNotification(S, event.id), 'FORBIDDEN'); assert.ok(!(await service.listNotifications(S)).some(n => n.eventType === 'GRADE_PUBLISHED'));
      assert.equal((await service.getAttemptResult(T, room, item.attempt)).status, 'published');
      const historical = await pool.query('SELECT attempt_id FROM attempt_grades WHERE NOT is_published LIMIT 1');
      const ready = await saveComplete(f, historical.rows[0].attempt_id);
      await publish(f, historical.rows[0].attempt_id, ready);
      assert.ok(!(await service.listNotifications(S)).some(n => n.eventType === 'GRADE_PUBLISHED'));
    });
  });
});
