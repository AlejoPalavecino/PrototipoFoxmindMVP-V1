import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyFoxyRequest } from '../apps/web/src/lib/foxy-proxy.ts';
import { createFoxyHandler } from '../.build/api/apps/api/src/foxy-ai/http.js';

test('Foxy activity handoff uses exact POST route, admission and JSON response through proxy', async () => {
  const id = 'a1111111-1111-4111-8111-111111111111', calls = [];
  const receipt = { classroomId: id, activityId: id, revision: '2' };
  const handler = createFoxyHandler({ resources: { prepareActivity: async (_request, resourceId, input) => { calls.push({ resourceId, input }); return receipt; } } },
    { admit: async (request, write) => {
      if (request.headers.cookie !== 'fixture=session') throw Object.assign(new Error(), { code: 'AUTH_REQUIRED' });
      if (!write || request.headers['x-csrf-token'] !== 'bound') throw Object.assign(new Error(), { code: 'CSRF_INVALID' });
    } });
  const upstream = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const web = createServer((req, res) => void proxyFoxyRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${web.address().port}/api/v1/foxy-ai/resources/${id}/activity-draft`;
  const input = { requestId: id, resourceRevision: '1', classroomId: id, classroomRevision: '1', payload: { instructions: 'Texto privado revisado' } };
  const post = (path = root, headers = { cookie: 'fixture=session', 'x-csrf-token': 'bound' }) => fetch(path,
    { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(input) });
  try {
    const result = await post(); assert.equal(result.status, 200); assert.deepEqual(await result.json(), receipt); assert.deepEqual(calls, [{ resourceId: id, input }]);
    assert.equal((await post(root, { cookie: 'fixture=session' })).status, 403);
    assert.equal((await post(root, { 'x-csrf-token': 'bound' })).status, 401);
    assert.equal((await fetch(root)).status, 405);
    assert.equal((await post(root + '?privateText=forged')).status, 400); assert.equal(calls.length, 1);
  } finally {
    web.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => web.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
});
