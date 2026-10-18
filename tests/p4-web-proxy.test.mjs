import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { proxyFileRequest } from '../apps/web/src/lib/file-proxy.ts';

const id = '11111111-1111-4111-8111-111111111111';
async function server(handler) {
  const instance = createServer(handler); await new Promise(resolve => instance.listen(0, '127.0.0.1', resolve));
  return { instance, origin: `http://127.0.0.1:${instance.address().port}`, close: () => new Promise(resolve => { instance.closeAllConnections(); instance.close(resolve); }) };
}
function raw(origin, path, options, chunks = []) {
  return new Promise((resolve, reject) => {
    const call = request(origin + path, options, response => {
      const body = []; response.on('data', chunk => body.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(body).toString() }));
    });
    call.on('error', reject); for (const chunk of chunks) call.write(chunk); call.end();
  });
}
test('strict route/query/method/origin/body allowlist and metadata cap', async () => {
  let calls = 0;
  const backend = await server((req, res) => { calls++; req.resume(); res.end('{}'); });
  const web = await server((req, res) => proxyFileRequest(req, res, backend.origin));
  try {
    for (const [path, method, status] of [['/other', 'GET', 404], ['/files', 'DELETE', 405], [`/files/${id}?extra=1`, 'GET', 400], ['/files/usage?kind=draft&kind=draft&id='+id, 'GET', 400]]) assert.equal((await fetch(web.origin+'/api/v1'+path, { method })).status, status);
    assert.equal((await fetch(web.origin+'/api/v1/files', { method: 'POST', body: 'x'.repeat(16385), headers: { 'content-type': 'application/json' } })).status, 413);
    assert.equal(calls, 0);
  } finally { await web.close(); await backend.close(); }
});
test('binary transfer preserves exact bytes, cookies, CSRF and safe response headers only', async () => {
  let observed; const bytes = Buffer.from([0, 255, 10, 1]);
  const backend = await server(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    observed = { headers: req.headers, bytes: Buffer.concat(chunks) };
    res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="a.pdf"', 'Set-Cookie': ['foxmind_session=rotated; HttpOnly'], 'X-Request-Id': 'test-id', 'X-Private': 'hidden', 'Content-Length': '4' }); res.end(bytes);
  });
  const web = await server((req, res) => proxyFileRequest(req, res, backend.origin));
  try {
    const response = await fetch(`${web.origin}/api/v1/files/${id}/content`, { method: 'PUT', body: bytes, headers: { 'content-type': 'application/octet-stream', origin: web.origin, cookie: 'foxmind_session=old', 'x-csrf-token': 'binding', authorization: 'secret', 'x-forwarded-host': 'evil' } });
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    assert.deepEqual(observed.bytes, bytes);
    assert.equal(observed.headers.cookie, 'foxmind_session=old'); assert.equal(observed.headers['x-csrf-token'], 'binding');
    assert.equal(observed.headers.authorization, undefined); assert.equal(observed.headers['x-forwarded-host'], undefined);
    assert.equal(observed.headers['content-length'], '4');
    const download = await fetch(`${web.origin}/api/v1/files/${id}/content?mode=preview`);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), bytes);
    assert.equal(download.headers.get('content-type'), 'application/pdf'); assert.match(download.headers.get('content-disposition'), /inline/);
    assert.equal(response.headers.get('x-private'), null); assert.equal(response.headers.get('cache-control'), 'no-store'); assert.match(response.headers.get('set-cookie'), /rotated/);
  } finally { await web.close(); await backend.close(); }
});
test('redirects and unsafe backend configuration cannot forward credentials', async () => {
  let calls = 0; const backend = await server((req, res) => { calls++; res.writeHead(302, { location: 'https://other.invalid' }); res.end(); });
  let configured = backend.origin; const web = await server((req, res) => proxyFileRequest(req, res, configured));
  try {
    assert.equal((await fetch(`${web.origin}/api/v1/files/${id}`)).status, 503);
    for (configured of ['http://other.invalid', `${backend.origin}/path`, undefined]) assert.equal((await fetch(`${web.origin}/api/v1/files/${id}`)).status, 503);
    assert.equal(calls, 1);
  } finally { await web.close(); await backend.close(); }
});
test('downstream disconnect cancels a pending upstream transfer', async () => {
  let closed; const cancelled = new Promise(resolve => { closed = resolve; });
  const backend = await server((req, res) => { res.on('close', closed); res.writeHead(200, { 'content-type': 'application/pdf' }); res.write('first'); });
  const web = await server((req, res) => proxyFileRequest(req, res, backend.origin));
  try {
    await new Promise((resolve, reject) => { const call = request(`${web.origin}/api/v1/files/${id}/content`, response => { response.once('data', () => { call.destroy(); resolve(); }); }); call.on('error', reject); call.end(); });
    await Promise.race([cancelled, new Promise((_, reject) => setTimeout(() => reject(new Error('upstream not cancelled')), 1000))]);
  } finally { await web.close(); await backend.close(); }
});
test('chunked metadata cap, binary declared cap and missing length reject before backend', async () => {
  let calls = 0; const backend = await server((req, res) => { calls++; res.end('{}'); });
  const web = await server((req, res) => proxyFileRequest(req, res, backend.origin));
  try {
    const metadata = await raw(web.origin, '/api/v1/files', { method: 'POST', headers: { 'content-type': 'application/json', 'transfer-encoding': 'chunked' } }, ['x'.repeat(9000), 'x'.repeat(9000)]);
    assert.equal(metadata.status, 413);
    const large = await raw(web.origin, `/api/v1/files/${id}/content`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'content-length': '50000001' } });
    assert.equal(large.status, 413);
    const unknown = await raw(web.origin, `/api/v1/files/${id}/content`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'transfer-encoding': 'chunked' } }, ['abc']);
    assert.equal(unknown.status, 400);
    assert.equal(calls, 0);
  } finally { await web.close(); await backend.close(); }
});
test('oversized JSON response is sanitized without leaking partial bytes or cookies', async () => {
  const backend = await server((req, res) => { res.setHeader('set-cookie', 'private=hidden'); res.end('private'.repeat(3000)); });
  const web = await server((req, res) => proxyFileRequest(req, res, backend.origin));
  try {
    const response = await fetch(`${web.origin}/api/v1/files/${id}`);
    assert.equal(response.status, 503); assert.equal(response.headers.get('set-cookie'), null);
    const body = await response.json(); assert.equal(body.error.code, 'SERVICE_UNAVAILABLE'); assert.match(body.error.requestId, /^[a-f0-9-]{36}$/);
  } finally { await web.close(); await backend.close(); }
});
test('partial upload disconnect tears down its upstream socket', async () => {
  let signalStarted; const started = new Promise(resolve => { signalStarted = resolve; });
  let signalClosed; const closed = new Promise(resolve => { signalClosed = resolve; });
  const backend = await server((req, res) => { req.once('data', signalStarted); req.once('close', signalClosed); req.resume(); });
  const web = await server((req, res) => proxyFileRequest(req, res, backend.origin));
  try {
    const call = request(`${web.origin}/api/v1/files/${id}/content`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'content-length': '10000' } });
    call.on('error', () => {}); call.write('partial');
    await started; call.destroy();
    await Promise.race([closed, new Promise((_, reject) => setTimeout(() => reject(new Error('upload not cancelled')), 1000))]);
  } finally { await web.close(); await backend.close(); }
});
