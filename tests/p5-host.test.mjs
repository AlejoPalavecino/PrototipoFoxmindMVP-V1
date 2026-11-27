import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readClassroomsConfiguration } from '../.build/api/apps/api/src/modules/classrooms/access/infrastructure/configuration.js';
import { installClassroomsTransport, ClassroomHostLifecycle } from '../.build/api/apps/api/src/bootstrap/academic-host.js';
import { ClassroomIdentityError } from '../.build/api/apps/api/src/modules/classrooms/access/infrastructure/errors.js';
import { InvitationDeliveryWorker } from '../.build/api/apps/api/src/bootstrap/academic-delivery-composition.js';
import { IdentityHttpError } from '../.build/api/apps/api/src/modules/identity/domain/errors.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { ClassroomsModule } from '../.build/api/apps/api/src/bootstrap/academic-classrooms.module.js';
import { InvitationService } from '../.build/api/apps/api/src/bootstrap/academic-management-composition.js';
import { ACADEMIC_RUNTIME } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';

const express = createRequire(import.meta.url)('express');
const verifier = Buffer.alloc(32, 7).toString('base64url');
const origin = 'http://localhost:3000';
const key = start => Buffer.from(Array.from({ length: 32 }, (_, i) => i + start)).toString('base64url');
const environment = { CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '9007199254740993',
  CLASSROOMS_SIGNING_KEY: key(1), CLASSROOMS_DELIVERY_KEY: key(2) };

test('classrooms opt in only with explicit positive bigint quota, durable keys and trusted identity origin', () => {
  assert.equal(readClassroomsConfiguration({}, origin), undefined);
  const config = readClassroomsConfiguration(environment, origin);
  assert.equal(config.classroomQuotaBytes, 9007199254740993n);
  assert.equal(config.webOrigin, origin);
  assert.equal(config.signingKey.toString('base64url'), environment.CLASSROOMS_SIGNING_KEY);
  assert.equal(config.deliveryKey.length, 32);
  for (const patch of [{ CLASSROOMS_ENABLED: 'true' }, { CLASSROOMS_QUOTA_BYTES: undefined },
    { CLASSROOMS_QUOTA_BYTES: '0' }, { CLASSROOMS_QUOTA_BYTES: '9223372036854775808' },
    { CLASSROOMS_SIGNING_KEY: undefined }, { CLASSROOMS_DELIVERY_KEY: 'a'.repeat(43) },
    { CLASSROOMS_DELIVERY_KEY: key(2) + '=' }, { CLASSROOMS_DELIVERY_KEY: key(1) }]) {
    assert.throws(() => readClassroomsConfiguration({ ...environment, ...patch }, origin));
  }
  for (const badOrigin of ['http://foreign.invalid', origin + '/', 'https://example.test/path']) {
    assert.throws(() => readClassroomsConfiguration(environment, badOrigin));
  }
});

test('the classroom code HMAC key is required in production and distinct from the other keys (S7)', () => {
  assert.equal(readClassroomsConfiguration(environment, origin).codeDigestKey, undefined, 'derived outside production');
  assert.throws(() => readClassroomsConfiguration({ ...environment, NODE_ENV: 'production' }, origin));
  const production = readClassroomsConfiguration({ ...environment, NODE_ENV: 'production', CLASSROOMS_CODE_DIGEST_KEY: key(3) }, origin);
  assert.equal(production.codeDigestKey.toString('base64url'), key(3));
  for (const bad of [key(1), key(2), 'a'.repeat(43), '']) {
    assert.throws(() => readClassroomsConfiguration({ ...environment, CLASSROOMS_CODE_DIGEST_KEY: bad }, origin), bad);
  }
});

test('main configuration preserves disabled P3 behavior and requires integrated P4 when P5 is enabled', () => {
  const base = { DATABASE_URL: 'postgres://fixture:fixture@127.0.0.1:59999/fixture', ...identityTestEnvironment() };
  const disabled = readConfiguration(base);
  assert.equal(disabled.classrooms, undefined); assert.equal(disabled.files, undefined);
  assert.throws(() => readConfiguration({ ...base, ...environment }), /classrooms require private files/);
  const config = readConfiguration({ ...base, ...environment, FILES_ENABLED: '1', FILES_S3_ENDPOINT: 'http://127.0.0.1:18334',
    FILES_S3_REGION: 'us-east-1', FILES_S3_BUCKET: 'foxmind-private', FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32),
    FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64), FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: '13311', FILES_DRAFT_QUOTA_BYTES: '100000000' });
  assert.equal(config.classrooms.webOrigin, config.identity.security.origin);
  assert.equal(config.classrooms.classroomQuotaBytes, 9007199254740993n);
});

