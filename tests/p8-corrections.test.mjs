import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { randomUUID } from 'node:crypto';
import { withGradingFixture, tableHash, gradingTables, saveComplete, publish, resubmit, safeResult } from './p8-publication-helpers.mjs';

test('published correction and teacher audit are public operations on the final classroom service', () => {
  for (const method of ['correctPublishedGrade', 'getGradeCorrections', 'publishAttemptGrade', 'getAttemptResult']) {
    assert.equal(typeof ClassroomService.prototype[method], 'function', method);
  }
});

test('reasoned correction preserves publication/effectiveness/evidence and safely notifies only the owner', { timeout: 150000 }, async t => {
  await withGradingFixture(async f => {
    const { service, T, S, F, room, pool } = f, items = [];
    const reject = (work, code = 'CONFLICT') => f.rejected(async () => work(), code);
    const input = async (attempt, newGrade = '8.35', reason = 'Verified final-grade adjustment') => ({
      revision: (await service.getAttemptGrading(T, room, attempt)).revision, newGrade, reason, confirm: true });
    let failed = false;
    const check = (name, work) => t.test(name, { skip: failed ? 'Earlier correction prerequisite failed' : false }, async () => {
      try { await work(); } catch (e) { failed = true; throw e; }
    });
    await check('unpublished/draft, student, foreign teacher and invalid reason/grade/consent/authority are write-free', async () => {
      const privateItem = await f.create('ASSIGNMENT'); await saveComplete(f, privateItem.attempt);
      await reject(() => service.correctPublishedGrade(T, room, privateItem.attempt, { revision: '0', newGrade: '8', reason: 'Reason', confirm: true }));
      await reject(() => service.getGradeCorrections(T, room, privateItem.attempt));
      const draft = await f.create('ASSIGNMENT', { submitted: false });
      await reject(() => service.correctPublishedGrade(T, room, draft.attempt, { revision: '0', newGrade: '8', reason: 'Reason', confirm: true }), 'FORBIDDEN');
      for (const type of ['QUESTIONNAIRE', 'EVALUATION', 'ASSIGNMENT']) {
        const item = await f.create(type); await publish(f, item.attempt, await saveComplete(f, item.attempt)); items.push(item);
      }
      const body = await input(items[0].attempt);
      for (const delta of [{ reason: '' }, { reason: '   ' }, { reason: 'x'.repeat(5001) }, { reason: null },
        { newGrade: '8.345' }, { newGrade: '10.01' }, { newGrade: '-1' }, { newGrade: 'NaN' }, { newGrade: 8 },
        { confirm: false }, { confirm: undefined }, { previousGrade: '0' }, { actorId: f.student }, { correctedAt: new Date() }]) {
        await reject(() => service.correctPublishedGrade(T, room, items[0].attempt, { ...body, ...delta }), 'INVALID_INPUT');
      }
      for (const actor of [S, F, { actor: f.peer, headers: {} }, { headers: {} }]) {
        await reject(() => service.correctPublishedGrade(actor, room, items[0].attempt, body), 'FORBIDDEN');
        await reject(() => service.getGradeCorrections(actor, room, items[0].attempt), 'FORBIDDEN');
      }
      await reject(() => service.correctPublishedGrade(T, randomUUID(), items[0].attempt, body), 'FORBIDDEN');
      await reject(() => service.correctPublishedGrade(T, room, items[0].attempt, { ...body, revision: '0' }));
    });
    for (let index = 0; index < 3; index++) await check(`type ${index} exact final correction includes zero, old/new/server actor/time; all evidence immutable`, async () => {
      const item = items[index], old = await service.getAttemptResult(S, room, item.attempt);
      const from = (await pool.query('SELECT clock_timestamp() AS now')).rows[0].now;
      const immutable = ['activities', 'questions', 'question_options', 'attempts', 'answers', 'answer_selections', 'question_grades',
        'files', 'uploads', 'file_custodies', 'attempt_attachments', 'student_activities'];
      const hash = await tableHash(pool, immutable), oldAudit = await pool.query('SELECT to_jsonb(t) value FROM grade_corrections t ORDER BY id');
      const body = await input(item.attempt, index === 2 ? '0' : '8.35', '  Teacher-only rationale 😀  ');
      const corrected = await service.correctPublishedGrade(T, room, item.attempt, body), row = corrected.corrections[0];
      assert.equal(corrected.grade.id, old.grade.id); assert.equal(corrected.grade.finalGrade, index === 2 ? '0.00' : '8.35');
      assert.deepEqual(corrected.grade.publishedAt, old.grade.publishedAt); assert.equal(corrected.revision, (BigInt(body.revision) + 1n).toString());
      assert.equal(row.previousGrade, old.grade.finalGrade); assert.equal(row.newGrade, corrected.grade.finalGrade);
      assert.equal(row.reason, 'Teacher-only rationale 😀'); assert.equal(row.actor.id, f.teacher);
      const until = (await pool.query('SELECT clock_timestamp() AS now')).rows[0].now;
      const correctedAt = new Date(row.correctedAt).getTime();
      assert.ok(correctedAt > 0 && correctedAt >= from.getTime() && correctedAt <= until.getTime());
      assert.deepEqual(await service.getGradeCorrections(T, room, item.attempt), corrected);
      assert.equal(await tableHash(pool, immutable), hash);
      const retained = await pool.query('SELECT to_jsonb(t) value FROM grade_corrections t WHERE id<>$1 ORDER BY id', [row.id]);
      assert.deepEqual(retained.rows, oldAudit.rows);
      const own = await service.getAttemptResult(S, room, item.attempt); safeResult(own);
      assert.equal(own.grade.finalGrade, corrected.grade.finalGrade); assert.equal(own.grade.isEffective, true);
      assert.ok(!JSON.stringify(own).includes('Teacher-only rationale'));
      assert.equal((await service.getAttemptGrading(T, room, item.attempt)).grade.finalGrade, corrected.grade.finalGrade);
      const event = (await service.listNotifications(S)).find(n => n.eventType === 'GRADE_CORRECTED' && n.attemptId === item.attempt);
      assert.ok(event); assert.equal(event.gradeId, old.grade.id); assert.ok(!JSON.stringify(event).includes('rationale'));
      assert.deepEqual(await service.openNotification(S, event.id), { kind: 'grade', classroomId: room, activityId: item.id, attemptId: item.attempt, gradeId: old.grade.id });
      await reject(() => service.correctPublishedGrade(T, room, item.attempt, body));
      await reject(() => service.publishAttemptGrade(T, room, item.attempt, { revision: corrected.revision, confirm: true }));
      const publishedView = await service.getAttemptGrading(T, room, item.attempt);
      await reject(() => service.saveAttemptGrading(T, room, item.attempt, f.input(publishedView)));
    });
    await check('same CAS concurrent corrections admit exactly one audit/event; retry does not duplicate', async () => {
      const item = items[0], body = await input(item.attempt, '7.50'), before = await pool.query('SELECT count(*)::int n FROM grade_corrections');
      const events = (await pool.query("SELECT count(*)::int n FROM notifications WHERE event_type='GRADE_CORRECTED'")).rows[0].n;
      const results = await Promise.allSettled([1, 2].map(() => service.correctPublishedGrade(T, room, item.attempt, body)));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.filter(r => r.status === 'rejected' && r.reason.code === 'CONFLICT').length, 1);
      assert.equal((await pool.query('SELECT count(*)::int n FROM grade_corrections')).rows[0].n, before.rows[0].n + 1);
      assert.equal((await pool.query("SELECT count(*)::int n FROM notifications WHERE event_type='GRADE_CORRECTED'")).rows[0].n, events + 1);
      await reject(() => service.correctPublishedGrade(T, room, item.attempt, body));
    });
    await check('historical correction never advances effectiveness; effective correction changes its own persisted value', async () => {
      const item = items[2], next = await resubmit(f, item); await publish(f, next, await saveComplete(f, next, '2', '6'));
      const pointer = (await pool.query('SELECT effective_grade_id FROM student_activities WHERE id=(SELECT student_activity_id FROM attempts WHERE id=$1)', [next])).rows[0].effective_grade_id;
      await service.correctPublishedGrade(T, room, item.attempt, await input(item.attempt, '10'));
      assert.equal((await service.getAttemptResult(S, room, item.attempt)).grade.isEffective, false);
      assert.equal((await service.getAttemptResult(S, room, next)).grade.finalGrade, '6.00');
      await service.correctPublishedGrade(T, room, next, await input(next, '4.25'));
      assert.equal((await service.getAttemptResult(S, room, next)).grade.finalGrade, '4.25');
      assert.equal((await service.getAttemptResult(S, room, next)).grade.isEffective, true);
      assert.equal((await pool.query('SELECT effective_grade_id FROM student_activities WHERE id=(SELECT student_activity_id FROM attempts WHERE id=$1)', [next])).rows[0].effective_grade_id, pointer);
    });
    await check('event failure atomically rolls back grade, audit, revision and notifications', async () => {
      const item = items[0], body = await input(item.attempt), before = await tableHash(pool, gradingTables);
      const database = { $transaction: work => f.database.$transaction(raw => work({ $queryRawUnsafe: (sql, ...args) => {
        if (sql.includes('INSERT INTO notifications')) throw Error('Owned correction event failure');
        return raw.$queryRawUnsafe(sql, ...args);
      } })) };
      await assert.rejects(() => new ClassroomService({ ...f.ports, database }).correctPublishedGrade(T, room, item.attempt, body), { code: 'SERVICE_UNAVAILABLE' });
      assert.equal(await tableHash(pool, gradingTables), before);
    });
    await check('forged relationship, private-grade and revoked-recipient events cannot list/read/open', async () => {
      const original = items[2], attempt = await resubmit(f, original), privateGrade = await saveComplete(f, attempt);
      const originalGrade = (await service.getAttemptResult(S, room, original.attempt)).grade.id;
      for (const [recipient, targetAttempt, grade] of [[f.student, attempt, originalGrade], [f.peer, original.attempt, originalGrade], [f.student, attempt, privateGrade.grade.id]]) {
        const id = randomUUID(); await pool.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,activity_id,attempt_id,attempt_grade_id)
          VALUES($1,now(),$2,$3,'GRADE_CORRECTED',$4,$5,$6)`, [id, recipient, room, original.id, targetAttempt, grade]);
        const request = { actor: recipient, headers: {} };
        assert.ok(!(await service.listNotifications(request)).some(row => row.id === id));
        await reject(() => service.readNotification(request, id), 'FORBIDDEN'); await reject(() => service.openNotification(request, id), 'FORBIDDEN');
        assert.equal((await pool.query('SELECT read_at FROM notifications WHERE id=$1', [id])).rows[0].read_at, null);
      }
    });
    await check('archive audit remains teacher-only/read-only; departed student loses result/events while teacher retains correction history', async () => {
      const item = items[0], body = await input(item.attempt), event = (await service.listNotifications(S)).find(n => n.eventType === 'GRADE_CORRECTED');
      await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [room]);
      const history = await service.getGradeCorrections(T, room, item.attempt); assert.equal(history.canCorrect, false); assert.ok(history.corrections.length);
      await reject(() => service.correctPublishedGrade(T, room, item.attempt, body));
      await reject(() => service.getGradeCorrections(S, room, item.attempt), 'FORBIDDEN');
      assert.equal((await service.openNotification(S, event.id)).kind, 'grade');
      await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [room]);
      await pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$1 WHERE enrollment_id IN (SELECT id FROM enrollments WHERE student_id=$1)", [f.student]);
      await reject(() => service.getAttemptResult(S, room, item.attempt), 'FORBIDDEN');
      await reject(() => service.openNotification(S, event.id), 'FORBIDDEN');
      await reject(() => service.readNotification(S, event.id), 'FORBIDDEN');
      assert.ok(!(await service.listNotifications(S)).some(row => row.eventType === 'GRADE_CORRECTED'));
      const corrected = await service.correctPublishedGrade(T, room, item.attempt, await input(item.attempt, '9'));
      assert.equal(corrected.corrections.at(-1).newGrade, '9.00');
      assert.equal((await service.getGradeCorrections(T, room, item.attempt)).corrections.length, corrected.corrections.length);
    });
  });
});
