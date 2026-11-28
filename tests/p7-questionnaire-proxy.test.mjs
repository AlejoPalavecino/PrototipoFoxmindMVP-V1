import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
const id = 'a1111111-1111-4111-8111-111111111111', editor = { 'x-attempt-editor': 'a'.repeat(43), 'x-attempt-epoch': '2' };

test('answer proxy forwards bodies and editor values to the API only at owned ingress, and preserves sibling routes', async () => {
  const calls = [], upstream = createServer(async (req, res) => {
    const parts = []; for await (const chunk of req) parts.push(chunk);
    calls.push({ path: req.url, headers: req.headers, body: Buffer.concat(parts).toString() }); res.setHeader('content-type', 'application/json'); res.end('{}');
  });
  await new Promise(r => upstream.listen(0, '127.0.0.1', r));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(r => web.listen(0, '127.0.0.1', r));
  const root = `http://127.0.0.1:${web.address().port}/api/v1/classrooms/${id}`;
  const post = (leaf, body, h = editor) => fetch(root + leaf, { method: 'POST', headers: { 'content-type': 'application/json', 'x-csrf-token': 'csrf', ...h }, body: JSON.stringify(body) });
  const draft = { revision: '1', questionId: id, text: '😀'.repeat(20000), optionIds: [] }, path = `/attempts/${id}`;
  try {
    for (const [leaf, body] of [['answer', draft], ['submit-answers', { revision: '2', confirm: true, confirmIncomplete: true }]]) {
      assert.equal((await post(`${path}/${leaf}`, body)).status, 200); assert.equal(calls.at(-1).body, JSON.stringify(body));
      assert.equal(calls.at(-1).headers['x-attempt-editor'], editor['x-attempt-editor']); assert.equal(calls.at(-1).headers['x-attempt-epoch'], '2');
    }
    const count = calls.length;
    for (const [leaf, body, h] of [['answer', { ...draft, questionId: 'invalid' }], ['answer', { ...draft, optionIds: [4] }], ['answer', { ...draft, text: null }],
      ['answer', draft, {}], ['answer', draft, { ...editor, 'x-attempt-epoch': 'bad' }],
      ['submit-answers', { revision: '1', confirm: false, confirmIncomplete: true }], ['submit-answers', { revision: '1', confirm: true, confirmIncomplete: 'yes' }],
      ['submit-answers', { revision: '1', confirm: true, confirmIncomplete: true, receivedAt: '2000-01-01' }]])
      assert.equal((await post(`${path}/${leaf}`, body, h)).status, 200);
    assert.equal(calls.length, count + 8);
    assert.equal((await post('/plan', { revision: '1', operation: { action:'setTopicState',id:'11111111-1111-4111-8111-111111111111',status:'TAUGHT' } })).status, 200);
    assert.equal(calls.at(-1).headers['x-attempt-editor'], undefined);
    assert.equal((await post(`${path}/submit-practical`, { revision: '1', confirm: true })).status, 200);
    assert.equal(calls.at(-1).body, '{"revision":"1","confirm":true}');
  } finally { web.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(r => web.close(r)), new Promise(r => upstream.close(r))]); }
});
