import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { installChatAttachmentTransport } from '../apps/api/src/bootstrap/chat-attachment-transport.ts';
import { proxyStudyRequest } from '../apps/web/src/application/server/study-proxy.ts';

const conversation = randomUUID(), attachment = randomUUID(), path = `/api/v1/chat-attachments/teacher/${conversation}/${attachment}/file`;
async function serve(handler) {
  const server = createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
async function fixture(run, result = {}) {
  let handler; const calls = [], bytes = Buffer.from('%PDF-private-synthetic');
  installChatAttachmentTransport({ use(_prefix, callback) { handler = callback; } }, {
    async read(request, target, id) { calls.push({ target, id, headers: request.headers });
      if (result.error) throw Object.assign(new Error(), { code: result.error });
      return { bytes, name: 'guía "privada"; prueba.pdf', extension: 'pdf', ...result }; },
  }, async () => {});
  const api = await serve((req, res) => { req.url = req.url.slice('/api/v1'.length); handler(req, res, () => { res.writeHead(404); res.end(); }); });
  const web = await serve((req, res) => void proxyStudyRequest(req, res, api.origin));
  try { await run({ origin: web.origin, calls, bytes }); } finally { await web.close(); await api.close(); }
}

test('private PDF crosses binary proxy unchanged and native GET requires no CSRF header', async () => fixture(async ({ origin, calls, bytes }) => {
  const response = await fetch(`${origin}${path}?mode=preview`, { headers: { cookie: 'foxmind_session=synthetic' } });
  assert.equal(response.status, 200); assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.match(response.headers.get('content-security-policy'), /sandbox; default-src 'none'/);
  assert.match(response.headers.get('content-disposition'), /^inline; filename="file.pdf"; filename\*=UTF-8''gu%C3%ADa%20%22privada%22%3B/);
  assert.deepEqual(calls[0].target, { conversationId: conversation, folderId: undefined });
  assert.equal(calls[0].headers.cookie, 'foxmind_session=synthetic'); assert.equal(calls[0].headers['x-csrf-token'], undefined);
}));

test('Office is always a download; PDF download is explicit', async () => {
  for (const extension of ['doc', 'docx', 'ppt', 'pptx']) await fixture(async ({ origin, bytes }) => {
    const response = await fetch(`${origin}${path}?mode=preview`);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition'), /^attachment;/);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  }, { extension });
  await fixture(async ({ origin }) => {
    const response = await fetch(`${origin}${path}?mode=download`);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-disposition'), /^attachment;/); await response.arrayBuffer();
  });
});

test('binary route rejects unknown parameters/methods and forwards safe permission failures', async () => {
  await fixture(async ({ origin, calls }) => {
    for (const [suffix, method] of [['?mode=html', 'GET'], ['?mode=preview&mode=download', 'GET'], ['?owner=foreign', 'GET'], ['', 'DELETE']]) {
      const response = await fetch(`${origin}${path}${suffix}`, { method });
      assert.ok(response.status >= 400 && response.status < 500); await response.arrayBuffer();
    }
    assert.equal(calls.length, 0);
  });
  await fixture(async ({ origin }) => {
    const response = await fetch(`${origin}${path}`); assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { error: { code: 'FORBIDDEN' } });
    assert.equal(response.headers.get('content-disposition'), null);
  }, { error: 'FORBIDDEN' });
});
