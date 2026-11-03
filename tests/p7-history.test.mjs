import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { randomUUID, createHash } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileService } from '../.build/api/apps/api/src/files/service.js';
import { createFileAccess } from '../.build/api/apps/api/src/files/access.js';
import { attachmentIntegration } from '../.build/api/apps/api/src/attachment-integration.js';
import { PDFDocument } from 'pdf-lib';
import pg from 'pg';

test('history and reopening are public operations on the final service, preserving questionnaire and practical writers', () => {
  for (const name of ['reopenActivity', 'activityHistory', 'activitySubmissions', 'activityAttempt',
    'saveAttemptAnswer', 'submitQuestionnaireAttempt', 'submitPracticalAttempt', 'openNotification'])
    assert.equal(typeof ClassroomService.prototype[name], 'function', name);
});

test('SQL-backed controlled history/reopening preserve every original and transaction event boundary', { timeout: 120000 }, async t => {
  const oldParser = pg.types.getTypeParser(20); pg.types.setTypeParser(20, BigInt);
  try { await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), peer = randomUUID(), foreign = randomUUID();
    const room = randomUUID(), unit = randomUUID(), topic = randomUUID();
    for (const id of [teacher, student, peer, foreign]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'History','Fixture','fixture',now(),$3)`, [id, `${id}@example.test`, id !== teacher ? 'student' : 'teacher']);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'History','Science','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unit',0)`, [unit, room]);
    await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Topic',0)`, [topic, room, unit]);
    const authenticate = async (_tx, req) => req.actor, objects = new Map();
    const files = new FileService({ database, access: createFileAccess({ authenticate, authorizeAttemptWrite: attachmentIntegration.authorizeAttemptWrite }),
      storage: { put: async (key, value) => objects.set(key, value), get: async key => objects.get(key), remove: async key => objects.delete(key) },
      scanner: { scan: async () => {} }, draftQuotaBytes: 100000000n, onReadyTransition: attachmentIntegration.onReadyTransition });
    const service = new ClassroomService({ database, files: files.store, authenticate, signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher, headers: {} }, S = { actor: student, headers: {} }, F = { actor: foreign, headers: {} };
    const { code } = await service.rotateCode(T, room);
    for (const actor of [student, peer]) { const req = { actor, headers: {} }; await service.confirmCode(req, (await service.previewCode(req, code)).confirmation); }
    const change = async operation => service.changeActivities(T, room, { revision: (await service.detail(T, room)).revision, operation });
    const create = async (type, deadline = null) => {
      const { id } = await change({ action: 'create', type });
      const payload = { title: type, unitId: unit, topicId: topic, instructions: 'Original instructions', attachmentRequired: type === 'ASSIGNMENT',
        instructionFileIds: [], materialIds: [], deadline, allowLate: false, questions: type === 'ASSIGNMENT' ? [] : [
          { type: 'DEVELOPMENT', prompt: 'Original question', points: '2', scoringRule: null, options: [] },
          { type: 'SINGLE_CHOICE', prompt: 'Choice', points: '3', scoringRule: 'EXACT', options: [{ text: 'One', correct: true }, { text: 'Two', correct: false }] }] };
      await change({ action: 'save', id, payload }); return { id, payload };
    };
    const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const tables = ['classrooms', 'activities', 'student_activities', 'attempts', 'answers', 'answer_selections', 'attempt_attachments', 'attempt_grades', 'notifications', 'files', 'uploads', 'file_custodies'];
    const snapshot = async () => hash(await Promise.all(tables.map(async table => (await pool.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows)));
    const reject = async (fn, code) => { const before = await snapshot(); await assert.rejects(async () => fn(), { code }); assert.equal(await snapshot(), before); };
    const reopen = async (id, deadline = null, overrides = {}, req = T) => service.reopenActivity(req, room, id,
      { revision: (await service.detail(T, room)).revision, studentId: student, deadline, confirm: true, ...overrides });
    const requests = editor => ({ ...S, headers: { 'x-attempt-editor': editor.token, 'x-attempt-epoch': editor.epoch } });
    const count = async event => (await pool.query('SELECT count(*)::int n FROM notifications WHERE event_type=$1', [event])).rows[0].n;
    const local = date => date.toISOString().slice(0, 16);
    let failed = false;
    const check = (name, fn) => t.test(name, { skip: failed ? 'Earlier controlled history prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; throw e; } });
    const quiz = await create('QUESTIONNAIRE');
    await check('publication/deadline/content-save changes notify current students once per real transition, not forever per activity', async () => {
      assert.equal(await count('ACTIVITY_PUBLISHED'), 0);
      await change({ action: 'publish', id: quiz.id }); assert.equal(await count('ACTIVITY_PUBLISHED'), 2);
      await reject(() => reopen(quiz.id), 'CONFLICT');
      const saved = { ...quiz.payload, deadline: { local: '2030-01-01T18:00' } };
      await change({ action: 'save', id: quiz.id, payload: saved }); assert.equal(await count('ACTIVITY_DEADLINE_CHANGED'), 2);
      await change({ action: 'save', id: quiz.id, payload: saved }); assert.equal(await count('ACTIVITY_DEADLINE_CHANGED'), 2);
      await change({ action: 'deadline', id: quiz.id, deadline: { local: '2030-01-01T19:00' }, allowLate: false }); assert.equal(await count('ACTIVITY_DEADLINE_CHANGED'), 4);
      await change({ action: 'withdraw', id: quiz.id }); assert.equal((await service.listNotifications(S)).length, 0);
      await change({ action: 'publish', id: quiz.id }); assert.equal(await count('ACTIVITY_PUBLISHED'), 4);
    });
    for (const type of ['QUESTIONNAIRE', 'EVALUATION', 'ASSIGNMENT']) await check(`${type} concurrent reopening creates one new independent prefilled draft, conserves receipts/grades/files and delivers only on submission`, async () => {
      const activity = type === 'QUESTIONNAIRE' ? quiz : await create(type);
      if (type !== 'QUESTIONNAIRE') await change({ action: 'publish', id: activity.id });
      let state = await service.startActivity(S, room, activity.id, {}), req = requests(state.editor);
      if (type === 'ASSIGNMENT') {
        const pdf = await PDFDocument.create(); pdf.addPage(); const bytes = Buffer.from(await pdf.save());
        const pending = await files.begin(req, { kind: 'classroom', id: room }, { purpose: 'attachment', name: 'original.pdf', bytes: bytes.length }, state.attempt.id);
        await files.receive(req, pending.id, bytes); state = await service.activitySession(S, room, activity.id);
        await service.submitPracticalAttempt(req, room, state.attempt.id, { revision: state.attempt.revision, confirm: true });
      } else {
        for (const question of state.activity.questions) {
          await service.saveAttemptAnswer(req, room, state.attempt.id, { revision: state.attempt.revision, questionId: question.id,
            text: question.type === 'DEVELOPMENT' ? '  Original\nanswer 😀  ' : '', optionIds: question.type === 'DEVELOPMENT' ? [] : [question.options[1].id] });
          state = await service.activitySession(S, room, activity.id);
        }
        await service.submitQuestionnaireAttempt(req, room, state.attempt.id, { revision: state.attempt.revision, confirm: true, confirmIncomplete: false });
      }
      state = await service.activitySession(S, room, activity.id); const original = state.attempt.id;
      const grade = randomUUID(), obligation = (await pool.query('SELECT student_activity_id FROM attempts WHERE id=$1', [original])).rows[0].student_activity_id;
      await pool.query(`INSERT INTO attempt_grades(id,updated_at,attempt_id,student_activity_id,activity_id,graded_by_id,final_grade,is_published,published_at)
        VALUES($1,now(),$2,$3,$4,$5,7,true,now())`, [grade, original, obligation, activity.id, teacher]);
      await pool.query('UPDATE student_activities SET effective_grade_id=$2 WHERE id=$1', [obligation, grade]);
      const originalHash = async () => hash(await Promise.all(['attempts', 'answers', 'answer_selections', 'attempt_attachments', 'attempt_grades', 'file_custodies'].map(async table => {
        const filter = table === 'attempts' ? 'id=$1' : table === 'answer_selections' ? 'answer_id IN (SELECT id FROM answers WHERE attempt_id=$1)' : table === 'file_custodies' ? 'file_id IN (SELECT file_id FROM attempt_attachments WHERE attempt_id=$1)' : 'attempt_id=$1';
        return (await pool.query(`SELECT to_jsonb(t) value FROM ${table} t WHERE ${filter} ORDER BY to_jsonb(t)::text`, [original])).rows;
      })));
      const before = await originalHash(), events = await count('ATTEMPT_REOPENED'), revision = (await service.detail(T, room)).revision;
      const results = await Promise.allSettled([1, 2].map(() => service.reopenActivity(T, room, activity.id, { revision, studentId: student, deadline: null, confirm: true })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(results.filter(r => r.status === 'rejected' && r.reason.code === 'CONFLICT').length, 1);
      assert.equal(await count('ATTEMPT_REOPENED'), events + 1); assert.equal(await originalHash(), before);
      const pending = await service.activitySession(S, room, activity.id); assert.equal(pending.attempt.number, 2); assert.equal(pending.editor, undefined);
      assert.deepEqual(pending.attempt.answers.map(a => [a.questionId, a.text, a.optionIds]), state.attempt.answers.map(a => [a.questionId, a.text, a.optionIds]));
      assert.deepEqual(pending.attempt.attachments?.map(f => f.id), state.attempt.attachments?.map(f => f.id));
      const history = await service.activityHistory(S, room, activity.id); assert.equal(history.delivered, true); assert.equal(history.pendingResubmission, true);
      assert.deepEqual(history.attempts.map(a => a.number), [2, 1]);
      await reject(() => reopen(activity.id), 'CONFLICT'); await reject(() => service.activityAttempt(T, room, pending.attempt.id), 'FORBIDDEN');
      const teacherView = await service.activitySubmissions(T, room, activity.id); assert.ok(!/"(?:answers|attachments|correct|scoringRule)"/.test(JSON.stringify(teacherView)));
      const moved = await service.transferAttemptEditor(S, room, pending.attempt.id, { revision: pending.attempt.revision }); req = requests(moved.editor);
      if (type !== 'ASSIGNMENT') await service.saveAttemptAnswer(req, room, moved.attempt.id, { revision: moved.attempt.revision,
        questionId: moved.activity.questions[0].id, text: 'Revised answer', optionIds: [] });
      const revised = await service.activitySession(S, room, activity.id), priorEvents = await count('SUBMISSION_RECEIVED');
      if (type === 'ASSIGNMENT') await service.submitPracticalAttempt(req, room, revised.attempt.id, { revision: revised.attempt.revision, confirm: true });
      else await service.submitQuestionnaireAttempt(req, room, revised.attempt.id, { revision: revised.attempt.revision, confirm: true, confirmIncomplete: false });
      assert.equal(await count('SUBMISSION_RECEIVED'), priorEvents + 1); assert.equal(await originalHash(), before);
      assert.equal((await pool.query('SELECT effective_grade_id FROM student_activities WHERE id=$1', [obligation])).rows[0].effective_grade_id, grade);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE student_activity_id=$1', [obligation])).rows[0].n, 1);
    });
    await check('closed reception requires future individual allowance; later general extension never shortens it', async () => {
      await pool.query("UPDATE activities SET deadline_at=now()-interval '1 day',allow_late_submissions=false WHERE id=$1", [quiz.id]);
      await reject(() => reopen(quiz.id), 'CONFLICT'); await reject(() => reopen(quiz.id, { local: '2020-01-01T18:00' }), 'INVALID_INPUT');
      const date = new Date(Date.now() + 86400000); await reopen(quiz.id, { local: local(date) });
      const individual = (await service.activitySession(S, room, quiz.id)).reception.deadlineAt;
      await change({ action: 'deadline', id: quiz.id, deadline: { local: local(new Date(+date + 86400000)) }, allowLate: false });
      assert.ok(+(await service.activitySession(S, room, quiz.id)).reception.deadlineAt > +individual);
    });
    await check('current target ownership/membership/archive apply to all history and notification list/read/open paths; WALL output is unchanged', async () => {
      const notices = await service.listNotifications(S), reopened = notices.find(n => n.eventType === 'ATTEMPT_REOPENED'); assert.ok(reopened);
      const target = await service.openNotification(S, reopened.id); assert.equal(target.kind, 'attempt'); assert.equal(target.classroomId, room);
      await reject(() => service.openNotification(F, reopened.id), 'FORBIDDEN'); await reject(() => service.activityHistory(F, room, quiz.id), 'FORBIDDEN');
      await service.changeWall(T, room, { revision: (await service.detail(T, room)).revision, operation: { action: 'publish', body: 'Old wall notice' } });
      const wall = (await service.listNotifications(S)).find(n => n.eventType === 'WALL_NOTICE');
      assert.deepEqual(Object.keys(wall).sort(), ['id', 'classroomId', 'classroomName', 'eventType', 'postId', 'replyId', 'createdAt', 'readAt'].sort());
      assert.deepEqual(await service.openNotification(S, wall.id), { classroomId: room, postId: wall.postId, replyId: null });
      await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [room]);
      assert.ok((await service.listNotifications(S)).some(n => n.id === reopened.id)); await service.openNotification(S, reopened.id);
      await reject(() => reopen(quiz.id), 'CONFLICT');
      await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [room]);
      await pool.query("UPDATE membership_periods SET ended_at=now(),ended_by_id=$1,end_reason='LEFT' WHERE enrollment_id=(SELECT id FROM enrollments WHERE student_id=$1 AND classroom_id=$2)", [student, room]);
      assert.equal((await service.listNotifications(S)).length, 0); await reject(() => service.readNotification(S, reopened.id), 'FORBIDDEN');
      await reject(() => service.activityHistory(S, room, quiz.id), 'FORBIDDEN'); await reject(() => reopen(quiz.id), 'FORBIDDEN');
      assert.ok((await service.activitySubmissions(T, room, quiz.id)).attempts.every(a => !a.currentMember));
    });
  }); } finally { pg.types.setTypeParser(20, oldParser); }
});
