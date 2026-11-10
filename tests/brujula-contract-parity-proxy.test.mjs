import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

test('Brújula proxy forwards independent persisted fields and rejects invalid values before upstream', async () => {
  const calls = [];
  const upstream = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push(JSON.parse(Buffer.concat(chunks).toString())); res.setHeader('content-type', 'application/json'); res.end('{}');
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const id = 'a1111111-1111-4111-8111-111111111111', root = `http://127.0.0.1:${web.address().port}/api/v1/classrooms/${id}`;
  const post = (path, body) => fetch(root + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  try {
    const payload = { title: 'Actividad', unitId: id, topicIds: [id], instructions: 'Consigna', objective: 'Objetivo', teacherComment: 'Aclaración',
      attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false };
    const authored = { revision: '1', operation: { action: 'save', id, payload } };
    assert.equal((await post('/activities', authored)).status, 200); assert.deepEqual(calls.at(-1), authored);
    const grading = { revision: '1', overallGrade: null, questions: [], finalGradeOverride: '9.25', rubricMarks: [{ criterionIndex: 0, score: '8.25' }] };
    assert.equal((await post(`/attempts/${id}/grading`, grading)).status, 200); assert.deepEqual(calls.at(-1), grading);
    const wall = { revision: '1', operation: { action: 'publish', title: 'Título', body: 'Mensaje' } };
    assert.equal((await post('/wall', wall)).status, 200); assert.deepEqual(calls.at(-1), wall);
    const before = calls.length;
    for (const invalid of [{ ...payload, objective: 1 }, { ...payload, objective: 'x'.repeat(1401) }, { ...payload, teacherComment: {} }])
      assert.equal((await post('/activities', { ...authored, operation: { ...authored.operation, payload: invalid } })).status, 400);
    assert.equal((await post('/wall', { ...wall, operation: { ...wall.operation, title: 'x'.repeat(121) } })).status, 400);
    assert.equal((await post(`/attempts/${id}/grading`, { ...grading, finalGradeOverride: '10.01' })).status, 400);
    assert.equal(calls.length, before);
  } finally {
    web.closeAllConnections(); upstream.closeAllConnections();
    await Promise.all([new Promise(resolve => web.close(resolve)), new Promise(resolve => upstream.close(resolve))]);
  }
});
