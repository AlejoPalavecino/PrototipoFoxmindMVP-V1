import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { classroomBodyCases } from './helpers/classroom-body-cases.mjs';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

// F2 (TASK-008): the classroom proxy forwards authoring and classroom bodies intact; the API rejects them
// (tests/classroom-body-api-database.test.mjs proves it against the real services).
const id = n => `a${n}111111-1111-4111-8111-111111111111`;
const ids = { room: id(1), draft: id(2), activity: id(3), batch: id(4), invitation: id(5), member: id(6), notification: id(7),
  unit: id(8), topic: id(9), roomRevision: '3', draftRevision: '1' };

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

test('the classroom proxy forwards malformed authoring and classroom bodies intact and relays the API rejection', async () => {
  const seen = [];
  const upstream = await serve((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      seen.push({ method: req.method, url: req.url, body: Buffer.concat(chunks).toString('utf8') });
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end('{"error":{"code":"INVALID_INPUT","source":"api"}}');
    });
  });
  const web = await serve((req, res) => void proxyClassroomRequest(req, res, upstream.origin));
  try {
    const cases = classroomBodyCases(ids);
    for (const { method, path, body } of cases) {
      const sent = JSON.stringify(body);
      const response = await fetch(`${web.origin}/api/v1/classrooms${path}`, { method, headers: { 'content-type': 'application/json' }, body: sent });
      assert.equal(response.status, 400, `${method} ${path}`);
      assert.deepEqual(await response.json(), { error: { code: 'INVALID_INPUT', source: 'api' } }, `${method} ${path} ${sent.slice(0, 80)}`);
      assert.deepEqual(seen.at(-1), { method, url: `/api/v1/classrooms${path}`, body: sent });
    }
    assert.equal(seen.length, cases.length);
  } finally { await web.close(); await upstream.close(); }
});

test('the proxy still owns transport limits on those routes: method, JSON content type, size and well-formed JSON', async () => {
  let reached = 0;
  const upstream = await serve((_req, res) => { reached++; res.setHeader('content-type', 'application/json'); res.end('{}'); });
  const web = await serve((req, res) => void proxyClassroomRequest(req, res, upstream.origin));
  try {
    const activities = `${web.origin}/api/v1/classrooms/${ids.room}/activities`;
    for (const [init, status] of [
      [{ method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' }, 405],
      [{ method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' }, 400],
      [{ method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' }, 400],
      [{ method: 'POST', headers: { 'content-type': 'application/json' }, body: 'x'.repeat(512 * 1024 + 1) }, 413],
    ]) assert.equal((await fetch(activities, init)).status, status, `${init.method} ${init.headers['content-type']}`);
    assert.equal(reached, 0);
  } finally { await web.close(); await upstream.close(); }
});
