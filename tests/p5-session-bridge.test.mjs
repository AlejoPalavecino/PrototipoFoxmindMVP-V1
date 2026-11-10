import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdentityClassroomAuthentication } from '../.build/api/apps/api/src/bootstrap/academic-host.js';
import { ClassroomCore } from '../.build/api/apps/api/src/modules/classrooms/infrastructure/core.js';
import { ClassroomIdentityError } from '../.build/api/apps/api/src/modules/classrooms/infrastructure/errors.js';
import { IdentityHttpError } from '../.build/api/apps/api/src/modules/identity/domain/errors.js';
import { FileIdentityError } from '../.build/api/apps/api/src/modules/files/infrastructure/store.js';
import { readIdentityConfiguration } from '../.build/api/apps/api/src/modules/identity/infrastructure/security/configuration.js';
import { sessionTokenDigest } from '../.build/api/apps/api/src/modules/identity/infrastructure/security/verifiers.js';
import { IDENTITY_POLICY } from '../.build/api/apps/api/src/modules/identity/infrastructure/security/sessions.js';

const verifier = Buffer.alloc(32, 7).toString('base64url');
const security = readIdentityConfiguration({ APP_ORIGIN: 'http://localhost:3000', AUTH_LOCAL_HTTP: 'true',
  AUTH_CSRF_HMAC_KEY: Buffer.from(Array.from({ length: 32 }, (_, i) => i)).toString('base64url'),
  AUTH_ABUSE_HMAC_KEY: Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1)).toString('base64url'),
}, '127.0.0.1');
const now = new Date('2026-10-17T12:00:00Z');
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'account@example.invalid',
  email_normalized: 'account@example.invalid', first_name: 'Test', last_name: 'Account',
  password_hash: 'not-a-real-hash', created_at: now, updated_at: now, email_verified_at: now };
function fixture() {
  const state = { row: { ...user, session_id: '22222222-2222-4222-8222-222222222222',
    session_expires_at: new Date(now.getTime() + 3600000), session_last_seen_at: now,
    session_revoked_at: null }, calls: [] };
  const tx = { async query(sql, ...values) {
    state.calls.push({ sql, values });
    if (sql.includes('FROM sessions')) return state.row ? [{ ...state.row }] : [];
    if (sql.includes('clock_timestamp')) return [{ now: state.now ?? now }];
    if (sql.includes('FROM users')) { if (state.revokeUnderLock) state.row.session_revoked_at = now; return [user]; }
    throw new Error('Unexpected query');
  } };
  return { tx, state };
}
const request = (method = 'GET', overrides = {}) => ({ method, headers: {
  cookie: `foxmind_session=${verifier}`, origin: security.origin,
  'x-csrf-token': security.csrfToken(verifier), ...overrides,
} });

test('P5 session bridge reuses the caller transaction, P3 digest and policy without writes or activity extension', async () => {
  const { tx, state } = fixture(); const authenticate = createIdentityClassroomAuthentication(security);
  const before = JSON.stringify(state.row);
  for (const method of ['GET', 'POST', 'PUT', 'PATCH']) assert.equal(await authenticate(tx, request(method), method !== 'GET'), user.id);
  assert.deepEqual(state.calls[0].values, [sessionTokenDigest(verifier)]);
  assert.equal(JSON.stringify(state.row), before);
  assert.ok(state.calls.every(({ sql }) => /^\s*SELECT/.test(sql)));
  state.row.session_revoked_at = now;
  await assert.rejects(authenticate(tx, request(), false), { code: 'AUTH_REQUIRED', status: 401 });
});

test('missing, duplicate, forged, revoked, idle/absolute-expired and unverified sessions fail closed', async () => {
  const authenticate = createIdentityClassroomAuthentication(security);
  for (const mutate of [s => { s.row = null; }, s => { s.row.session_revoked_at = now; },
    s => { s.now = new Date(now.getTime() + IDENTITY_POLICY.sessionIdleSeconds * 1000); },
    s => { s.row.session_expires_at = now; }]) {
    const { tx, state } = fixture(); mutate(state); const before = JSON.stringify(state.row);
    await assert.rejects(authenticate(tx, request(), false), { code: 'AUTH_REQUIRED' });
    assert.equal(JSON.stringify(state.row), before);
  }
  for (const headers of [{ cookie: undefined, 'x-user-id': user.id }, { cookie: `foxmind_session=${verifier}; foxmind_session=${verifier}` }]) {
    await assert.rejects(authenticate(fixture().tx, request('GET', headers), false), { code: 'AUTH_REQUIRED' });
  }
  const { tx, state } = fixture(); state.row.email_verified_at = null;
  await assert.rejects(authenticate(tx, request(), false), { code: 'EMAIL_VERIFICATION_REQUIRED' });
});

test('all write methods require exact Origin and session-bound CSRF on every repeat', async () => {
  const authenticate = createIdentityClassroomAuthentication(security);
  for (const method of ['POST', 'PUT', 'PATCH']) {
    await assert.rejects(authenticate(fixture().tx, request(method, { origin: 'http://foreign.invalid' }), true), { code: 'ORIGIN_NOT_ALLOWED' });
    await assert.rejects(authenticate(fixture().tx, request(method, { 'x-csrf-token': 'wrong' }), true), { code: 'CSRF_INVALID' });
  }
});

test('ClassroomCore preserves trusted identity denial after user-lock reauthentication, with no domain effects', async () => {
  const { tx, state } = fixture(); state.revokeUnderLock = true; let effects = 0;
  const core = new ClassroomCore({ database: { async $transaction(run) {
    return run({ $queryRawUnsafe: (sql, ...values) => tx.query(sql, ...values) });
  } }, authenticate: createIdentityClassroomAuthentication(security), files: {}, classroomQuotaBytes: 1n,
  deliveryKey: Buffer.alloc(32, 3), signingKey: Buffer.alloc(32, 4), webOrigin: security.origin });
  await assert.rejects(core.run(request(), false, () => { effects++; }), { code: 'AUTH_REQUIRED', status: 401 });
  assert.equal(effects, 0); assert.ok(state.calls.every(({ sql }) => /^\s*SELECT/.test(sql)));
  for (const error of [new ClassroomIdentityError(new IdentityHttpError('RATE_LIMITED', 13)), new Error('driver/private')]) {
    core.ports.authenticate = async () => { throw error; };
    await assert.rejects(core.run(request(), false, () => { effects++; }), { code: error.code ?? 'SERVICE_UNAVAILABLE' });
  }
  assert.equal(effects, 0);
});

test('P4 promotion identity revalidation preserves its trusted P3 denial across the classroom transaction', async () => {
  const { tx } = fixture();
  const core = new ClassroomCore({ database: { async $transaction(run) {
    return run({ $queryRawUnsafe: (sql, ...values) => tx.query(sql, ...values) });
  } }, authenticate: createIdentityClassroomAuthentication(security), files: {}, classroomQuotaBytes: 1n,
  deliveryKey: Buffer.alloc(32, 3), signingKey: Buffer.alloc(32, 4), webOrigin: security.origin });
  await assert.rejects(core.run(request(), false, () => {
    throw new FileIdentityError(new IdentityHttpError('AUTH_REQUIRED'));
  }), { code: 'AUTH_REQUIRED', status: 401 });
});