test('integrated module owns one worker and uses the same P4 FileStore and real session adapter', async () => {
  const config = readClassroomsConfiguration(environment, origin), sender = { send: async () => {}, close() {} };
  const module = ClassroomsModule.integrated({}, {}, {}, config, sender);
  assert.equal(module.providers.filter(p => p.provide === InvitationDeliveryWorker).length, 1);
  const provider = module.providers.find(p => p.provide === ACADEMIC_RUNTIME);
  assert.ok(provider?.useFactory);
  const invitation = module.providers.find(p => p.provide === InvitationService);
  assert.deepEqual(invitation.inject, [ACADEMIC_RUNTIME]);
  assert.ok(module.exports.includes(ACADEMIC_RUNTIME));
  const tx = {}, request = {}, fileId = 'file', classroomId = 'classroom';
  const loaded = {}, authorized = {}, promoted = {}, calls = [];
  const files = { store: {
    async load(actualTx, actualId) {
      assert.equal(this, files.store); assert.equal(actualTx, tx); assert.equal(actualId, fileId);
      calls.push('load'); return loaded;
    },
    async loadAuthorized(actualTx, actualRequest, actualId, action) {
      assert.equal(this, files.store); assert.equal(actualTx, tx); assert.equal(actualRequest, request);
      assert.equal(actualId, fileId); assert.equal(action, 'read');
      calls.push('loadAuthorized'); return authorized;
    },
  }, async promoteDraftPlanInTransaction(actualTx, actualRequest, actualId, actualClassroomId) {
    assert.equal(this, files); assert.equal(actualTx, tx); assert.equal(actualRequest, request);
    assert.equal(actualId, fileId); assert.equal(actualClassroomId, classroomId);
    calls.push('promote'); return promoted;
  } }, database = {}, runtime = { configuration: { security: {} } };
  const service = provider.useFactory(database, runtime, files);
  assert.equal(invitation.useFactory(service), service.classrooms.invitations);
  assert.notEqual(invitation.useFactory(service), service);
  assert.equal(service.access.ports.database, database);
  assert.equal(await service.access.ports.files.load(tx, fileId), loaded);
  assert.equal(await service.access.ports.files.loadAuthorized(tx, request, fileId, 'read'), authorized);
  assert.equal(await service.access.ports.files.promoteDraftPlanInTransaction(tx, request, fileId, classroomId), promoted);
  assert.deepEqual(calls, ['load', 'loadAuthorized', 'promote']);
  assert.equal(typeof service.access.ports.authenticate, 'function');
  assert.ok(module.exports.includes(ClassroomHostLifecycle));
});

async function host(t, options = {}) {
  const app = express(); let admitted = 0, authenticated = 0, effects = 0, original;
  const runtime = { configuration: { security: { secureCookies: false, clientAddress: request => request.socket.remoteAddress,
    assertOrigin(value) { if (value !== origin) throw new IdentityHttpError('ORIGIN_NOT_ALLOWED'); },
    validateCsrf(raw, submitted) { return raw === verifier && submitted === 'valid'; } } },
    authenticateVerifier(verifier) { return this.store.authenticate(verifier); }, admitBuckets(buckets) { return this.store.admit?.(this.configuration.security, buckets); }, 
    store: { async authenticate() { authenticated++; return options.anonymous ? null : {
      verifier, sessionId: 'session', user: { id: 'user', email_verified_at: options.unverified ? null : new Date() } }; } },
    async generalAdmission(ip) { admitted++; assert.ok(ip); if (options.rateLimited) throw new IdentityHttpError('RATE_LIMITED', 17); } };
  const service = { async mine(request) {
    assert.equal(request, original);
    if (options.serviceError) throw options.serviceError;
    return { teach: [], study: [] };
  }, async saveDraft(request, id, body) { effects++; assert.equal(request, original); return { id, ...body }; },
  async createDraft() { effects++; return { id: 'draft' }; } };
  app.use('/api/v1', (req, res, next) => { original = req; next(); });
  installClassroomsTransport({ use: app.use.bind(app) }, runtime, service);
  app.use(express.json());
  app.get('/api/v1/account', (req, res) => res.json({ untouched: true }));
  const server = createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { url: `http://127.0.0.1:${server.address().port}`, count: () => ({ admitted, authenticated, effects }) };
}
const cookie = { cookie: `foxmind_session=${verifier}` };
const write = { ...cookie, origin, 'x-csrf-token': 'valid', 'content-type': 'application/json' };

