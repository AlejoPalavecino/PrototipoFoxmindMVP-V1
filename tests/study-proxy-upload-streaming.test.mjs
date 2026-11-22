import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const { proxyStudyRequest } = loadTsModule('apps/web/src/application/server/study-proxy.ts');
const listen = handler => new Promise(resolve => {
  const http = createServer(handler);
  http.listen(0, '127.0.0.1', () => resolve({ origin: `http://127.0.0.1:${http.address().port}`, port: http.address().port,
    close: () => { http.closeAllConnections(); return new Promise(done => http.close(done)); } }));
});
const path = () => `/api/v1/study-folders/${randomUUID()}/uploads/${randomUUID()}`;
async function fixture(run) {
  const events = [];
  const upstream = await listen((req, res) => {
    const chunks = [];
    events.push({ type: 'request', headers: req.headers });
    req.on('data', chunk => { chunks.push(chunk); events.push({ type: 'data', size: chunk.length }); });
    req.on('end', () => { events.push({ type: 'end' }); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ size: Buffer.concat(chunks).length })); });
    req.on('error', () => {});
  });
  const web = await listen((req, res) => void proxyStudyRequest(req, res, upstream.origin));
  try { await run(web, events); } finally { await web.close(); await upstream.close(); }
}
const send = (web, { declared, chunks, gap, target = path(), type = 'application/octet-stream' }) => new Promise((resolve, reject) => {
  const req = httpRequest({ port: web.port, host: '127.0.0.1', method: 'PUT', path: target,
    headers: { 'content-type': type, ...(declared === undefined ? {} : { 'content-length': String(declared) }), cookie: 'foxmind_session=x' } }, res => {
    const body = []; res.on('data', chunk => body.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(body).toString() }));
  });
  req.on('error', reject);
  (async () => { for (const chunk of chunks) { req.write(chunk); await gap?.(); } req.end(); })();
});

test('study upload bytes reach the upstream before the client finishes sending', async () => fixture(async (web, events) => {
  let seenEarly = false;
  const result = await send(web, { declared: 8, chunks: [Buffer.from('abcd'), Buffer.from('efgh')], gap: async () => {
    for (let i = 0; i < 40 && !events.some(e => e.type === 'data'); i++) await new Promise(r => setTimeout(r, 25));
    seenEarly ||= events.some(e => e.type === 'data') && !events.some(e => e.type === 'end');
  } });
  assert.equal(seenEarly, true, 'upstream received data while the client was still sending');
  assert.equal(result.status, 200);
  assert.equal(JSON.parse(result.body).size, 8);
  assert.equal(events[0].headers['content-length'], '8');
}));
test('study upload over the declared or configured limit is rejected and not fully forwarded', async () => fixture(async (web, events) => {
  const over = await send(web, { declared: 50 * 1024 * 1024 + 1, chunks: [Buffer.from('x')], target: path() });
  assert.equal(over.status, 413);
  const chat = await send(web, { declared: 20_000_001, chunks: [Buffer.from('x')],
    target: `/api/v1/chat-attachments/teacher/${randomUUID()}/${randomUUID()}` });
  assert.equal(chat.status, 413);
  assert.equal(events.length, 0);
}));
test('study upload that sends more or fewer bytes than declared never completes upstream', async () => fixture(async (web, events) => {
  const more = await send(web, { declared: 4, chunks: [Buffer.from('abcdefgh')] }).catch(() => ({ status: 0 }));
  assert.ok(more.status === 400 || more.status === 0, `status ${more.status}`);
  assert.equal(events.some(e => e.type === 'end'), false);
}));
