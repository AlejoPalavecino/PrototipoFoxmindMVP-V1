import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { classroomAttemptCases } from './helpers/classroom-attempt-cases.mjs';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

// F2 (TASK-009): the classroom proxy forwards grading and participation bodies, and the attempt header values
// of the routes that carry them, intact; the API rejects them (tests/classroom-attempt-api-database.test.mjs).
const id = n => `b${n}222222-2222-4222-8222-222222222222`;
const editor = { token: 'a'.repeat(43), epoch: 2 };
const ids = { room: id(1), roomRevision: '4', student: id(2), lateStudent: id(3), activity: id(4), job: id(5),
  graded: { attempt: id(6), revision: '6', questions: [{ questionId: id(7), points: null, feedback: null }] },
  published: { attempt: id(8), revision: '8' },
  questionnaire: { attempt: id(9), revision: '2', question: id(0), editor },
  practical: { attempt: 'c1222222-2222-4222-8222-222222222222', revision: '3', editor } };
const carrying = /\/attempts\/[^/]+\/(?:transfer|answer|submit-answers|attachments-remove|submit-practical|practical-response)$/;

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

test('the classroom proxy forwards malformed grading and participation requests intact and relays the API rejection', async () => {
  const seen = [];
  const upstream = await serve((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body: Buffer.concat(chunks).toString('utf8'),
        editor: req.headers['x-attempt-editor'], epoch: req.headers['x-attempt-epoch'] });
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end('{"error":{"code":"INVALID_INPUT","source":"api"}}');
    });
  });
  const web = await serve((req, res) => void proxyClassroomRequest(req, res, upstream.origin));
  try {
    const cases = classroomAttemptCases(ids);
    for (const { method, path, body, headers } of cases) {
      const sent = JSON.stringify(body), label = `${method} ${path} ${sent.slice(0, 80)} ${JSON.stringify(headers)}`;
      const response = await fetch(`${web.origin}/api/v1/classrooms${path}`, { method, headers: { 'content-type': 'application/json', ...headers }, body: sent });
      assert.equal(response.status, 400, label);
      assert.deepEqual(await response.json(), { error: { code: 'INVALID_INPUT', source: 'api' } }, label);
      assert.ok(carrying.test(path) || !headers['x-attempt-editor'], label);
      assert.deepEqual(seen.at(-1), { method, url: `/api/v1/classrooms${path}`, body: sent,
        editor: headers['x-attempt-editor'], epoch: headers['x-attempt-epoch'] }, label);
    }
    assert.equal(seen.length, cases.length);
  } finally { await web.close(); await upstream.close(); }
});

test('the proxy keeps attempt headers to their routes: rejected on reads and participation, never forwarded elsewhere', async () => {
  const seen = [];
  const upstream = await serve((req, res) => {
    seen.push({ url: req.url, editor: req.headers['x-attempt-editor'] }); req.resume();
    res.setHeader('content-type', 'application/json'); res.end('{}');
  });
  const web = await serve((req, res) => void proxyClassroomRequest(req, res, upstream.origin));
  try {
    const headers = { 'x-attempt-editor': editor.token, 'x-attempt-epoch': '2' };
    for (const path of [`/${ids.room}/members/${ids.student}/ai-summary`, `/${ids.room}/attempts/${ids.graded.attempt}/grading`,
      `/${ids.room}/activities/${ids.activity}/session`, `/${ids.room}/progress`])
      assert.equal((await fetch(`${web.origin}/api/v1/classrooms${path}`, { headers })).status, 400, path);
    assert.equal(seen.length, 0);
    const plan = `${web.origin}/api/v1/classrooms/${ids.room}/plan`;
    const response = await fetch(plan, { method: 'POST', headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ revision: '1', operation: {} }) });
    assert.equal(response.status, 200);
    assert.deepEqual(seen, [{ url: `/api/v1/classrooms/${ids.room}/plan`, editor: undefined }]);
  } finally { await web.close(); await upstream.close(); }
});