test('real host mounts original classroom requests, once-only ingress admission and untouched P3 siblings', async t => {
  const server = await host(t);
  const response = await fetch(server.url + '/api/v1/classrooms', { headers: cookie });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { teach: [], study: [] });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
  assert.equal((await fetch(server.url + '/api/v1/account')).status, 200);
  assert.deepEqual(server.count(), { admitted: 1, authenticated: 1, effects: 0 });
  const saved = await fetch(server.url + '/api/v1/classrooms/drafts/draft', {
    method: 'PATCH', headers: write, body: JSON.stringify({ revision: '0', payload: {} }),
  });
  assert.equal(saved.status, 200); assert.equal((await saved.json()).revision, '0');
  assert.deepEqual(server.count(), { admitted: 2, authenticated: 2, effects: 1 });
});

test('host rejects anonymous, unverified, forged, invalid PATCH Origin/CSRF and rate-limit requests without data effects', async t => {
  for (const [options, method, headers, status, code] of [
    [{ anonymous: true }, 'GET', cookie, 401, 'AUTH_REQUIRED'],
    [{ anonymous: true }, 'GET', { 'x-user-id': 'user' }, 401, 'AUTH_REQUIRED'],
    [{ unverified: true }, 'GET', cookie, 403, 'EMAIL_VERIFICATION_REQUIRED'],
    [{}, 'PATCH', { ...write, origin: 'http://foreign.invalid' }, 403, 'ORIGIN_NOT_ALLOWED'],
    [{}, 'PATCH', { ...write, 'x-csrf-token': 'wrong' }, 403, 'CSRF_INVALID'],
    [{ rateLimited: true }, 'GET', cookie, 429, 'RATE_LIMITED'],
    [{ serviceError: new ClassroomIdentityError(new IdentityHttpError('AUTH_REQUIRED')) }, 'GET', cookie, 401, 'AUTH_REQUIRED'],
  ]) {
    const server = await host(t, options);
    const response = await fetch(server.url + '/api/v1/classrooms', { method, headers, ...(method === 'PATCH' ? { body: '{}' } : {}) });
    assert.equal(response.status, status); const body = await response.json();
    assert.equal(body.error.code, code);
    assert.equal(body.error.requestId, response.headers.get('x-request-id'));
    if (status === 429) assert.equal(response.headers.get('retry-after'), '17');
    if (options.anonymous && headers.cookie) assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal(server.count().admitted, 1); assert.equal(server.count().effects, 0);
  }
});

test('invitation lifecycle drains the single worker before closing its owned sender once', async () => {
  const events = []; let release;
  const lifecycle = new ClassroomHostLifecycle({ async onModuleDestroy() {
    events.push('drain'); await new Promise(resolve => { release = resolve; });
  } }, { close() { events.push('sender'); } });
  const first = lifecycle.close(), second = lifecycle.onModuleDestroy();
  assert.deepEqual(events, ['drain']); release(); await Promise.all([first, second]);
  assert.deepEqual(events, ['drain', 'sender']);
});

test('invitation periodic startup and shutdown are idempotent and never restart a closed worker', async () => {
  let transactions = 0;
  const worker = new InvitationDeliveryWorker({ key: Buffer.alloc(32, 3), send: async () => {},
    database: { async $transaction(run) { transactions++; return run({ $queryRawUnsafe: async () => [] }); } } });
  worker.onModuleInit(); worker.onModuleInit(); await worker.sweep(); await worker.onModuleDestroy();
  assert.equal(transactions, 1);
  worker.onModuleInit(); await worker.onModuleDestroy();
  assert.equal(transactions, 1);
});
