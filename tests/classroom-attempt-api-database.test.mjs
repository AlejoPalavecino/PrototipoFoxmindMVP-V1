import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { withGradingFixture } from './p8-grading-helpers.mjs';
import { saveComplete, publish } from './p8-publication-helpers.mjs';
import { classroomAttemptCases } from './helpers/classroom-attempt-cases.mjs';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
import { resolveDeadline } from '../.build/api/apps/api/src/modules/activities/domain/activity-time.js';

// F2 (TASK-009): the API, not the web proxy, rejects malformed grading and participation bodies and
// malformed attempt headers. Every case the proxy used to reject must get 400 INVALID_INPUT from the
// real services and write nothing.
async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

async function snapshot(pool) {
  const tables = (await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename NOT IN ('_prisma_migrations', 'account_action_controls') ORDER BY tablename`)).rows.map(row => row.tablename);
  const rows = [];
  for (const table of tables) rows.push([table, (await pool.query(`SELECT to_jsonb(t)::text AS value FROM "${table}" t ORDER BY 1`)).rows.map(row => row.value)]);
  return JSON.stringify(rows);
}

// An activity started by the student and left open, so its editor capability is current.
async function openAttempt(f, type) {
  const [{ id: unit }] = (await f.pool.query('SELECT id FROM units WHERE classroom_id = $1', [f.room])).rows;
  const [{ id: topic }] = (await f.pool.query('SELECT id FROM topics WHERE classroom_id = $1', [f.room])).rows;
  const change = async operation => f.service.changeActivities(f.T, f.room, { revision: (await f.service.detail(f.T, f.room)).revision, operation });
  const { id } = await change({ action: 'create', type });
  await change({ action: 'save', id, payload: { title: type, unitId: unit, topicId: topic, instructions: 'Consigna', attachmentRequired: false,
    instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
    questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Explicá', points: '2', scoringRule: null, options: [] }] } });
  await change({ action: 'publish', id });
  const state = await f.service.startActivity(f.S, f.room, id, {});
  return { attempt: state.attempt.id, revision: String(state.attempt.revision), editor: state.editor,
    question: state.activity.questions[0]?.id };
}

test('the API rejects every grading and participation case the proxy no longer checks, without writing', { timeout: 300000 }, async () => {
  await withGradingFixture(async f => {
    const graded = await f.create('QUESTIONNAIRE');
    await saveComplete(f, graded.attempt);
    const gradedView = await f.service.getAttemptGrading(f.T, f.room, graded.attempt);
    const published = await f.create('ASSIGNMENT');
    await publish(f, published.attempt, await saveComplete(f, published.attempt));
    const lateStudent = '0e222222-2222-4222-8222-222222222222';
    await f.pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Late','Student','fixture',now(),'student')`, [lateStudent, `${lateStudent}@example.test`]);
    const late = { actor: lateStudent, headers: {} }, { code } = await f.service.rotateCode(f.T, f.room);
    await f.service.confirmCode(late, (await f.service.previewCode(late, code)).confirmation);
    const questionnaire = await openAttempt(f, 'QUESTIONNAIRE');
    const practical = await openAttempt(f, 'ASSIGNMENT');
    const ids = {
      room: f.room, student: f.student, lateStudent, activity: graded.id, job: '0d222222-2222-4222-8222-222222222222',
      graded: { attempt: graded.attempt, revision: String(gradedView.revision), questions: f.input(gradedView).questions },
      published: { attempt: published.attempt, revision: String((await f.service.getAttemptGrading(f.T, f.room, published.attempt)).revision) },
      questionnaire, practical, roomRevision: String((await f.service.detail(f.T, f.room)).revision),
    };
    for (const value of [questionnaire.editor?.token, questionnaire.question, practical.editor?.token]) assert.ok(value, 'open attempt fixture');
    const actors = { teacher: f.teacher, student: f.student };
    const handler = createClassroomsHandler(f.service, { admit: async () => {} });
    const api = await serve((req, res) => {
      req.actor = actors[req.headers['x-test-actor']];
      handler(req, res, () => { res.writeHead(404); res.end('{}'); });
    });
    try {
      const before = await snapshot(f.pool);
      const divergent = [];
      for (const { method, path, actor, body, headers, conflictFirst } of classroomAttemptCases(ids)) {
        const response = await fetch(`${api.url}/classrooms${path}`, {
          method, headers: { 'content-type': 'application/json', 'x-test-actor': actor, ...headers }, body: JSON.stringify(body),
        });
        const result = await response.json();
        const [status, code] = conflictFirst ? [409, 'CONFLICT'] : [400, 'INVALID_INPUT'];
        if (response.status !== status || result?.error?.code !== code)
          divergent.push(`${method} ${path} ${JSON.stringify(body).slice(0, 110)} ${JSON.stringify(headers).slice(0, 60)} -> ${response.status} ${JSON.stringify(result).slice(0, 70)}`);
      }
      assert.deepEqual(divergent, []);
      assert.equal(await snapshot(f.pool), before);
      // Once the obligation allows it, the same malformed deadline is rejected as input.
      assert.throws(() => resolveDeadline('UTC', { local: 7 }), { code: 'INVALID_INPUT' });
    } finally { await api.close(); }
  });
});

test('the API rejects attempt headers on the member AI summary, like every other read', { timeout: 120000 }, async () => {
  await withGradingFixture(async f => {
    const handler = createClassroomsHandler(f.service, { admit: async () => {} });
    const api = await serve((req, res) => { req.actor = f.teacher; handler(req, res, () => { res.writeHead(404); res.end('{}'); }); });
    try {
      for (const headers of [{ 'x-attempt-editor': 'a'.repeat(43) }, { 'x-attempt-epoch': '1' }]) {
        const response = await fetch(`${api.url}/classrooms/${f.room}/members/${f.student}/ai-summary`, { headers });
        assert.equal(response.status, 400);
        assert.deepEqual(await response.json(), { error: { code: 'INVALID_INPUT' } });
      }
    } finally { await api.close(); }
  });
});
