import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';

const room = 'b1111111-1111-4111-8111-111111111111';

test('strategy input preserves the exact confirmed text and forbids unrelated private fields', async () => {
  const { parsePutSharedStudyStrategy } = await import('../src/core/domain/study/shared-strategy.ts');
  const text = '  Me ayuda comparar ejemplos.\n Después hago un ejercicio por mi cuenta. 🧠  ';
  assert.deepEqual(parsePutSharedStudyStrategy({ classroomId: room, text }), { classroomId: room, text });
  assert.equal(parsePutSharedStudyStrategy({ classroomId: room, text: '🧠'.repeat(1000) }).text.length, 2000);
  for (const invalid of [null, [], {}, { classroomId: room, text: ' \n\t' }, { classroomId: room, text: '🧠'.repeat(1001) },
    { classroomId: room, text: 'abc\0def' }, { classroomId: room, text: '\uD800' },
    { classroomId: 'other', text }, { classroomId: room, text, conversationId: room }]) {
    assert.throws(() => parsePutSharedStudyStrategy(invalid), { code: 'INVALID_INPUT' });
  }
});

test('the student route admits exact GET, PUT and versioned DELETE using private responses', async t => {
  const { createStudyHandler } = await import('../apps/api/src/modules/study/folders/presentation/http.ts');
  const folderId = 'c1111111-1111-4111-8111-111111111111';
  const strategyId = 'd1111111-1111-4111-8111-111111111111';
  const calls = [];
  const sharedStrategy = {
    get: async (_req, ...input) => { calls.push(['get', ...input]); return { strategy: null }; },
    publish: async (_req, ...input) => { calls.push(['publish', ...input]); return { strategy: null }; },
    withdraw: async (_req, ...input) => { calls.push(['withdraw', ...input]); return { strategy: null }; },
  };
  const handler = createStudyHandler({ sharedStrategy }, async (req, write) => {
    if (req.headers['x-test-student'] !== 'verified') throw Object.assign(Error('denied'), { code: 'FORBIDDEN' });
    if (write && req.headers['x-csrf-token'] !== 'fixture') throw Object.assign(Error('csrf'), { code: 'CSRF_INVALID' });
  });
  const server = createServer((request, response) => handler(request, response, () => { response.writeHead(404); response.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  const root = 'http://127.0.0.1:' + server.address().port + '/api/v1/study-folders/' + folderId + '/shared-strategy';
  const headers = { 'x-test-student': 'verified', 'x-csrf-token': 'fixture' };
  const body = JSON.stringify({ classroomId: room, text: 'Esta es mi estrategia.' });
  for (const response of [
    await fetch(root, { headers }),
    await fetch(root, { method: 'PUT', headers: { ...headers, 'content-type': 'application/json' }, body }),
    await fetch(root + '/' + strategyId, { method: 'DELETE', headers }),
  ]) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.deepEqual(calls, [['get', folderId], ['publish', folderId, JSON.parse(body)], ['withdraw', folderId, strategyId]]);
  assert.equal((await fetch(root, { method: 'DELETE', headers })).status, 400);
  assert.equal((await fetch(root + '?classroomId=' + room, { headers })).status, 400);
  assert.equal((await fetch(root)).status, 403);
  assert.equal((await fetch(root + '/' + strategyId, { method: 'DELETE', headers: { 'x-test-student': 'verified' } })).status, 403);
  assert.equal((await fetch(root + '/' + strategyId, { method: 'DELETE', headers, body })).status, 400);
  assert.equal(calls.length, 3);
});
