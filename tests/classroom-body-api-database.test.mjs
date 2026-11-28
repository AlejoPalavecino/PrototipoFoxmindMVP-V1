import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { withGradingFixture } from './p8-grading-helpers.mjs';
import { classroomBodyCases } from './helpers/classroom-body-cases.mjs';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
import { ActivityAiService } from '../.build/api/apps/api/src/modules/activities/generation/application/service.js';
import { ClassroomAiService } from '../.build/api/apps/api/src/modules/curriculum/generation/application/service.js';

// F2 (TASK-008): the API, not the web proxy, rejects malformed authoring and classroom bodies.
// Every body the proxy used to reject must get 400 INVALID_INPUT from the real services and write nothing.
const untouched = new Proxy({}, { get: (_target, name) => () => { throw new Error(`AI port used before validation: ${String(name)}`); } });

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

test('the API rejects every authoring and classroom body the proxy no longer checks, without writing', { timeout: 300000 }, async () => {
  await withGradingFixture(async f => {
    const draft = await f.service.createDraft(f.T);
    const { id: activity } = await f.service.changeActivities(f.T, f.room,
      { revision: (await f.service.detail(f.T, f.room)).revision, operation: { action: 'create', type: 'ASSIGNMENT' } });
    const [{ id: unit }] = (await f.pool.query('SELECT id FROM units WHERE classroom_id = $1', [f.room])).rows;
    const [{ id: topic }] = (await f.pool.query('SELECT id FROM topics WHERE classroom_id = $1', [f.room])).rows;
    const ids = {
      room: f.room, draft: draft.id, draftRevision: String(draft.revision), activity, unit, topic, member: f.student,
      roomRevision: String((await f.service.detail(f.T, f.room)).revision),
      // The route checks these bodies before looking the resource up, so synthetic ids are enough.
      invitation: '0a111111-1111-4111-8111-111111111111', batch: '0b111111-1111-4111-8111-111111111111',
      notification: '0c111111-1111-4111-8111-111111111111',
    };
    for (const [name, value] of Object.entries(ids)) assert.ok(value, `fixture id ${name}`);
    const actors = { teacher: f.teacher, student: f.student };
    const handler = createClassroomsHandler(f.service, {
      admit: async () => {}, activityAi: new ActivityAiService({}, untouched), ai: new ClassroomAiService({}, untouched),
    });
    const api = await serve((req, res) => {
      req.actor = actors[req.headers['x-test-actor']];
      handler(req, res, () => { res.writeHead(404); res.end('{}'); });
    });
    try {
      const before = await snapshot(f.pool);
      const divergent = [];
      for (const { method, path, actor, body } of classroomBodyCases(ids)) {
        const response = await fetch(`${api.url}/classrooms${path}`, {
          method, headers: { 'content-type': 'application/json', 'x-test-actor': actor }, body: JSON.stringify(body),
        });
        const result = await response.json();
        if (response.status !== 400 || result?.error?.code !== 'INVALID_INPUT')
          divergent.push(`${method} ${path} ${JSON.stringify(body).slice(0, 120)} -> ${response.status} ${JSON.stringify(result).slice(0, 80)}`);
      }
      assert.deepEqual(divergent, []);
      assert.equal(await snapshot(f.pool), before);
    } finally { await api.close(); }
  });
});
