import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { installStudyUploads } from '../apps/api/src/modules/study/folders/presentation/uploads/http.ts';
import { installChatAttachmentTransport } from '../apps/api/src/bootstrap/chat-attachment-transport.ts';
import { proxyStudyRequest } from '../apps/web/src/application/server/study-proxy.ts';

// F8: study folder uploads and chat attachments follow the shared size-based upload deadline through the
// study proxy and the API, instead of fixed 65 s (proxy), 120 s (folders) and 15 s (attachments).
const folder = '11111111-1111-4111-8111-111111111111', upload = '22222222-2222-4222-8222-222222222222';
const conversation = '33333333-3333-4333-8333-333333333333', attachment = '44444444-4444-4444-8444-444444444444';
const flush = () => new Promise(resolve => setImmediate(resolve));

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

async function withStudyApi(run) {
  const handlers = [];
  const app = { use: (_prefix, handler) => handlers.push(handler) };
  const received = [];
  installStudyUploads(app, {
    authorizeReceive: async (_request, _folder, _id) => ({ expectedBytes: run.size }),
    receive: async (_request, _folder, id, bytes) => { received.push(bytes.length); return { id, sizeBytes: bytes.length, ready: true }; },
  }, async () => {});
  installChatAttachmentTransport(app, {
    authorize: async () => {},
    upload: async (_request, _target, id, _intent, bytes) => { received.push(bytes.length); return { id, sizeBytes: bytes.length }; },
  }, async () => 'teacher');
  const api = await serve((req, res) => {
    const next = index => index < handlers.length ? handlers[index](req, res, () => next(index + 1)) : (res.writeHead(404), res.end());
    // Both transports are mounted under /api/v1 in the host, which strips the prefix.
    req.url = req.url.slice('/api/v1'.length);
    next(0);
  });
  const web = await serve((req, res) => void proxyStudyRequest(req, res, `http://127.0.0.1:${api.port}`));
  try { return await run.test(web.port, received); } finally { await web.close(); await api.close(); }
}

// Sends `size` bytes in 500 kB chunks, one every 4 s of mocked time: never idle for 5 s.
function slowPut(t, port, path, size) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: '127.0.0.1', port, method: 'PUT', path,
      headers: { 'content-type': 'application/octet-stream', 'content-length': String(size), cookie: 'foxmind_session=synthetic' } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.once('error', reject);
    (async () => {
      for (let sent = 0; sent < size; sent += 500_000) {
        await flush(); t.mock.timers.tick(4000); await flush();
        const chunk = Buffer.alloc(Math.min(500_000, size - sent));
        if (sent + chunk.length >= size) req.end(chunk); else req.write(chunk);
        await flush();
      }
    })().catch(reject);
  });
}

test('a chat attachment that keeps sending data for 68 s crosses the study proxy and the API', async t => {
  const size = 8_500_000;
  await withStudyApi({ size, test: async (port, received) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const { status, body } = await slowPut(t, port, `/api/v1/chat-attachments/teacher/${conversation}/${attachment}?name=guia.pdf`, size);
      assert.equal(status, 200, body);
      assert.deepEqual(received, [size]);
    } finally { t.mock.timers.reset(); }
  } });
});

test('a study folder upload that keeps sending data for 128 s crosses the study proxy and the API', async t => {
  const size = 16_000_000;
  await withStudyApi({ size, test: async (port, received) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const { status, body } = await slowPut(t, port, `/api/v1/study-folders/${folder}/uploads/${upload}`, size);
      assert.equal(status, 200, body);
      assert.deepEqual(received, [size]);
    } finally { t.mock.timers.reset(); }
  } });
});
