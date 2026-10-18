import test from 'node:test';
import assert from 'node:assert/strict';
import { authenticateSession } from '../.build/api/apps/api/src/identity/session-query.js';
import { IdentityStore } from '../.build/api/apps/api/src/identity/persistence.js';
import { createIdentityFileAccess } from '../.build/api/apps/api/src/files/host.js';
import { readIdentityConfiguration, sessionTokenDigest, IDENTITY_POLICY } from '../.build/api/apps/api/src/identity-security/index.js';

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
    throw new Error('Unexpected query');
  } };
  return { tx, state };
}

test('shared persisted session query uses the existing digest and returns the P3 context without writes', async () => {
  const { tx, state } = fixture();
  const result = await authenticateSession(tx, verifier);
  assert.deepEqual(result, { sessionId: state.row.session_id, user, verifier, absoluteExpiresAt: state.row.session_expires_at });
  assert.deepEqual(state.calls[0].values, [sessionTokenDigest(verifier)]);
  assert.ok(state.calls.every(({ sql }) => /^\s*SELECT/.test(sql)));
});

test('P3 IdentityStore authentication delegates through its existing transaction and returns the unchanged context', async () => {
  const { tx, state } = fixture(); let transactions = 0;
  const store = new IdentityStore({ async $transaction(run) {
    transactions++;
    return run({ $queryRawUnsafe: (sql, ...values) => tx.query(sql, ...values) });
  } });
  assert.deepEqual(await store.authenticate(verifier), {
    sessionId: state.row.session_id, user, verifier, absoluteExpiresAt: state.row.session_expires_at,
  });
  assert.equal(transactions, 1);
});

test('missing, revoked, idle-expired and absolutely-expired sessions fail without extending either window', async () => {
  for (const mutate of [s => { s.row = null; }, s => { s.row.session_revoked_at = now; },
    s => { s.now = new Date(now.getTime() + IDENTITY_POLICY.sessionIdleSeconds * 1000); },
    s => { s.row.session_expires_at = now; }]) {
    const { tx, state } = fixture(); mutate(state);
    const before = JSON.stringify(state.row);
    assert.equal(await authenticateSession(tx, verifier), null);
    assert.equal(JSON.stringify(state.row), before);
  }
});

test('file bridge repeatedly validates on the caller transaction and sees revocation after user-lock waits', async () => {
  const { tx, state } = fixture();
  const access = createIdentityFileAccess(security);
  const request = { method: 'PUT', headers: { cookie: `foxmind_session=${verifier}`,
    origin: security.origin, 'x-csrf-token': security.csrfToken(verifier) } };
  assert.equal(await access.authenticate(tx, request, 'upload'), user.id);
  assert.equal(await access.authenticate(tx, request, 'upload'), user.id);
  state.row.session_revoked_at = now;
  await assert.rejects(access.authenticate(tx, request, 'upload'), { code: 'AUTH_REQUIRED' });
  assert.ok(state.calls.every(({ sql }) => /^\s*SELECT/.test(sql)));
});

test('file bridge rejects fake headers, duplicate cookies and POST/PUT origin or CSRF failures', async () => {
  const { tx } = fixture(); const access = createIdentityFileAccess(security);
  for (const headers of [{ 'x-user-id': user.id }, { cookie: `foxmind_session=${verifier}; foxmind_session=${verifier}` }]) {
    await assert.rejects(access.authenticate(tx, { method: 'GET', headers }, 'read'), { code: 'AUTH_REQUIRED' });
  }
  for (const method of ['POST', 'PUT']) {
    const base = { cookie: `foxmind_session=${verifier}`, origin: security.origin, 'x-csrf-token': security.csrfToken(verifier) };
    await assert.rejects(access.authenticate(tx, { method, headers: { ...base, origin: 'http://foreign.invalid' } }, 'upload'),
      { code: 'ORIGIN_NOT_ALLOWED' });
    await assert.rejects(access.authenticate(tx, { method, headers: { ...base, 'x-csrf-token': 'wrong' } }, 'upload'),
      { code: 'CSRF_INVALID' });
  }
});

test('unsupported attempt writes remain denied after the existing domain resolver checks', async () => {
  const access = createIdentityFileAccess(security);
  const tx = { async query(sql) {
    if (sql.includes('FROM classrooms')) return [{ teacher_id: '33333333-3333-4333-8333-333333333333' }];
    if (sql.includes('FROM attempts')) return [{ student_id: user.id, status: 'DRAFT', type: 'ASSIGNMENT', activity_status: 'PUBLISHED', is_expected: true }];
    throw new Error('Unexpected query');
  } };
  await assert.rejects(access.authorize(tx, user.id, { scope: { kind: 'classroom', id: '44444444-4444-4444-8444-444444444444' },
    purpose: 'attachment', targetId: '55555555-5555-4555-8555-555555555555' }, 'upload', {}), { code: 'FORBIDDEN' });
});
