import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { withP5Database } from '../scripts/p5-database.mjs';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import { waitForAttemptClock } from './helpers/attempt-clock.mjs';

export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export async function tableHash(pool, tables) {
  return digest(await Promise.all(tables.map(async table => (await pool.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows)));
}
export const gradingTables = ['classrooms', 'activities', 'questions', 'question_options', 'enrollments', 'membership_periods',
  'student_activities', 'attempts', 'answers', 'answer_selections', 'attempt_attachments', 'attempt_grades', 'question_grades',
  'grade_corrections', 'notifications', 'files', 'uploads', 'file_custodies', 'account_action_controls'];
export const protectedTables = gradingTables.filter(table => !['classrooms', 'attempt_grades', 'question_grades', 'account_action_controls'].includes(table));

export async function withGradingFixture(callback) {
  const parser = pg.types.getTypeParser(20); pg.types.setTypeParser(20, BigInt);
  try { return await withP5Database(async ({ pool, database, env }) => {
    const teacher = randomUUID(), student = randomUUID(), foreign = randomUUID(), peer = randomUUID();
    const room = randomUUID(), unit = randomUUID(), topic = randomUUID();
    for (const id of [teacher, student, foreign, peer]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,'Grading','Fixture','fixture',now())`, [id, `${id}@example.test`]);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Grading','Science','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unit',0)`, [unit, room]);
    await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Topic',0)`, [topic, room, unit]);
    const authenticate = async (_tx, req) => req.actor;
    const ports = { database, files: new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n), authenticate,
      signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' };
    const service = new ClassroomService(ports), T = { actor: teacher, headers: {} }, S = { actor: student, headers: {} }, F = { actor: foreign, headers: {} };
    const { code } = await service.rotateCode(T, room);
    for (const actor of [student, peer]) { const request = { actor, headers: {} }; await service.confirmCode(request, (await service.previewCode(request, code)).confirmation); }
    const change = async operation => service.changeActivities(T, room, { revision: (await service.detail(T, room)).revision, operation });
    const create = async (type = 'QUESTIONNAIRE', { blank = false, submitted = true } = {}) => {
      const { id } = await change({ action: 'create', type });
      await change({ action: 'save', id, payload: { title: type, unitId: unit, topicId: topic, instructions: 'Locked original instructions', attachmentRequired: false,
        instructionFileIds: [], materialIds: [], deadline: null, allowLate: false, questions: type === 'ASSIGNMENT' ? [] : [
          { type: 'DEVELOPMENT', prompt: 'Explain', points: '2', scoringRule: null, options: [] },
          { type: 'MULTIPLE_CHOICE', prompt: 'Select two of three correct options', points: '6', scoringRule: 'PARTIAL',
            options: ['A', 'B', 'C', 'Wrong'].map((text, index) => ({ text, correct: index < 3 })) },
        ] } });
      await change({ action: 'publish', id });
      let state = await service.startActivity(S, room, id, {});
      const request = { ...S, headers: { 'x-attempt-editor': state.editor.token, 'x-attempt-epoch': state.editor.epoch } };
      if (type !== 'ASSIGNMENT' && !blank) for (const question of state.activity.questions) {
        await service.saveAttemptAnswer(request, room, state.attempt.id, { revision: state.attempt.revision, questionId: question.id,
          text: question.type === 'DEVELOPMENT' ? 'Preserved answer 😀' : '', optionIds: question.options.slice(0, 2).map(option => option.id) });
        state = await service.activitySession(S, room, id);
      }
      if (submitted) {
        await waitForAttemptClock(state.attempt.openedAt);
        if (type === 'ASSIGNMENT') await service.submitPracticalAttempt(request, room, state.attempt.id, { revision: state.attempt.revision, confirm: true });
        else await service.submitQuestionnaireAttempt(request, room, state.attempt.id, { revision: state.attempt.revision, confirm: true, confirmIncomplete: blank });
      }
      return { id, attempt: state.attempt.id };
    };
    const input = view => ({ revision: view.revision, overallGrade: null, overallFeedback: null,
      questions: view.activity.questions.map(question => ({ questionId: question.id, points: null, feedback: null })) });
    const rejected = async (fn, code) => { const before = await tableHash(pool, gradingTables); await assert.rejects(fn, { code }); assert.equal(await tableHash(pool, gradingTables), before); };
    return callback({ pool, database, env, service, ports, T, S, F, room, teacher, student, foreign, peer, create, input, rejected });
  }); } finally { pg.types.setTypeParser(20, parser); }
}
