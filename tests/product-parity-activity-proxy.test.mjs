import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

const first = 'a1111111-1111-4111-8111-111111111111';
const second = 'b2222222-2222-4222-8222-222222222222';
const endpoint = `/api/v1/classrooms/${first}/activities`;
const payload = {
  title: 'Compará ejemplos', instructions: 'Explicá tu elección.', attachmentRequired: false,
  instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false,
};
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const stop = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });

test('P4 proxy admite alcance interunidad e idea privada con validación previa al upstream', async () => {
  const upstream = [];
  const api = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    upstream.push(Buffer.concat(chunks).toString('utf8'));
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{}');
  });
  await listen(api);
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${api.address().port}`));
  await listen(web);
  const send = async operation => {
    const body = JSON.stringify({ revision: '1', operation });
    const result = await fetch(`http://127.0.0.1:${web.address().port}${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    const status = result.status;
    await result.arrayBuffer();
    return { body, status };
  };
  try {
    const save = item => ({ action: 'save', id: first, payload: { ...payload, ...item } });
    const valid = [
      save({ unitIds: [first], topicIds: [second], teacherBrief: 'Idea privada.' }),
      save({ unitIds: [], topicIds: [second], teacherBrief: null }),
      { action: 'metadata', id: first, title: 'Alcance nuevo', unitIds: [first, second], topicIds: [] },
      save({ unitId: first, topicId: second }),
    ];
    for (const operation of valid) {
      const { body, status } = await send(operation);
      assert.equal(status, 200);
      assert.equal(upstream.at(-1), body);
    }
    const invalid = [
      save({ unitIds: [first, first], topicIds: [] }),
      save({ unitIds: [first], topicIds: [second, second] }),
      save({ unitIds: [first] }),
      save({ unitIds: ['Unidad'], topicIds: [] }),
      save({ unitIds: [], topicIds: [first], topicId: second }),
      save({ unitIds: [], topicIds: [second], teacherBrief: 'á'.repeat(1201) }),
      save({ unitIds: [], topicIds: [second], teacherBrief: { text: 'Idea' } }),
      { action: 'metadata', id: first, title: 'Alcance nuevo', unitIds: [first], topicIds: [], teacherBrief: 'Privada' },
    ];
    for (const operation of invalid) assert.equal((await send(operation)).status, 400);
    assert.equal(upstream.length, valid.length);
  } finally {
    await Promise.all([stop(web), stop(api)]);
  }
});
