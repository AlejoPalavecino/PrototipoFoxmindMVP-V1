import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFilesConfiguration } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/configuration.js';
import { installFilesTransport, FileHostLifecycle } from '../.build/api/apps/api/src/bootstrap/files-host.js';
import { IdentityHttpError } from '../.build/api/apps/api/src/modules/identity/domain/errors.js';
import { FileStore, FileIdentityError } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/store.js';

const require = createRequire(import.meta.url);
const express = require('express');
const verifier = Buffer.alloc(32, 7).toString('base64url');
const configuration = { FILES_ENABLED: '1', FILES_S3_ENDPOINT: 'http://127.0.0.1:18334', FILES_S3_REGION: 'us-east-1',
  FILES_S3_BUCKET: 'foxmind-private', FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32), FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64),
  FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: '13311', FILES_DRAFT_QUOTA_BYTES: '9007199254740993' };
test('files are disabled unless explicitly enabled and enabled configuration has an explicit exact bigint quota', () => {
  assert.equal(readFilesConfiguration({}), undefined);
  const result = readFilesConfiguration(configuration);
  assert.equal(result.draftQuotaBytes, 9007199254740993n);
  assert.equal(result.infrastructure.scannerPort, 13311);
  for (const patch of [{ FILES_ENABLED: 'true' }, { FILES_DRAFT_QUOTA_BYTES: undefined },
    { FILES_DRAFT_QUOTA_BYTES: '-1' }, { FILES_SCANNER_PORT: '0' }, { FILES_S3_ENDPOINT: 'http://public.invalid' },
    { FILES_S3_SECRET_ACCESS_KEY: undefined }]) {
    assert.throws(() => readFilesConfiguration({ ...configuration, ...patch }));
  }
});

async function host(t, options = {}) {
  const app = express(); let admitted = 0, authenticated = 0, received, original;
  const runtime = { configuration: { security: { secureCookies: false,
    clientAddress: request => request.socket.remoteAddress,
    assertOrigin(origin) { if (origin !== 'http://localhost:3000') throw new IdentityHttpError('ORIGIN_NOT_ALLOWED'); },
    validateCsrf(raw, submitted) { return raw === verifier && submitted === 'valid'; } } },
    store: { async authenticate() { authenticated++; return options.anonymous ? null : { verifier, sessionId: 'session', user: { id: 'user' } }; } },
    async generalAdmission(ip, context) { admitted++; assert.ok(ip); if (options.rateLimited) throw new IdentityHttpError('RATE_LIMITED', 17); } };
  const service = { async usage(request) {
    assert.equal(request, original);
    if (options.serviceError) throw options.serviceError;
    return { usedBytes: 0n, quotaBytes: 100n };
  }, async authorizeReceive(request) { assert.equal(request, original); return { expectedBytes: 4 }; },
    async receive(request, id, bytes) { received = { request, id, bytes }; return { ready: true }; } };
  app.use('/api/v1', (request, response, next) => { original = request; next(); });
  installFilesTransport({ use: app.use.bind(app) }, runtime, service);
  app.use(express.json());
  app.get('/api/v1/account', (request, response) => response.json({ untouched: true }));
  const server = createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { url: `http://127.0.0.1:${server.address().port}`, count: () => ({ admitted, authenticated }), received: () => received };
}
const cookie = { cookie: `foxmind_session=${verifier}` };
const usage = '/api/v1/files/usage?kind=draft&id=11111111-1111-4111-8111-111111111111';
test('mounted ingress uses the original request, accounts once and leaves P3 sibling routes untouched', async t => {
  const server = await host(t);
  const response = await fetch(server.url + usage, { headers: cookie });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { usedBytes: '0', quotaBytes: '100' });
  assert.deepEqual(server.count(), { admitted: 1, authenticated: 1 });
  const sibling = await fetch(server.url + '/api/v1/account'); assert.equal(sibling.status, 200);
  assert.deepEqual(server.count(), { admitted: 1, authenticated: 1 });
});
test('binary PUT reaches the file reader before general parsers, after exact Origin/CSRF checks', async t => {
  const server = await host(t);
  const response = await fetch(server.url + '/api/v1/files/11111111-1111-4111-8111-111111111111/content', {
    method: 'PUT', headers: { ...cookie, origin: 'http://localhost:3000', 'x-csrf-token': 'valid', 'content-type': 'application/octet-stream' },
    body: Buffer.from([0, 255, 3, 4]),
  });
  assert.equal(response.status, 200); assert.deepEqual(server.received().bytes, Buffer.from([0, 255, 3, 4]));
  assert.deepEqual(server.count(), { admitted: 1, authenticated: 1 });
});
test('anonymous and invalid write requests consume admission once and preserve safe 401/403/429 errors', async t => {
  for (const [options, method, headers, status, code] of [
    [{ anonymous: true }, 'GET', cookie, 401, 'AUTH_REQUIRED'],
    [{}, 'POST', { ...cookie, origin: 'http://foreign.invalid' }, 403, 'ORIGIN_NOT_ALLOWED'],
    [{}, 'PUT', { ...cookie, origin: 'http://localhost:3000' }, 403, 'CSRF_INVALID'],
    [{ rateLimited: true }, 'GET', cookie, 429, 'RATE_LIMITED'],
    [{ serviceError: new FileIdentityError(new IdentityHttpError('AUTH_REQUIRED')) }, 'GET', cookie, 401, 'AUTH_REQUIRED'],
  ]) {
    const server = await host(t, options);
    const response = await fetch(server.url + usage, { method, headers });
    assert.equal(response.status, status);
    const body = await response.json(); assert.equal(body.error.code, code);
    assert.match(body.error.requestId, /^[0-9a-f-]{36}$/);
    assert.equal(response.headers.get('x-request-id'), body.error.requestId);
    if (status === 429) assert.equal(response.headers.get('retry-after'), '17');
    assert.equal(server.count().admitted, 1);
  }
});
test('file store preserves trusted identity errors while sanitizing unrelated SQL failures', async () => {
  const store = new FileStore({ async $transaction(run) { return run({}); } }, {}, 1n);
  await assert.rejects(store.transaction(() => { throw new FileIdentityError(new IdentityHttpError('AUTH_REQUIRED')); }), { code: 'AUTH_REQUIRED' });
  await assert.rejects(store.transaction(() => { throw new Error('driver/private'); }), { code: 'SERVICE_UNAVAILABLE' });
});
test('host shutdown drains cleanup then closes storage once, including concurrent close callers', async () => {
  const events = []; let release;
  const worker = { async onModuleDestroy() { events.push('cleanup'); await new Promise(resolve => { release = resolve; }); } };
  const lifecycle = new FileHostLifecycle(worker, { close() { events.push('storage'); } });
  const first = lifecycle.close(), second = lifecycle.close();
  assert.deepEqual(events, ['cleanup']); release(); await Promise.all([first, second]);
  assert.deepEqual(events, ['cleanup', 'storage']);
});
