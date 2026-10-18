import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import pg from 'pg';
import { PDFDocument } from 'pdf-lib';
import { withP5Database } from '../scripts/p5-database.mjs';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { FileService } from '../.build/api/apps/api/src/files/service.js';
import { createFileAccess } from '../.build/api/apps/api/src/files/access.js';
import { authorizeAttemptFileWrite } from '../.build/api/apps/api/src/files/attempt-bridge.js';

// Real SQL/public domain and file services; authentication, object storage and scanner are controlled ports.
// Actual P3/HTTP/browser/ClamAV reproduction lives in p7-consultation-integration.test.mjs.
test('B1: consultation-only TP opening locks content without granting submission eligibility', { timeout: 120000 }, async t => {
  const oldInt8 = pg.types.getTypeParser(20); pg.types.setTypeParser(20, BigInt);
  try { await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), foreign = randomUUID();
    const room = randomUUID(), unit = randomUUID(), topic = randomUUID();
    for (const id of [teacher, student, foreign]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,'Consultation','Fixture','fixture',now())`, [id, `${id}@example.test`]);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Consultation','Science','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unit',0)`, [unit, room]);
    await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Topic',0)`, [topic, room, unit]);
    const authenticate = async (_tx, request) => request.actor, objects = new Map();
    const files = new FileService({ database, access: createFileAccess({ authenticate, authorizeAttemptWrite: authorizeAttemptFileWrite }),
      storage: { put: async (key, bytes) => { objects.set(key, bytes); }, get: async key => objects.get(key), remove: async key => { objects.delete(key); } },
      scanner: { scan: async () => {} }, draftQuotaBytes: 100000000n });
    const service = new ClassroomService({ database, files: files.store, authenticate, signingKey: Buffer.alloc(32, 1),
      deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher }, S = { actor: student }, F = { actor: foreign };
    const change = async operation => service.changeActivities(T, room, { revision: (await service.detail(T, room)).revision, operation });
    const pdf = await PDFDocument.create(); pdf.addPage(); pdf.setSubject('Consultation instruction '.repeat(50));
    const bytes = Buffer.from(await pdf.save());
    const create = async (title, { type = 'ASSIGNMENT', expired = true, late = false, publish = true } = {}) => {
      const { id } = await change({ action: 'create', type });
      let file;
      if (type === 'ASSIGNMENT') {
        file = await files.begin(T, { kind: 'classroom', id: room }, { purpose: 'instructions', name: 'instructions.pdf', bytes: bytes.length }, id);
        await files.receive(T, file.id, bytes);
      }
      const payload = { title, unitId: unit, topicId: topic, instructions: 'Original instructions', attachmentRequired: false,
        instructionFileIds: file ? [file.id] : [], materialIds: [],
        questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Explain', points: '1', scoringRule: null, options: [] }],
        deadline: expired ? { local: '2020-01-01T18:00' } : null, allowLate: late };
      await change({ action: 'save', id, payload }); if (publish) await change({ action: 'publish', id });
      return { id, fileId: file?.id, payload };
    };
    const late = await create('Expired with late reception', { late: true });
    const closed = await create('Expired closed reception');
    const archived = await create('Archived unread');
    const privateActivity = await create('Private draft', { publish: false });
    const expiredQuiz = await create('Expired quiz', { type: 'QUESTIONNAIRE' });
    const expectedTP = await create('Expected TP', { expired: false });
    const expectedQuiz = await create('Expected quiz', { type: 'QUESTIONNAIRE', expired: false });
    const { code } = await service.rotateCode(T, room), preview = await service.previewCode(S, code);
    await service.confirmCode(S, preview.confirmation);
    const hash = async (tables = ['classrooms','activities','student_activities','attempts','answers','answer_selections',
      'attempt_attachments','attempt_grades','notifications','files','uploads','file_custodies','activity_instruction_files']) => {
      const data = [];
      for (const table of tables) data.push((await pool.query(`SELECT row_to_json(t)::text value FROM ${table} t ORDER BY row_to_json(t)::text`)).rows);
      return createHash('sha256').update(JSON.stringify(data)).digest('hex');
    };
    const rejectSame = async (operation, code) => {
      const before = await hash(); await assert.rejects(operation, { code }); assert.equal(await hash(), before, 'Rejection preserves exact domain hash');
    };
    const session = activity => service.activitySession(S, room, activity.id);
    const obligation = async activity => (await pool.query(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
      WHERE sa.activity_id=$1 AND e.student_id=$2`, [activity.id, student])).rows[0];
    let failed = false;
    const check = (name, run) => t.test(name, { skip: failed ? 'Earlier B1 prerequisite failed' : false }, async () => {
      try { await run(); } catch (error) { failed = true; throw error; }
    });
    await t.test('ordinary reads hide instructions/files without mutating actual expired enrollment', async () => {
      const before = await hash();
      for (const activity of [late, closed]) {
        assert.equal((await obligation(activity)).is_expected, false);
        const state = await session(activity);
        assert.equal(state.canStart, true, 'Actual explicit TP opening is offered regardless of submission eligibility');
        assert.equal(state.expected, false); assert.equal(state.attempt, null);
        assert.equal(state.activity.instructions, null); assert.deepEqual(state.activity.instructionFiles, []); assert.deepEqual(state.activity.materials, []);
        assert.equal((await service.activityDetail(S, room, activity.id)).activity.instructions, null);
      }
      assert.equal(await hash(), before);
    });
    await t.test('direct private instruction read cannot bypass the first explicit consultation-only TP opening', async () => {
      await rejectSame(() => files.read(S, late.fileId), 'FORBIDDEN');
      await rejectSame(() => files.status(S, late.fileId), 'FORBIDDEN');
      assert.deepEqual((await files.read(T, late.fileId)).bytes, bytes, 'Teacher preview remains read-only');
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts')).rows[0].n, 0);
    });
    let initial;
    await check('concurrent explicit opening creates exactly one read-only initial DRAFT and locks content', async () => {
      const unchanged = await hash(['student_activities','notifications','attempt_grades','answers','answer_selections','attempt_attachments','files','uploads','file_custodies']);
      const results = await Promise.all([service.startActivity(S, room, late.id, {}), service.startActivity(S, room, late.id, {})]);
      initial = results[0].attempt;
      assert.equal(results[1].attempt.id, initial.id); assert.equal(initial.number, 1); assert.equal(initial.status, 'DRAFT');
      for (const result of results) {
        assert.equal(result.editor, undefined); assert.equal(result.canTransfer, false); assert.equal(result.expected, false);
        assert.equal(result.activity.locked, true); assert.equal(result.activity.instructions, late.payload.instructions);
        assert.equal(result.activity.instructionFiles[0].id, late.fileId); assert.equal(result.attempt.submittedAt, null); assert.equal(result.attempt.epoch, '0');
      }
      const row = (await pool.query('SELECT * FROM attempts WHERE id=$1', [initial.id])).rows[0];
      assert.equal(row.editor_token_hash, null); assert.equal(row.individual_deadline_at, null);
      assert.ok((await pool.query('SELECT first_started_at FROM activities WHERE id=$1', [late.id])).rows[0].first_started_at);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts WHERE activity_id=$1', [late.id])).rows[0].n, 1);
      assert.equal(await hash(['student_activities','notifications','attempt_grades','answers','answer_selections','attempt_attachments','files','uploads','file_custodies']), unchanged);
      const beforeResume = await hash(); assert.equal((await service.startActivity(S, room, late.id, {})).attempt.id, initial.id);
      assert.equal(await hash(), beforeResume, 'Repeated opening is write-free');
      assert.deepEqual((await files.read(S, late.fileId)).bytes, bytes);
      await rejectSame(() => change({ action: 'save', id: late.id, payload: { ...late.payload, instructions: 'Changed after consultation' } }), 'CONFLICT');
      await rejectSame(() => service.transferAttemptEditor(S, room, initial.id, { revision: initial.revision }), 'CONFLICT');
      const forged = { ...S, headers: { 'x-attempt-editor': Buffer.alloc(32).toString('base64url'), 'x-attempt-epoch': '0' } };
      await rejectSame(() => service.submitPracticalAttempt(forged, room, initial.id, { revision: initial.revision, confirm: true }), 'CONFLICT');
      await rejectSame(() => files.begin(forged, { kind: 'classroom', id: room }, { purpose: 'attachment', name: 'work.pdf', bytes: bytes.length }, initial.id), 'FORBIDDEN');
    });
    await check('closed reception also permits only initial read-only consultation', async () => {
      const opened = await service.startActivity(S, room, closed.id, {});
      assert.equal(opened.reception.open, false); assert.equal(opened.expected, false); assert.equal(opened.editor, undefined);
      assert.equal(opened.canTransfer, false); assert.equal(opened.attempt.number, 1); assert.equal(opened.activity.locked, true);
      assert.deepEqual((await files.read(S, closed.fileId)).bytes, bytes);
    });
    await check('future first authorization preserves the same initial draft and requires explicit editor transfer', async () => {
      const prior = (await pool.query('SELECT * FROM attempts WHERE id=$1', [initial.id])).rows[0];
      const body = async deadline => ({ revision: (await service.detail(T, room)).revision, studentId: student, deadline });
      await rejectSame(async () => service.authorizeFirstSubmission(T, room, late.id, await body({ local: '2020-01-01T12:00' })), 'INVALID_INPUT');
      await service.authorizeFirstSubmission(T, room, late.id, await body({ local: '2031-01-01T12:00' }));
      const row = await obligation(late), state = await session(late);
      assert.equal(row.is_expected, true); assert.equal(row.eligibility_reason, 'TEACHER_AUTHORIZATION');
      assert.equal(state.attempt.id, initial.id); assert.equal(state.attempt.number, 1); assert.deepEqual(state.attempt.answers, initial.answers);
      assert.equal(state.attempt.submittedAt, null); assert.equal(state.editor, undefined); assert.equal(state.canTransfer, true);
      const current = (await pool.query('SELECT * FROM attempts WHERE id=$1', [initial.id])).rows[0];
      assert.equal(current.individual_deadline_at.toISOString(), '2031-01-01T12:00:00.000Z');
      for (const key of Object.keys(prior).filter(key => !['individual_deadline_at','updated_at'].includes(key))) assert.deepEqual(current[key], prior[key], key);
      const moved = await service.transferAttemptEditor(S, room, initial.id, { revision: state.attempt.revision });
      assert.ok(moved.editor); assert.equal(moved.attempt.id, initial.id); assert.equal(moved.attempt.number, 1);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts WHERE activity_id=$1', [late.id])).rows[0].n, 1);
      await change({ action: 'deadline', id: late.id, deadline: { local: '2032-01-01T12:00' }, allowLate: true });
      assert.equal((await session(late)).reception.deadlineAt.toISOString(), '2032-01-01T12:00:00.000Z');
      await rejectSame(async () => service.authorizeFirstSubmission(T, room, late.id, await body({ local: '2033-01-01T12:00' })), 'CONFLICT');
    });
    await check('ordinary expected TP and questionnaire start/editor policies remain unchanged', async () => {
      const started = await service.startActivity(S, room, expectedTP.id, {}); assert.ok(started.editor); assert.equal(started.expected, true);
      const before = await hash(); assert.equal((await session(expectedQuiz)).attempt, null); assert.equal(await hash(), before);
      const quiz = await service.startActivity(S, room, expectedQuiz.id, {}); assert.ok(quiz.editor); assert.equal(quiz.attempt.number, 1);
      assert.equal((await session(expiredQuiz)).canStart, false); await rejectSame(() => service.startActivity(S, room, expiredQuiz.id, {}), 'FORBIDDEN');
      await rejectSame(() => service.startActivity(T, room, closed.id, {}), 'FORBIDDEN');
      await rejectSame(() => service.startActivity(F, room, closed.id, {}), 'FORBIDDEN');
      await rejectSame(() => service.startActivity(S, room, privateActivity.id, {}), 'FORBIDDEN');
      await rejectSame(() => files.read(S, privateActivity.fileId), 'FORBIDDEN');
      await rejectSame(() => files.read(F, late.fileId), 'FORBIDDEN');
    });
    await check('submitted history and a real reopening cannot become an initial authorization', async () => {
      const body = async () => ({ revision: (await service.detail(T, room)).revision, studentId: student, deadline: { local: '2031-01-01T12:00' } });
      await service.authorizeFirstSubmission(T, room, closed.id, await body());
      const state = await session(closed), moved = await service.transferAttemptEditor(S, room, state.attempt.id, { revision: state.attempt.revision });
      const request = { ...S, headers: { 'x-attempt-editor': moved.editor.token, 'x-attempt-epoch': moved.editor.epoch } };
      await service.submitPracticalAttempt(request, room, moved.attempt.id, { revision: moved.attempt.revision, confirm: true });
      await rejectSame(async () => service.authorizeFirstSubmission(T, room, closed.id, await body()), 'CONFLICT');
      // Controlled inconsistent eligibility ensures the new prior-attempt guard itself rejects real submitted history.
      const row = await obligation(closed);
      await pool.query('UPDATE student_activities SET is_expected=false WHERE id=$1', [row.id]);
      await rejectSame(async () => service.authorizeFirstSubmission(T, room, closed.id, await body()), 'CONFLICT');
      await pool.query('UPDATE student_activities SET is_expected=true WHERE id=$1', [row.id]);
      await service.reopenActivity(T, room, closed.id, { ...await body(), confirm: true });
      assert.equal((await session(closed)).attempt.number, 2);
      await pool.query('UPDATE student_activities SET is_expected=false WHERE id=$1', [row.id]);
      await rejectSame(async () => service.authorizeFirstSubmission(T, room, closed.id, await body()), 'CONFLICT');
      await pool.query('UPDATE student_activities SET is_expected=true WHERE id=$1', [row.id]);
      assert.equal((await pool.query("SELECT count(*)::int n FROM attempts WHERE activity_id=$1 AND status='SUBMITTED'", [closed.id])).rows[0].n, 1);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades')).rows[0].n, 0);
    });
    await check('archive consultation remains write-free even when no attempt was ever started', async () => {
      await service.setArchive(T, room, { revision: (await service.detail(T, room)).revision, archived: true });
      const before = await hash(), state = await session(archived);
      assert.equal(state.canStart, false); assert.equal(state.attempt, null); assert.equal(state.activity.instructions, archived.payload.instructions);
      assert.equal((await service.activityDetail(S, room, archived.id)).activity.instructionFiles[0].id, archived.fileId);
      assert.deepEqual((await files.read(S, archived.fileId)).bytes, bytes); assert.equal(await hash(), before);
      await rejectSame(() => service.startActivity(S, room, archived.id, {}), 'CONFLICT');
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts WHERE activity_id=$1', [archived.id])).rows[0].n, 0);
      await service.setArchive(T, room, { revision: (await service.detail(T, room)).revision, archived: false });
      await service.leave(S, room);
      await rejectSame(() => service.activitySession(S, room, late.id), 'FORBIDDEN');
      await rejectSame(() => files.read(S, late.fileId), 'FORBIDDEN');
    });
  }); } finally { pg.types.setTypeParser(20, oldInt8); }
});
