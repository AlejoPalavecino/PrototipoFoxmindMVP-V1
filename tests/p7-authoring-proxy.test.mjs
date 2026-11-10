import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('authoring proxy admits only exact authoring shapes while old shared routes retain their bytes', async () => {
  const calls = [];
  const api = createServer(async (req, res) => { const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString(); calls.push([req.url, body]); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ path: req.url, body })); });
  await new Promise(r => api.listen(0, '127.0.0.1', r));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${api.address().port}`));
  await new Promise(r => web.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${web.address().port}/api/v1/classrooms`;
  const post = (path, body) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    for (const path of [`/${id}/activities`, `/${id}/activities/${id}`, `/${id}/activities/${id}/preview`]) assert.equal((await fetch(origin + path)).status, 200);
    assert.equal((await post(`/${id}/activities/deadline`, { local: '2026-11-01T01:30' })).status, 200);
    const payload = { title: 'A', unitId: id, topicId: id, instructions: 'a\nb', attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false };
    for (const operation of [{ action: 'create', type: 'ASSIGNMENT' }, { action: 'save', id, payload }, { action: 'publish', id },
      { action: 'withdraw', id }, { action: 'metadata', id, title: 'A', unitId: id, topicId: id }, { action: 'deadline', id, deadline: { local: '2026-11-01T01:30', offsetMinutes: -300 }, allowLate: true }]) {
      const body = { revision: '0', operation };
      const res = await post(`/${id}/activities`, body); assert.equal(res.status, 200); assert.equal((await res.json()).body, JSON.stringify(body));
    }
    const count = calls.length;
    for (const operation of [{ action: 'create', type: 'ASSIGNMENT', teacher: id }, { action: 'publish' }, { action: 'save', id, payload: { ...payload, owner: id } },
      { action: 'save', id, payload: { ...payload, questions: [{ type: 'DEVELOPMENT', prompt: 'Q', points: '1', scoringRule: null, options: [], secret: true }] } }])
      assert.equal((await post(`/${id}/activities`, { revision: '0', operation })).status, 400);
    assert.equal(calls.length, count);
    for (const [path, body] of [[`/${id}/plan`, { revision: '0', operation: { action:'setTopicState',id:'11111111-1111-4111-8111-111111111111',status:'TAUGHT' } }],
      [`/${id}/library`, { revision: '0', operation: { action: 'publish', title: 'Guide', fileId: id, unitId: null, topicId: null } }],
      [`/${id}/wall`, { revision: '0', operation: { action: 'publish', body: 'Prior wall' } }]]) {
      const result = await post(path, body); assert.equal(result.status, 200); assert.equal((await result.json()).body, JSON.stringify(body));
    }
  } finally { web.closeAllConnections(); api.closeAllConnections(); await Promise.all([new Promise(r => web.close(r)), new Promise(r => api.close(r))]); }
});
