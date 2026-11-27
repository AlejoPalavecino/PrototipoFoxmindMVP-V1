import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { loadTsModule } from './helpers/load-ts-module.mjs';

async function serve(handler) {
  const server = createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, port: server.address().port,
    async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
const load = file => loadTsModule(`apps/web/src/application/server/${file}`);
const session = 'foxmind_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
const homeBody = { timeZone: 'UTC' };

async function through(proxy, upstreamHandler, run) {
  const upstream = await serve(upstreamHandler);
  const web = await serve((req, res) => void proxy(req, res, upstream.origin));
  try { await run(web); } finally { await web.close(); await upstream.close(); }
}

test('proxy errors share one shape with requestId, utf-8 JSON and Retry-After on 503', async () => {
  const { proxyHomeRequest } = load('home-proxy.ts'), { proxyAgendaRequest } = load('agenda-proxy.ts'), { proxyAiQuotaRequest } = load('ai-quota-proxy.ts');
  for (const [proxy, path] of [[proxyHomeRequest, '/api/v1/home/unknown'], [proxyAgendaRequest, '/api/v1/agenda/unknown'], [proxyAiQuotaRequest, '/api/v1/ai-quota/unknown']]) {
    const web = await serve((req, res) => void proxy(req, res, 'http://127.0.0.1:9'));
    try {
      const missing = await fetch(web.origin + path);
      assert.equal(missing.status, 404);
      assert.equal(missing.headers.get('content-type'), 'application/json; charset=utf-8');
      const body = await missing.json();
      assert.equal(body.error.code, 'NOT_FOUND');
      assert.match(body.error.requestId, /^[0-9a-f-]{36}$/);
      assert.equal(missing.headers.get('x-request-id'), body.error.requestId);
    } finally { await web.close(); }
    const unconfigured = await serve((req, res) => void proxy(req, res, 'ftp://api.invalid'));
    try {
      const response = await fetch(unconfigured.origin + (proxy === proxyHomeRequest ? '/api/v1/home?timeZone=UTC' : proxy === proxyAgendaRequest ? '/api/v1/agenda/upcoming' : '/api/v1/ai-quota'));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('retry-after'), '3');
      assert.equal((await response.json()).error.code, 'SERVICE_UNAVAILABLE');
    } finally { await unconfigured.close(); }
  }
});

test('only the exact session clear crosses non-identity proxies; other API cookies never reach the browser', async () => {
  const { proxyAgendaRequest } = load('agenda-proxy.ts');
  await through(proxyAgendaRequest, (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': ['planted=1; Path=/', session] });
    res.end(JSON.stringify({ items: [] }));
  }, async web => {
    const response = await fetch(web.origin + '/api/v1/agenda/upcoming');
    assert.equal(response.status, 200);
    assert.deepEqual(response.headers.getSetCookie(), [session]);
  });
});

test('a rejected body is answered, discarded within a budget and the connection closed', async () => {
  const { proxyAgendaRequest } = load('agenda-proxy.ts');
  let reached = 0;
  await through(proxyAgendaRequest, (req, res) => { reached++; res.end(); }, async web => {
    const result = await new Promise((resolve, rejectRequest) => {
      const req = httpRequest({ port: web.port, host: '127.0.0.1', method: 'POST', path: '/api/v1/agenda/open',
        headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' } }, res => {
        const chunks = []; res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, connection: res.headers.connection, body: JSON.parse(Buffer.concat(chunks).toString()) }));
      });
      req.on('error', rejectRequest);
      req.write(Buffer.alloc(40 * 1024, 32));
      setTimeout(() => req.destroy(), 500);
    });
    assert.equal(result.status, 413);
    assert.equal(result.body.error.code, 'REQUEST_TOO_LARGE');
    assert.equal(result.connection, 'close');
  });
  assert.equal(reached, 0, 'a rejected request never reaches the API');
});
