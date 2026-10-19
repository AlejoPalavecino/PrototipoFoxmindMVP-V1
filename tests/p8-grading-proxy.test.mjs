import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/lib/classroom-proxy.ts';
const id = 'a1111111-1111-4111-8111-111111111111';
test('grading proxy forwards exact decimal JSON with session/CSRF and rejects unknown shapes/capabilities', async () => {
  const calls = [], upstream = createServer(async (req, res) => { const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }); res.setHeader('content-type', 'application/json'); res.end('{}'); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${web.address().port}/api/v1/classrooms/${id}/attempts/${id}`;
  const body = { revision: '1', overallGrade: '8.50', questions: [] };
  const post = (data, headers = {}) => fetch(root + '/grading', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'fixture=session', 'x-csrf-token': 'fixture', ...headers }, body: JSON.stringify(data) });
  try {
    assert.equal((await fetch(root + '/grading')).status, 200);
    assert.equal((await post(body)).status, 200); assert.equal(calls.at(-1).body, JSON.stringify(body));
    assert.equal(calls.at(-1).headers.cookie, 'fixture=session'); assert.equal(calls.at(-1).headers['x-csrf-token'], 'fixture');
    const n = calls.length;
    for (const invalid of [{ ...body, ownerId: id }, { ...body, overallGrade: '8.345' }, { ...body, overallGrade: '1e1' },
      { ...body, questions: [{ questionId: id, points: null, feedback: '', finalGrade: '10' }] }]) assert.equal((await post(invalid)).status, 400);
    assert.equal((await post(body, { 'x-attempt-editor': 'a'.repeat(43) })).status, 400);
    assert.equal((await fetch(root + '/grading?publish=true')).status, 400); assert.equal(calls.length, n);
    assert.equal((await fetch(root + '/history')).status, 200);
  } finally { web.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(resolve => web.close(resolve)), new Promise(resolve => upstream.close(resolve))]); }
});
