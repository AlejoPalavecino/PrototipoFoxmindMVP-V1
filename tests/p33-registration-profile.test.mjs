import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { execFileSync } from 'node:child_process';
import { domainToUnicode } from 'node:url';
import pg from 'pg';
import { createApplication } from '../.build/api/apps/api/src/application.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { createPasswordService, generateVerifier, sessionTokenDigest } from '../.build/api/apps/api/src/identity-security/index.js';
import { IdentityRuntime } from '../.build/api/apps/api/src/identity/index.js';
import { createSmtpFixture } from '../scripts/mail-smtp-fixture.mjs';

if (process.send) { process.send({ type: 'foxmind-test-ready' }); process.disconnect(); }
if (!/^foxmind-identity-[a-f0-9]+$/.test(process.env.P33_IDENTITY_ISOLATED ?? '') || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.P33_OWNED_INBOX ?? '')) throw new Error('Owned D2 runner required');
const origin = 'http://127.0.0.1:3000';
const password = 'Only a fixture password 😀';
const replacement = 'Another fixture password 😀';
const apps = new Set();
let db, base, verified, unverified, hash;
const rates = JSON.stringify({ registration: { ip: { limit: 100 }, identifier: { limit: 20 } }, login: { ip: { limit: 100 }, identifier: { limit: 100 } }, 'general-identity': { ip: { limit: 1000 }, session: { limit: 1000 } } });
// Every API on this owned database deliberately shares the runner's B/C keys.
async function start(overrides = {}, options) {
  const app = await createApplication(readConfiguration({ ...process.env, AUTH_RATE_LIMITS_JSON: rates, ...overrides }), options);
  apps.add(app); await app.listen(0, '127.0.0.1');
  return { app, base: `http://127.0.0.1:${app.getHttpServer().address().port}` };
}
async function close(app) { await app.close(); apps.delete(app); }
before(async () => {
  db = new pg.Client({ connectionString: process.env.DATABASE_URL, query_timeout: 2000 }); await db.connect();
  hash = await (await createPasswordService()).hash(password);
  verified = await seed('Verified@example.test', true); unverified = await seed('Unverified@example.test', false);
  ({ base } = await start());
});
after(async () => { for (const app of apps) await app.close(); if (db) await db.end(); });
async function seed(email, isVerified, role = 'student') {
  const id = randomUUID();
  await db.query(`INSERT INTO users(id,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,$2,lower($2),'Original','Learner',$3,CASE WHEN $4 THEN now() ELSE NULL END,$5)`, [id, email, hash, isVerified, role]);
  return id;
}
async function session(user = verified, { idle = 0, absolute = 43200 } = {}) {
  const verifier = generateVerifier();
  await db.query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at)
    VALUES($1,$2,$3,now()+($4 * interval '1 second'),now()+($5 * interval '1 second'))`, [randomUUID(), user, sessionTokenDigest(verifier), absolute, idle]);
  return `foxmind_session=${verifier}`;
}
async function send(path, { method = 'GET', body, cookie, csrf, headers = {}, target = base } = {}) {
  return fetch(`${target}/api/v1${path}`, { method,
    headers: { ...(method !== 'GET' ? { Origin: origin, 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(4000) });
}
const input = (email, extra = {}) => ({ email, firstName: 'Example', lastName: 'Learner', password, accountRole: 'student', ...extra });
const register = (email, extra = {}, options = {}) => send('/auth/register', { method: 'POST', body: input(email, extra), ...options });
const login = (email, raw = password, options = {}) => send('/auth/login', { method: 'POST', body: { email, password: raw }, ...options });
function security(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('x-request-id') ?? '', /^[a-f0-9-]{36}$/);
}
async function error(response, status, code) {
  assert.equal(response.status, status); security(response);
  const body = await response.json(); assert.equal(body.error?.code, code);
  assert.deepEqual(Object.keys(body.error).sort(), ['code', 'requestId']);
  assert.equal(body.error.requestId, response.headers.get('x-request-id'));
}
async function status(response, expected) {
  await response.arrayBuffer(); // Release real HTTP connections even for status-only assertions.
  assert.equal(response.status, expected);
}
async function accepted(response) {
  assert.equal(response.status, 202); security(response); assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(await response.json(), { status: 'accepted' });
}
async function csrf(cookie, target = base) { return (await (await send('/auth/csrf', { cookie, target })).json()).csrfToken; }

test('D2 profile avatar catalogue persists per account for both roles and rejects arbitrary sources', async () => {
  for (const role of ['student', 'teacher']) {
    const id = await seed(`Avatar-${role}@example.test`, true, role);
    const cookie = await session(id), token = await csrf(cookie);
    assert.equal((await (await send('/account', { cookie })).json()).avatarKey, 'initials');
    for (const avatarKey of ['foxy-classic', 'foxy-reader', 'foxy-explorer', 'foxy-creative', 'initials']) {
      const response = await send('/account', { method: 'PATCH', cookie, csrf: token, body: { avatarKey } });
      assert.equal(response.status, 200);
      const profile = await response.json();
      assert.equal(profile.avatarKey, avatarKey); assert.equal(profile.firstName, 'Original');
      const fresh = await session(id);
      assert.equal((await (await send('/auth/session', { cookie: fresh })).json()).user.avatarKey, avatarKey);
    }
    for (const avatarKey of ['https://example.test/a.png', '../foxy-reader', 'unknown', '', null, 42]) {
      await error(await send('/account', { method: 'PATCH', cookie, csrf: token, body: { avatarKey } }), 422, 'VALIDATION_ERROR');
    }
    await error(await send('/account', { method: 'PATCH', cookie, body: { avatarKey: 'foxy-reader' } }), 403, 'CSRF_INVALID');
    await error(await send('/account', { method: 'PATCH', cookie, csrf: token, body: { avatarKey: 'foxy-reader' }, headers: { Origin: 'https://example.test' } }), 403, 'ORIGIN_NOT_ALLOWED');
    assert.equal((await (await send('/account', { cookie })).json()).avatarKey, 'initials');
  }
  const cookie = await session(verified);
  assert.equal((await (await send('/account', { cookie })).json()).avatarKey, 'initials');
  const pending = await session(unverified);
  await error(await send('/account', { method: 'PATCH', cookie: pending, csrf: await csrf(pending), body: { avatarKey: 'foxy-reader' } }), 403, 'EMAIL_VERIFICATION_REQUIRED');
});
async function inbox() {
  const response = await fetch(`${process.env.P33_OWNED_INBOX}/api/v1/messages`, { signal: AbortSignal.timeout(1000) });
  assert.equal(response.status, 200); return (await response.json()).messages;
}
async function captured(email, count = 1) {
  const at = email.lastIndexOf('@'), local = email.slice(0, at), domain = email.slice(at + 1);
  const end = Date.now() + 1800;
  do {
    const matches = (await inbox()).filter(message => message.To.some(({ Address }) => {
      const split = Address.lastIndexOf('@');
      return Address.slice(0, split) === local && domainToUnicode(Address.slice(split + 1)) === domain;
    }));
    if (matches.length >= count) return matches;
    await delay(30);
  } while (Date.now() < end);
  assert.fail('Expected owned SMTP capture missing');
}
async function noMailFor(email) {
  const messages = await inbox();
  assert.ok(!messages.some(message => message.To.some(({ Address }) => Address.toLowerCase() === email.toLowerCase())), 'no mail issued');
}

test('D2 registration accepts durably, sends actual Spanish verification asynchronously and never auto-signs in', async () => {
  const email = 'New.Name+tag@example.test';
  await accepted(await register(email));
  assert.deepEqual(await (await send('/auth/session')).json(), { authenticated: false });
  const messages = await captured(email); assert.equal(messages.length, 1);
  const message = await (await fetch(`${process.env.P33_OWNED_INBOX}/api/v1/message/${messages[0].ID}`)).json();
  for (const body of [message.Text, message.HTML]) {
    assert.ok(body.includes(`${origin}/verify-email#token=`), 'trusted fragment link'); assert.ok(body.includes('1 hora'), 'Spanish lifetime');
    const token = /#token=([A-Za-z0-9_-]{43})/.exec(body)?.[1]; assert.ok(Boolean(token), 'canonical random verifier');
    assert.ok(!body.includes('?token='));
  }
  const response = await login(email); assert.equal(response.status, 200);
  const state = await response.json(); assert.ok(state.user.email === email, 'original delivery spelling'); assert.equal(state.user.emailVerified, false);
  assert.deepEqual(Object.keys(state.user).sort(), ['accountRole', 'avatarKey', 'email', 'emailVerified', 'firstName', 'id', 'lastName']);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  await error(await send('/account', { cookie }), 403, 'EMAIL_VERIFICATION_REQUIRED');
  await status(await send('/classrooms', { cookie }), 404);
});
test('D2 raw Unicode password 16/128 and raw names 80 accepted; quoted/international worker SMTP preserves spelling', async () => {
  for (const [email, raw, firstName] of [['"MiXeD Name+tag"@example.test', '😀'.repeat(16), ` ${'x'.repeat(78)} `], ['Üser.Name+tag@bücher.test', '😀'.repeat(128), '😀'.repeat(80)]]) {
    await accepted(await register(` ${email} `, { password: raw, firstName }));
    assert.equal((await captured(email)).length, 1);
    const response = await login(email, raw); assert.equal(response.status, 200);
    const user = (await response.json()).user;
    assert.ok(user.email === email, 'delivery input retained independently of wire encoding'); assert.ok(user.firstName === firstName, 'raw name preserved');
  }
});
test('D2 validates full exact registration shape and raw boundaries before issuance, uppercase domain never accepted', async () => {
  const invalid = [{ password: 'x'.repeat(15) }, { password: 'x'.repeat(129) }, { password: '\ud800'.repeat(16) }, { firstName: 'x'.repeat(81) }, { lastName: ` ${'x'.repeat(79)} ` }, { firstName: ' '.repeat(80) }, { lastName: '\t' }, { role: 'teacher' }, { email: 'Reject@EXAMPLE.test' }, { email: 'Reject@Bücher.test' }, { email: 'bad\n@example.test' }, { email: 'Display Name <a@example.test>' }];
  for (let i = 0; i < invalid.length; i++) {
    const email = `Rejected${i}@example.test`;
    await error(await register(email, invalid[i]), 422, 'VALIDATION_ERROR');
    await error(await login(email), 401, 'AUTHENTICATION_FAILED'); await noMailFor(email);
  }
  for (const body of ['{}', '[]', 'null', '{']) await error(await send('/auth/register', { method: 'POST', body }), 422, 'VALIDATION_ERROR');
});
test('D2 duplicate is generic and preserves original verified profile/password/session; issues no extra mail', async () => {
  const cookie = await session();
  await accepted(await register('vERIFIED@example.test', { firstName: 'Changed', lastName: 'Changed', password: replacement }));
  await error(await login('Verified@example.test', replacement), 401, 'AUTHENTICATION_FAILED');
  await status(await login('Verified@example.test'), 200);
  const profile = await (await send('/account', { cookie })).json();
  assert.equal(profile.id, verified); assert.equal(profile.firstName, 'Original'); assert.equal(profile.emailVerified, true);
  await noMailFor('Verified@example.test');
  // Duplicate of a freshly issued unverified account must not replace its current mail/token.
  await accepted(await register('nEW.nAME+TAG@example.test', { password: replacement }));
  assert.equal((await captured('New.Name+tag@example.test')).length, 1);
  await error(await login('New.Name+tag@example.test', replacement), 401, 'AUTHENTICATION_FAILED');
});
test('D2 concurrent case variants across API instances commit one account and current issuance without conflict 503', async () => {
  const a = await start(), b = await start();
  try {
    const variants = ['Concurrent@example.test', 'cONCURRENT@example.test'];
    const results = await Promise.all(variants.map((email, i) => register(email, { firstName: `Winner${i}` }, { target: i ? a.base : b.base })));
    for (const result of results) await accepted(result);
    const first = await login(variants[0]); const second = await login(variants[1]);
    const u = (await first.json()).user, v = (await second.json()).user;
    assert.equal(u.id, v.id); assert.ok(variants.includes(u.email), 'winning delivery spelling');
    assert.equal((await captured(u.email)).length, 1);
  } finally { await close(a.app); await close(b.app); }
});
test('D2 default shared canonical identifier budget applies equally before existence and has positive Retry-After', async () => {
  const a = await start({ AUTH_RATE_LIMITS_JSON: undefined }), b = await start({ AUTH_RATE_LIMITS_JSON: undefined });
  try {
    for (const email of ['LimitedNew@example.test', 'Unverified@example.test']) {
      await accepted(await register(email, {}, { target: a.base }));
      const limited = await register(email.toLowerCase(), {}, { target: b.base });
      await error(limited, 429, 'RATE_LIMITED'); assert.ok(Number(limited.headers.get('retry-after')) > 0);
    }
    const pair = await Promise.all(['BudgetRace@example.test', 'bUDGETRACE@example.test'].map(email => register(email, {}, { target: a.base })));
    assert.deepEqual(pair.map(r => r.status).sort(), [202, 429]); for (const r of pair) await r.arrayBuffer();
  } finally { await close(a.app); await close(b.app); }
});
test('D2 registration IP admission is shared for distinct nonexistent identifiers', async () => {
  const constrained = JSON.stringify({ registration: { ip: { limit: 1, windowSeconds: 60 } } });
  const a = await start({ AUTH_RATE_LIMITS_JSON: constrained }), b = await start({ AUTH_RATE_LIMITS_JSON: constrained });
  try {
    // Fresh HMAC namespace is not needed: earlier registration attempts already consumed this IP.
    const response = await register('IpUnknown@example.test', {}, { target: b.base });
    await error(response, 429, 'RATE_LIMITED'); assert.ok(Number(response.headers.get('retry-after')) > 0);
    await noMailFor('IpUnknown@example.test');
  } finally { await close(a.app); await close(b.app); }
});
test('D2 rollback seam runs after actual user/token/encrypted job writes; HTTP login and inbox prove atomic rollback', async () => {
  let reached = 0;
  const a = await start({}, { identity: { beforeRegistrationCommit: async () => { reached++; throw new Error('controlled rollback'); } } });
  try {
    await error(await register('Rollback@example.test', {}, { target: a.base }), 503, 'SERVICE_UNAVAILABLE');
    assert.equal(reached, 1); await error(await login('Rollback@example.test'), 401, 'AUTHENTICATION_FAILED');
    await delay(150); await noMailFor('Rollback@example.test');
    await accepted(await register('Rollback@example.test')); assert.equal((await captured('Rollback@example.test')).length, 1);
  } finally { await close(a.app); }
});
test('D2 profile GET/PATCH require verified persisted session and whitelist own identity only', async () => {
  for (const method of ['GET', 'PATCH']) {
    await error(await send('/account', { method, ...(method === 'PATCH' ? { body: { firstName: 'Blocked' } } : {}) }), 401, 'AUTH_REQUIRED');
    const cookie = await session(unverified);
    await error(await send('/account', { method, cookie, csrf: await csrf(cookie), ...(method === 'PATCH' ? { body: { firstName: 'Blocked' } } : {}) }), 403, 'EMAIL_VERIFICATION_REQUIRED');
  }
  const cookie = await session(); const token = await csrf(cookie);
  const response = await send('/account', { cookie }); assert.equal(response.status, 200); security(response);
  const original = await response.json(); assert.equal(original.id, verified);
  const changed = await send('/account', { method: 'PATCH', cookie, csrf: token, body: { firstName: '😀'.repeat(80) } });
  assert.equal(changed.status, 200); security(changed);
  const user = await changed.json(); assert.equal(user.lastName, original.lastName); assert.ok(user.email === original.email, 'email remains read-only');
  assert.deepEqual(Object.keys(user).sort(), ['accountRole', 'avatarKey', 'email', 'emailVerified', 'firstName', 'id', 'lastName']);
  assert.ok(user.firstName === '😀'.repeat(80));
  const second = await send('/account', { method: 'PATCH', cookie, csrf: token, body: { firstName: original.firstName, lastName: 'Family' } });
  assert.equal(second.status, 200); assert.equal((await second.json()).lastName, 'Family');
});
test('D2 patch rejects unknown email/role/password, empty and invalid names without changing profile', async () => {
  const cookie = await session(); const token = await csrf(cookie);
  const before = await (await send('/account', { cookie })).json();
  for (const body of [{}, { email: 'other@example.test' }, { role: 'teacher' }, { password: replacement }, { firstName: 'x'.repeat(81) }, { lastName: ` ${'x'.repeat(79)} ` }, { firstName: ' '.repeat(80) }, { firstName: '\ud800' }]) {
    await error(await send('/account', { method: 'PATCH', cookie, csrf: token, body }), 422, 'VALIDATION_ERROR');
    assert.ok(JSON.stringify(await (await send('/account', { cookie })).json()) === JSON.stringify(before), 'profile unchanged after rejection');
  }
});
test('D2 mutations enforce Origin/CSRF even public registration with valid cookie and preserve D1 logout behavior', async () => {
  const cookie = await session(); const token = await csrf(cookie);
  for (const [path, method, body] of [['/auth/register', 'POST', input('CookieRejected@example.test')], ['/account', 'PATCH', { firstName: 'Blocked' }]]) {
    for (const Origin of ['', 'null', 'https://attacker.test']) await error(await send(path, { method, body, cookie, csrf: token, headers: { Origin } }), 403, 'ORIGIN_NOT_ALLOWED');
    await error(await send(path, { method, body, cookie }), 403, 'CSRF_INVALID');
    await error(await send(path, { method, body, cookie, csrf: generateVerifier() }), 403, 'CSRF_INVALID');
  }
  await noMailFor('CookieRejected@example.test');
  await accepted(await register('CookieAccepted@example.test', {}, { cookie, csrf: token }));
  await error(await send('/auth/logout', { method: 'POST', cookie }), 403, 'CSRF_INVALID');
  const response = await send('/auth/logout', { method: 'POST', cookie, csrf: token }); await status(response, 204);
  await status(await send('/auth/logout', { method: 'POST' }), 204);
});
test('D2 media/16KiB/error transport is scoped to actual new operations', async () => {
  for (const [path, method] of [['/auth/register', 'POST'], ['/account', 'PATCH']]) {
    const cookie = await session(); const token = await csrf(cookie);
    await error(await send(path, { method, cookie, csrf: token, body: {}, headers: { 'Content-Type': 'text/plain' } }), 415, 'MEDIA_TYPE_UNSUPPORTED');
    await error(await send(path, { method, cookie, csrf: token, body: ' '.repeat(16385) }), 413, 'REQUEST_TOO_LARGE');
  }
  await status(await send('/account/password', { method: 'POST', body: {} }), 401);
});
test('D2 authorized GET/PATCH renew idle, rejected patches and safe reads do not; absolute lifetime never extends', async () => {
  const get = await session(verified, { idle: -1798.5 }), patch = await session(verified, { idle: -1798.5 });
  const rejected = await session(verified, { idle: -1798.5 }), safe = await session(verified, { idle: -1798.5 });
  const absolute = await session(verified, { absolute: 1.5 });
  const pt = await csrf(patch), rt = await csrf(rejected);
  await status(await send('/account', { cookie: get }), 200);
  await status(await send('/account', { method: 'PATCH', cookie: patch, csrf: pt, body: { firstName: 'Active' } }), 200);
  await error(await send('/account', { method: 'PATCH', cookie: rejected, csrf: rt, body: { email: 'rejected@example.test' } }), 422, 'VALIDATION_ERROR');
  await status(await send('/account', { cookie: absolute }), 200);
  for (const path of ['/auth/session', '/auth/csrf', '/health/live']) await status(await send(path, { cookie: safe }), 200);
  await delay(1600);
  for (const cookie of [get, patch]) assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, true);
  for (const cookie of [rejected, safe, absolute]) assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, false);
});
test('D2 persisted session is rechecked under user lock before patch, not trusted from initial cookie read', async () => {
  const cookie = await session(); const token = await csrf(cookie);
  let reached, release;
  const gate = new Promise(resolve => { release = resolve; }); const observed = new Promise(resolve => { reached = resolve; });
  const a = await start({}, { identity: { beforeProfileCommit: async () => { reached(); await gate; } } });
  const pending = send('/account', { method: 'PATCH', body: { firstName: 'MustNotPersist' }, cookie, csrf: token, target: a.base });
  try {
    await Promise.race([observed, delay(1500).then(() => { throw new Error('profile boundary not reached'); })]);
    // Owned competing writer is arrangement, never a post-request storage assertion.
    await db.query('BEGIN'); await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [verified]);
    await db.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1', [verified]); await db.query('COMMIT');
  } finally { release(); }
  try {
    await error(await pending, 401, 'AUTH_REQUIRED');
    const fresh = await session(); const profile = await (await send('/account', { cookie: fresh })).json(); assert.notEqual(profile.firstName, 'MustNotPersist');
  } finally { await close(a.app); }
});
test('D2 SMTP failure stays durably queued, resumes through existing C retry without startup dependency', async () => {
  const peer = await createSmtpFixture({ rejectData: true });
  const a = await start({ MAIL_SMTP_PORT: String(peer.port) });
  try {
    // Stop other schedulers so this real failing sender exclusively handles the new job.
    for (const app of apps) if (app !== a.app) await app.get(IdentityRuntime).stopMail();
    await accepted(await register('Queued@example.test', {}, { target: a.base }));
    await Promise.race([peer.dataReceived, delay(1500).then(() => { throw new Error('actual SMTP attempt absent'); })]);
    await delay(100); await noMailFor('Queued@example.test');
    await status(await login('Queued@example.test', password, { target: a.base }), 200);
  } finally { await close(a.app); await peer.close(); }
  const healthy = await start();
  try { assert.equal((await captured('Queued@example.test')).length, 1); } finally { await close(healthy.app); }
});
test('D2 shutdown drains a real in-flight sender before pool teardown and stops new nonoverlapping ticks', async () => {
  const peer = await createSmtpFixture({ stallData: true }); const a = await start({ MAIL_SMTP_PORT: String(peer.port) });
  try {
    await accepted(await register('Shutdown@example.test', {}, { target: a.base }));
    await Promise.race([peer.dataReceived, delay(1500).then(() => { throw new Error('in-flight SMTP absent'); })]);
    const closing = close(a.app); let closed = false; void closing.then(() => { closed = true; });
    await delay(120); assert.equal(closed, false, 'close waits for active worker/sender'); assert.equal(peer.connections, 1, 'no overlapping sends');
    // Independent SMTP peer closing its connection completes the failure promptly.
    await peer.close(); await closing; assert.equal(closed, true);
  } finally { if (apps.has(a.app)) await close(a.app); await peer.close().catch(() => {}); }
});
test('D2 real counter and SQL outages return sanitized 503 and retain independent health semantics', async () => {
  const a = await start();
  try {
    await db.query('BEGIN'); await db.query('LOCK TABLE account_action_controls IN ACCESS EXCLUSIVE MODE');
    try { await error(await register('CounterFailure@example.test', {}, { target: a.base }), 503, 'SERVICE_UNAVAILABLE'); }
    finally { await db.query('ROLLBACK'); }
    await noMailFor('CounterFailure@example.test');
    const cookie = await session();
    execFileSync('docker', ['pause', process.env.FOXMIND_API_TEST_CONTAINER], { stdio: 'pipe', timeout: 2000 });
    try {
      await error(await register('SqlFailure@example.test', {}, { target: a.base }), 503, 'SERVICE_UNAVAILABLE');
      await error(await send('/account', { cookie, target: a.base }), 503, 'SERVICE_UNAVAILABLE');
      await status(await send('/health/live', { target: a.base }), 200);
      await status(await send('/health/ready', { target: a.base }), 503);
    } finally { execFileSync('docker', ['unpause', process.env.FOXMIND_API_TEST_CONTAINER], { stdio: 'pipe', timeout: 2000 }); }
    await noMailFor('SqlFailure@example.test');
  } finally { await close(a.app); }
});
