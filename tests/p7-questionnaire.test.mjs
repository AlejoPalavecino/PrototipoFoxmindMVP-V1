import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { randomUUID, createHash } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import pg from 'pg';

test('questionnaire service exposes atomic answer save and explicit submission without losing existing services', () => {
  for (const name of ['saveAttemptAnswer', 'submitQuestionnaireAttempt', 'submitPracticalAttempt', 'startActivity', 'changeActivities', 'invite'])
    assert.equal(typeof ClassroomService.prototype[name], 'function', name);
});

// SQL-backed controlled authentication ports, not actual P3/browser proof.
test('questionnaire and evaluation service persist only valid confirmed drafts and explicit authorized receipts', { timeout: 120000 }, async t => {
  const parser = pg.types.getTypeParser(20); pg.types.setTypeParser(20, BigInt);
  try { await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), foreign = randomUUID(), room = randomUUID(), unit = randomUUID(), topic = randomUUID();
    for (const id of [teacher, student, foreign]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Questionnaire','Fixture','fixture',now(),$3)`, [id, `${id}@example.test`, id !== teacher ? 'student' : 'teacher']);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Questionnaire','Science','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    await pool.query('INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,\'Unit\',0)', [unit, room]);
    await pool.query('INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,\'Topic\',0)', [topic, room, unit]);
    const authenticate = async (_tx, req) => req.actor;
    const files = new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n);
    const service = new ClassroomService({ database, files, authenticate, signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher, headers: {} }, S = { actor: student, headers: {} };
    const change = async operation => service.changeActivities(T, room, { revision: (await service.detail(T, room)).revision, operation });
    const create = async (type = 'QUESTIONNAIRE') => {
      const { id } = await change({ action: 'create', type });
      await change({ action: 'save', id, payload: { title: type, unitId: unit, topicId: topic, instructions: 'Instructions', attachmentRequired: false,
        instructionFileIds: [], materialIds: [], deadline: null, allowLate: false, questions: type === 'ASSIGNMENT' ? [] : [
          { type: 'DEVELOPMENT', prompt: 'Explain', points: '2', scoringRule: null, options: [] },
          { type: 'SINGLE_CHOICE', prompt: 'Select one', points: '3', scoringRule: 'EXACT', options: [{ text: 'First', correct: true }, { text: 'Second', correct: false }] },
          { type: 'MULTIPLE_CHOICE', prompt: 'Select several', points: '5', scoringRule: 'PARTIAL', options: [{ text: 'First', correct: true }, { text: 'Second', correct: true }, { text: 'Third', correct: false }] },
        ] } });
      await change({ action: 'publish', id }); return id;
    };
    const quiz = await create(), evaluation = await create('EVALUATION'), practical = await create('ASSIGNMENT');
    const { code } = await service.rotateCode(T, room), preview = await service.previewCode(S, code); await service.confirmCode(S, preview.confirmation);
    let state = await service.startActivity(S, room, quiz, {}), editor = state.editor;
    const request = (e = editor, actor = student) => ({ actor, headers: { 'x-attempt-editor': e.token, 'x-attempt-epoch': e.epoch } });
    const session = () => service.activitySession(S, room, quiz);
    const questions = state.activity.questions, [development, single, multiple] = questions;
    const save = async (q, text = '', optionIds = [], overrides = {}) => {
      const result = await service.saveAttemptAnswer(request(), room, state.attempt.id, { revision: state.attempt.revision, questionId: q.id, text, optionIds, ...overrides });
      state = await session(); return result;
    };
    const snapshot = async () => {
      const rows = [];
      for (const [table, key] of [['attempts','id'], ['answers','id'], ['answer_selections','answer_id,option_id'], ['attempt_grades','id'], ['question_grades','id'], ['grade_corrections','id'], ['student_activities','id']])
        rows.push((await pool.query(`SELECT row_to_json(t)::text value FROM ${table} t ORDER BY ${key}`)).rows);
      return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    };
    const reject = async (action, code) => { const before = await snapshot(); await assert.rejects(async () => action(), { code }); assert.equal(await snapshot(), before); };
    const submit = (overrides = {}, req = request()) => service.submitQuestionnaireAttempt(req, room, state.attempt.id, { revision: state.attempt.revision, confirm: true, confirmIncomplete: false, ...overrides });
    let failed = false;
    const check = (name, action) => t.test(name, { skip: failed ? 'Prior controlled questionnaire prerequisite failed' : false }, async () => { try { await action(); } catch (e) { failed = true; throw e; } });
    await check('multiline text, Unicode character limit, choice selection/clear and confirmed-only reload preserve exact content', async () => {
      assert.equal(state.unansweredCount, 3);
      const text = '  First line\nSecond\tline 😀  ', response = await save(development, text);
      assert.equal(response.answer.text, text); assert.equal(response.revision, '1'); assert.ok(response.answer.savedAt instanceof Date);
      assert.equal(state.attempt.answers[0].text, text); assert.equal(state.unansweredCount, 2); assert.equal(state.attempt.status, 'DRAFT');
      await save(single, '', [single.options[1].id]); await save(multiple, '', [multiple.options[0].id, multiple.options[2].id]);
      assert.equal(state.unansweredCount, 0); await save(single); assert.equal(state.unansweredCount, 1);
      await save(development, '😀'.repeat(20000)); assert.equal([...state.attempt.answers.find(a => a.questionId === development.id).text].length, 20000);
      await save(development, '\u00a0\n\t'); assert.equal(state.unansweredCount, 2); await save(development, text);
      assert.ok(!/"(?:correct|scoringRule|is_correct|editor_token_hash|final_grade)"/.test(JSON.stringify(state)));
    });
    await check('unknown, foreign, duplicate and cross-type payloads reject atomically without changing answers/revisions/grades', async () => {
      for (const [q, text, options, extra] of [
        [development, 'a'.repeat(20001), []], [development, '\u0000', []], [development, '', [single.options[0].id]],
        [single, 'not development', []], [single, '', single.options.map(o => o.id)], [multiple, '', [multiple.options[0].id, multiple.options[0].id]],
        [multiple, '', [single.options[0].id]], [{ id: randomUUID() }, '', []], [development, '', [], { savedAt: '2000-01-01' }],
      ]) await reject(() => save(q, text, options, extra), 'INVALID_INPUT');
      await reject(() => save(development, '', [], { revision: '0' }), 'CONFLICT');
      const other = await service.startActivity(S, room, evaluation, {});
      await reject(() => save(other.activity.questions[0], 'foreign activity'), 'INVALID_INPUT');
    });
    await check('single editor, membership and archive guards apply on every save and explicit submission', async () => {
      const payload = { revision: state.attempt.revision, questionId: development.id, text: 'forged', optionIds: [] };
      await reject(() => service.saveAttemptAnswer(request(editor, foreign), room, state.attempt.id, payload), 'FORBIDDEN');
      await reject(() => service.saveAttemptAnswer(request({ token: 'x'.repeat(43), epoch: editor.epoch }), room, state.attempt.id, payload), 'FORBIDDEN');
      const oldEditor = editor, moved = await service.transferAttemptEditor(S, room, state.attempt.id, { revision: state.attempt.revision });
      editor = moved.editor; state = moved;
      await reject(() => service.saveAttemptAnswer(request(oldEditor), room, state.attempt.id, { ...payload, revision: state.attempt.revision }), 'FORBIDDEN');
      await reject(() => submit({}, request(oldEditor)), 'FORBIDDEN');
      await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [room]);
      await reject(() => save(development, 'archived'), 'CONFLICT'); await reject(() => submit({ confirmIncomplete: true }), 'CONFLICT');
      await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [room]);
      await pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$1 WHERE enrollment_id=(SELECT id FROM enrollments WHERE student_id=$1 AND classroom_id=$2)", [student, room]);
      await reject(() => save(development, 'departed'), 'FORBIDDEN'); await reject(() => submit({ confirmIncomplete: true }), 'FORBIDDEN');
      await pool.query('UPDATE membership_periods SET ended_at=NULL,end_reason=NULL,ended_by_id=NULL WHERE enrollment_id=(SELECT id FROM enrollments WHERE student_id=$1 AND classroom_id=$2)', [student, room]);
    });
    await check('parallel CAS saves accept exactly one; failed acknowledgement or wrong revision cannot silently submit old answers', async () => {
      const payload = { revision: state.attempt.revision, questionId: development.id, text: 'serialized', optionIds: [] };
      const results = await Promise.allSettled([service.saveAttemptAnswer(request(), room, state.attempt.id, payload), service.saveAttemptAnswer(request(), room, state.attempt.id, { ...payload, text: 'other' })]);
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(results.filter(r => r.status === 'rejected' && r.reason.code === 'CONFLICT').length, 1);
      state = await session(); await reject(() => submit({ revision: payload.revision, confirmIncomplete: true }), 'CONFLICT');
    });
    await check('incomplete submission requires independent server count and explicit confirmation; submit freezes answers and creates no grade', async () => {
      assert.equal(state.unansweredCount, 1); await reject(() => submit(), 'CONFLICT');
      await reject(() => submit({ confirm: false, confirmIncomplete: true }), 'INVALID_INPUT');
      await reject(() => submit({ confirmIncomplete: true, submittedAt: '2000-01-01' }), 'INVALID_INPUT');
      const response = await submit({ confirmIncomplete: true }); assert.equal(response.unansweredCount, 1); assert.equal(response.status, 'SUBMITTED');
      assert.equal(response.appliedDeadlineAt, null); assert.equal(response.submittedLate, false); state = await session();
      await reject(() => save(development, 'locked'), 'CONFLICT'); await reject(() => submit({ confirmIncomplete: true }), 'CONFLICT');
      const stored = (await pool.query('SELECT editor_token_hash FROM attempts WHERE id=$1', [state.attempt.id])).rows[0]; assert.equal(stored.editor_token_hash, null);
      for (const table of ['attempt_grades', 'question_grades', 'grade_corrections']) assert.equal((await pool.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0);
    });
    await check('evaluation uses the same save/clear/complete-submit contract and practical endpoint still rejects answer writes', async () => {
      const current = await service.activitySession(S, room, evaluation), moved = await service.transferAttemptEditor(S, room, current.attempt.id, { revision: current.attempt.revision });
      let rev = moved.attempt.revision; const req = request(moved.editor);
      for (const q of moved.activity.questions) {
        const saved = await service.saveAttemptAnswer(req, room, moved.attempt.id, { revision: rev, questionId: q.id, text: q.type === 'DEVELOPMENT' ? 'Evaluation answer' : '', optionIds: q.type === 'DEVELOPMENT' ? [] : [q.options[0].id] }); rev = saved.revision;
      }
      assert.equal((await service.submitQuestionnaireAttempt(req, room, moved.attempt.id, { revision: rev, confirm: true, confirmIncomplete: false })).unansweredCount, 0);
      const tp = await service.startActivity(S, room, practical, {});
      await reject(() => service.saveAttemptAnswer(request(tp.editor), room, tp.attempt.id, { revision: '0', questionId: development.id, text: '', optionIds: [] }), 'FORBIDDEN');
      await reject(() => service.submitQuestionnaireAttempt(request(tp.editor), room, tp.attempt.id, { revision: '0', confirm: true, confirmIncomplete: true }), 'FORBIDDEN');
    });
  }); } finally { pg.types.setTypeParser(20, parser); }
});
