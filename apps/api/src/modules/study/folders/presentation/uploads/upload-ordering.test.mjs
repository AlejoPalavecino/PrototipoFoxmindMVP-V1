import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import test from 'node:test';
import { installStudyUploads, readStudyBody } from './http.ts';

const folder = '11111111-1111-4111-8111-111111111111', upload = '22222222-2222-4222-8222-222222222222';
const path = `/study-folders/${folder}/uploads/${upload}`;

async function withServer(operations, run) {
  const handlers = [];
  installStudyUploads({ use: (_prefix, handler) => handlers.push(handler) }, operations, async () => {});
  const server = createServer((req, res) => handlers[0](req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { return await run(server.address().port); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
function put(port, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ port, host: '127.0.0.1', method: 'PUT', path, headers: { 'content-type': 'application/octet-stream', ...headers } }, res => {
      const chunks = []; res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, connection: res.headers.connection, json: JSON.parse(Buffer.concat(chunks).toString() || '{}') }));
    });
    req.on('error', reject); req.end(body);
  });
}
const view = { id: upload, name: 'a.pdf', sizeBytes: 4, ready: true, upload: 'COMPLETED', validation: 'APPROVED', scan: 'CLEAN', rejectionCode: null };

test('la subida de Estudio autentica antes de leer el cuerpo', async () => {
  const calls = [];
  const operations = {
    authorizeReceive: async () => { calls.push('authorize'); throw { code: 'AUTH_REQUIRED' }; },
    receive: async () => { calls.push('receive'); return view; },
  };
  await withServer(operations, async port => {
    const response = await put(port, Buffer.alloc(4));
    assert.equal(response.status, 401);
    assert.equal(response.json.error.code, 'AUTH_REQUIRED');
    assert.equal(response.connection, 'close');
  });
  assert.deepEqual(calls, ['authorize']);
});

test('rechaza antes de leer si Content-Length falta, no coincide o excede lo declarado', async () => {
  let received = 0;
  const operations = { authorizeReceive: async () => ({ expectedBytes: 4 }), receive: async () => { received++; return view; } };
  await withServer(operations, async port => {
    assert.equal((await put(port, Buffer.alloc(5))).json.error.code, 'INVALID_UPLOAD');
    assert.equal((await put(port, Buffer.alloc(3))).json.error.code, 'INVALID_UPLOAD');
    const chunked = await put(port, undefined, { 'transfer-encoding': 'chunked' });
    assert.equal(chunked.status, 400);
    assert.equal(chunked.json.error.code, 'INVALID_UPLOAD');
  });
  assert.equal(received, 0);
});

test('con sesión y tamaño declarado exacto el cuerpo llega a receive', async () => {
  let got;
  const operations = { authorizeReceive: async () => ({ expectedBytes: 4 }), receive: async (_r, f, id, bytes) => { got = { f, id, bytes }; return view; } };
  await withServer(operations, async port => assert.equal((await put(port, Buffer.from('abcd'))).status, 200));
  assert.equal(got.f, folder); assert.equal(got.id, upload); assert.equal(got.bytes.toString(), 'abcd');
});

test('readStudyBody corta a un cliente que no termina de enviar el cuerpo', async () => {
  const { PassThrough } = await import('node:stream');
  const stalled = new PassThrough(); stalled.write('parcial');
  const started = Date.now();
  await assert.rejects(readStudyBody(stalled, 100, 80), { code: 'REQUEST_TIMEOUT' });
  assert.ok(Date.now() - started < 1000);
});

test('una cuenta no acapara las transferencias de Estudio y las consultas no ocupan lugar', async () => {
  const { createTransferGate } = await import('../../../../../platform/http/transfer-gate.ts');
  const gate = createTransferGate({ total: 8, perOwner: 1 });
  let release;
  const held = new Promise(resolve => { release = resolve; });
  const operations = {
    authorizeReceive: async request => { if (request.headers['x-owner'] === 'a') await held; return { expectedBytes: 4 }; },
    receive: async () => view, status: async () => view,
  };
  const handlers = [];
  installStudyUploads({ use: (_prefix, handler) => handlers.push(handler) }, operations, async request => request.headers['x-owner'] ?? null, gate);
  const server = createServer((req, res) => handlers[0](req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const port = server.address().port;
    const first = put(port, Buffer.from('abcd'), { 'x-owner': 'a' });
    await new Promise(resolve => setTimeout(resolve, 50));
    const second = await put(port, Buffer.from('abcd'), { 'x-owner': 'a' });
    assert.equal(second.status, 503);
    assert.equal((await put(port, Buffer.from('abcd'), { 'x-owner': 'b' })).status, 200, 'otra cuenta sigue subiendo');
    const status = await new Promise((resolve, reject) => {
      const req = httpRequest({ port, host: '127.0.0.1', method: 'GET', path, headers: { 'x-owner': 'a' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); req.end();
    });
    assert.equal(status, 200, 'consultar el estado no ocupa un lugar de transferencia');
    release();
    assert.equal((await first).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
