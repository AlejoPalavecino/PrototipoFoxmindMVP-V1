import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { createApplication } from '../.build/api/apps/api/src/application.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { createPasswordService, generateVerifier, accountTokenDigest, sessionTokenDigest } from '../.build/api/apps/api/src/identity-security/index.js';
import { IdentityRuntime } from '../.build/api/apps/api/src/identity/index.js';

if (process.send) { process.send({ type: 'foxmind-test-ready' }); process.disconnect(); }
if (!/^foxmind-identity-[a-f0-9]+$/.test(process.env.P33_IDENTITY_ISOLATED ?? '')
  || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.P33_OWNED_INBOX ?? '')) throw new Error('Owned verification runner required');
const origin = 'http://127.0.0.1:3000';
const password = 'Only a fixture password 😀';
const confirmPath = '/auth/email-verification/confirm', resendPath = '/auth/email-verification/resend';
const apps = new Set();
let db, base, hash, sequence = 0;
// Only unrelated registration/login/general budgets are widened. T3 budgets/TTLs are real defaults.
const rates = JSON.stringify({ registration: { ip: { limit: 100 }, identifier: { limit: 100 } },
  login: { ip: { limit: 100 }, identifier: { limit: 100 } },
  'general-identity': { ip: { limit: 1000 }, session: { limit: 1000 } } });
async function start(overrides = {}) {
  const app = await createApplication(readConfiguration({ ...process.env, AUTH_RATE_LIMITS_JSON: rates, ...overrides }));
  apps.add(app); await app.listen(0, '127.0.0.1');
  return { app, base: `http://127.0.0.1:${app.getHttpServer().address().port}` };
}
async function close(app) { await app.close(); apps.delete(app); }
before(async () => {
  db = new pg.Client({ connectionString: process.env.DATABASE_URL, query_timeout: 2000 }); await db.connect();
  hash = await (await createPasswordService()).hash(password);
  ({ base } = await start());
});
after(async () => { for (const app of apps) await app.close(); if (db) await db.end(); });
async function send(path, { method = 'GET', body, cookie, csrf, headers = {}, target = base, omitOrigin = false } = {}) {
  return fetch(`${target}/api/v1${path}`, { method,
    headers: { ...(method !== 'GET' ? { ...(!omitOrigin ? { Origin: origin } : {}), 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(4000) });
}
const confirm = (token, options = {}) => send(confirmPath, { method: 'POST', body: { token }, ...options });
const resend = (options = {}) => send(resendPath, { method: 'POST', ...options });
function security(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('x-request-id') ?? '', /^[a-f0-9-]{36}$/);
}
async function error(response, status, code) {
  assert.equal(response.status, status); security(response);
  const value = await response.json(); assert.deepEqual(Object.keys(value), ['error']);
  assert.deepEqual(Object.keys(value.error).sort(), ['code', 'requestId']);
  assert.equal(value.error.code, code); assert.equal(value.error.requestId, response.headers.get('x-request-id'));
  assert.equal(response.headers.get('set-cookie'), null, 'rejection does not rotate active cookie');
}
async function success(response, status, value) {
  assert.equal(response.status, status); security(response); assert.deepEqual(await response.json(), value);
}
async function accepted(response) {
  await success(response, 202, { status: 'accepted' }); assert.equal(response.headers.get('set-cookie'), null);
}
async function state(cookie, target = base) { return (await send('/auth/session', { cookie, target })).json(); }
async function csrf(cookie, target = base) { return (await (await send('/auth/csrf', { cookie, target })).json()).csrfToken; }
async function inbox() {
  const response = await fetch(`${process.env.P33_OWNED_INBOX}/api/v1/messages`, { signal: AbortSignal.timeout(1000) });
  assert.equal(response.status, 200); return (await response.json()).messages;
}
async function messages(email) { return (await inbox()).filter(m => m.To.some(to => to.Address === email)); }
async function captured(email, count = 1) {
  const end = Date.now() + 1800;
  do {
    const found = await messages(email);
    if (found.length >= count) {
      assert.equal(found.length, count, 'exact issuance mail count');
      const message = await (await fetch(`${process.env.P33_OWNED_INBOX}/api/v1/message/${found[0].ID}`)).json();
      const token = /#token=([A-Za-z0-9_-]{43})/.exec(message.Text)?.[1];
      assert.ok(Boolean(token), 'actual SMTP contains canonical proof');
      assert.ok(message.Text.includes(`${origin}/verify-email#token=`), 'trusted fragment, not backend/query');
      assert.ok(message.Text.includes('1 hora'), 'fixed lifetime');
      return token;
    }
    await delay(25);
  } while (Date.now() < end);
  assert.fail('Expected owned verification capture missing');
}
async function registered() {
  const email = `Captured${++sequence}@example.test`;
  await accepted(await send('/auth/register', { method: 'POST', body: { email, password, firstName: 'Original', lastName: 'Learner', accountRole: 'student' } }));
  const token = await captured(email);
  const response = await send('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(response.status, 200);
  const user = (await response.json()).user, cookie = response.headers.get('set-cookie').split(';')[0];
  return { email, token, id: user.id, cookie, csrf: await csrf(cookie) };
}
async function seed({ verified = false, purpose = 'EMAIL_VERIFICATION', age = 61, expiry = 3600, invalidated = false, consumed = false } = {}) {
  const id = randomUUID(), token = generateVerifier(), tokenId = randomUUID(), email = `Seed${++sequence}@example.test`;
  await db.query(`INSERT INTO users(id,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,$2,lower($2),'Original','Learner',$3,CASE WHEN $4 THEN clock_timestamp() ELSE NULL END,'student')`, [id, email, hash, verified]);
  await db.query(`INSERT INTO account_tokens(id,user_id,purpose,token_hash,created_at,expires_at,invalidated_at,consumed_at)
    VALUES($1,$2,$3,$4,clock_timestamp()-$5*interval '1 second',clock_timestamp()+$6*interval '1 second',
      CASE WHEN $7 THEN clock_timestamp() ELSE NULL END,CASE WHEN $8 THEN clock_timestamp() ELSE NULL END)`,
  [tokenId, id, purpose, accountTokenDigest(purpose, token), age, expiry, invalidated, consumed]);
  const cookie = await session(id);
  return { id, tokenId, token, email, cookie, csrf: await csrf(cookie) };
}
async function session(id, { absolute = 43200, idle = 0 } = {}) {
  const raw = generateVerifier();
  await db.query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at)
    VALUES($1,$2,$3,clock_timestamp()+$4*interval '1 second',clock_timestamp()+$5*interval '1 second')`,
  [randomUUID(), id, sessionTokenDigest(raw), absolute, idle]);
  return `foxmind_session=${raw}`;
}
async function unchanged(subject, mailCount = 0) {
  const current = await state(subject.cookie);
  assert.equal(current.authenticated, true); assert.equal(current.user.id, subject.id);
  assert.equal(current.user.emailVerified, false); assert.equal(current.user.firstName, 'Original');
  assert.ok(await csrf(subject.cookie) === subject.csrf, 'binding unchanged');
  assert.equal((await messages(subject.email)).length, mailCount, 'rejection issued no mail');
}
async function age(subject, seconds) {
  // Owned setup only: retain encrypted outbox expiry/AAD and move the successful issuance anchor.
  await db.query(`UPDATE account_tokens SET created_at=clock_timestamp()-$2*interval '1 second'
    WHERE user_id=$1 AND purpose='EMAIL_VERIFICATION'`, [subject.id, seconds]);
}

// S2/S5/S6/S7: first eight cases form the immutable confirm group.
test('T3 confirm actual captured token verifies anonymously without login, enrollment or mail', async () => {
  const subject = await registered();
  const response = await confirm(subject.token);
  await success(response, 200, { status: 'verified' }); assert.equal(response.headers.get('set-cookie'), null);
  assert.deepEqual(await state(), { authenticated: false });
  const current = await state(subject.cookie); assert.equal(current.user.id, subject.id); assert.equal(current.user.emailVerified, true);
  assert.equal((await messages(subject.email)).length, 1);
  const profile = await send('/account', { cookie: subject.cookie }); assert.equal(profile.status, 200);
  assert.equal((await profile.json()).firstName, 'Original');
  const classroom = await send('/classrooms', { cookie: subject.cookie }); assert.equal(classroom.status, 404); await classroom.arrayBuffer();
});
test('T3 confirm same-user rotates cookie and CSRF while original absolute deadline survives', async () => {
  const subject = await registered(), cookie = await session(subject.id, { absolute: 1.8 });
  const oldCsrf = await csrf(cookie);
  const response = await confirm(subject.token, { cookie, csrf: oldCsrf });
  await success(response, 200, { status: 'verified' });
  const header = response.headers.get('set-cookie'), rotated = header?.split(';')[0];
  assert.ok(Boolean(rotated) && rotated !== cookie, 'opaque session rotates');
  assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/); assert.match(header, /Path=\//); assert.doesNotMatch(header, /Domain=/);
  assert.ok(Number(/Max-Age=(\d+)/.exec(header)?.[1]) <= 1, 'cookie does not gain a fresh 12h');
  assert.deepEqual(await state(cookie), { authenticated: false });
  const freshCsrf = await csrf(rotated); assert.ok(freshCsrf !== oldCsrf, 'CSRF rotates');
  await error(await resend({ cookie: rotated, csrf: oldCsrf }), 403, 'CSRF_INVALID');
  await error(await resend({ cookie: rotated, csrf: freshCsrf }), 409, 'EMAIL_ALREADY_VERIFIED');
  await delay(1850);
  assert.deepEqual(await state(rotated), { authenticated: false }, 'original absolute expiration retained');
  assert.equal((await state(subject.cookie)).user.emailVerified, true, 'other device remains signed in');
});
test('T3 confirm wrong signed-in user preserves both identities and leaves captured proof usable', async () => {
  const owner = await registered(), other = await seed();
  await error(await confirm(owner.token, { cookie: other.cookie, csrf: other.csrf }), 400, 'LINK_INVALID');
  await unchanged(owner, 1); await unchanged(other);
  await success(await confirm(owner.token), 200, { status: 'verified' });
  await unchanged(other);
});
test('T3 confirm wrong-purpose expired consumed invalidated and unknown reject without observable mutation', async () => {
  for (const options of [{ purpose: 'PASSWORD_RESET' }, { expiry: 0 }, { consumed: true }, { invalidated: true }]) {
    const subject = await seed(options);
    await error(await confirm(subject.token, { cookie: subject.cookie, csrf: subject.csrf }), 400, 'LINK_INVALID');
    await unchanged(subject);
    // Rejection did not move successful issuance time or prevent a replacement at the allowed boundary.
    await accepted(await resend({ cookie: subject.cookie, csrf: subject.csrf }));
    const replacement = await captured(subject.email);
    await success(await confirm(replacement), 200, { status: 'verified' });
  }
  const subject = await seed();
  await error(await confirm(generateVerifier(), { cookie: subject.cookie, csrf: subject.csrf }), 400, 'LINK_INVALID');
  await unchanged(subject); await success(await confirm(subject.token), 200, { status: 'verified' });
});
test('T3 confirm malformed shape media Origin and conditional CSRF preserve original proof and binding', async () => {
  const subject = await registered();
  for (const options of [{ omitOrigin: true }, { headers: { Origin: 'null' } }, { headers: { Origin: 'https://attacker.test' } }]) {
    await error(await confirm(subject.token, options), 403, 'ORIGIN_NOT_ALLOWED');
  }
  for (const token of [undefined, generateVerifier()]) await error(await confirm(subject.token, { cookie: subject.cookie, csrf: token }), 403, 'CSRF_INVALID');
  for (const body of [{}, [], null, { token: subject.token, extra: true }, { token: 1 }, { token: 'short' }, { token: '!'.repeat(43) }, { token: 'A'.repeat(42) + 'B' }, '{']) {
    await error(await send(confirmPath, { method: 'POST', body: body === null ? 'null' : body }), 422, 'VALIDATION_ERROR');
  }
  await error(await confirm(subject.token, { headers: { 'Content-Type': 'text/plain' } }), 415, 'MEDIA_TYPE_UNSUPPORTED');
  await error(await send(confirmPath, { method: 'POST', body: ' '.repeat(16385) }), 413, 'REQUEST_TOO_LARGE');
  await unchanged(subject, 1);
  await success(await confirm(subject.token), 200, { status: 'verified' });
});
test('T3 confirm duplicate race across API instances consumes exactly once and replay stays invalid', async () => {
  const subject = await registered(), a = await start();
  try {
    const pair = await Promise.all([confirm(subject.token), confirm(subject.token, { target: a.base })]);
    assert.deepEqual(pair.map(r => r.status).sort(), [200, 400]);
    for (const r of pair) r.status === 200 ? await success(r, 200, { status: 'verified' }) : await error(r, 400, 'LINK_INVALID');
    await error(await confirm(subject.token), 400, 'LINK_INVALID');
    assert.equal((await state(subject.cookie)).user.emailVerified, true);
    assert.equal((await messages(subject.email)).length, 1); assert.deepEqual(await state(), { authenticated: false });
  } finally { await close(a.app); }
});
test('T3 confirm shared redemption IP budget gives generic positive Retry-After without consuming proof', async () => {
  const subject = await registered();
  // Existing attempts have already consumed this IP; a smaller operational limit proves shared admission.
  const limited = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ 'token-redemption': { ip: { limit: 1 } } }) });
  try {
    const response = await confirm(subject.token, { target: limited.base, headers: { 'X-Forwarded-For': '203.0.113.99' } });
    await error(response, 429, 'RATE_LIMITED'); assert.ok(Number(response.headers.get('retry-after')) > 0);
    await unchanged(subject, 1);
    await success(await confirm(subject.token), 200, { status: 'verified' });
  } finally { await close(limited.app); }
});
test('T3 confirm rotation preserves idle deadline and rejected confirmation does not refresh it', async () => {
  const subject = await seed(), cookie = await session(subject.id, { idle: -1798.5 });
  const originalCsrf = await csrf(cookie);
  const response = await confirm(subject.token, { cookie, csrf: originalCsrf });
  await success(response, 200, { status: 'verified' });
  const rotated = response.headers.get('set-cookie')?.split(';')[0]; assert.ok(Boolean(rotated));
  await delay(1550);
  assert.deepEqual(await state(rotated), { authenticated: false }, 'confirmation is not idle-renewing activity');
});

// S2/S5/S6/S7: next eight cases form the immutable resend group.
test('T3 resend requires session exact Origin CSRF empty shape media and 16KiB without issuing', async () => {
  const subject = await seed();
  await error(await resend(), 401, 'AUTH_REQUIRED');
  for (const options of [{ omitOrigin: true }, { headers: { Origin: 'null' } }, { headers: { Origin: 'https://attacker.test' } }]) {
    await error(await resend({ cookie: subject.cookie, csrf: subject.csrf, ...options }), 403, 'ORIGIN_NOT_ALLOWED');
  }
  for (const token of [undefined, generateVerifier()]) await error(await resend({ cookie: subject.cookie, csrf: token }), 403, 'CSRF_INVALID');
  for (const body of [{ token: subject.token }, [], 'null', '{']) await error(await resend({ cookie: subject.cookie, csrf: subject.csrf, body }), 422, 'VALIDATION_ERROR');
  await error(await resend({ cookie: subject.cookie, csrf: subject.csrf, body: {}, headers: { 'Content-Type': 'text/plain' } }), 415, 'MEDIA_TYPE_UNSUPPORTED');
  await error(await resend({ cookie: subject.cookie, csrf: subject.csrf, body: ' '.repeat(16385) }), 413, 'REQUEST_TOO_LARGE');
  await unchanged(subject);
  await success(await confirm(subject.token), 200, { status: 'verified' });
});
test('T3 resend 59s denied 60s accepted and rejected attempts never restart successful cooldown', async () => {
  const subject = await registered(); await age(subject, 59);
  const denied = await resend({ cookie: subject.cookie, csrf: subject.csrf });
  await error(denied, 429, 'RATE_LIMITED'); assert.equal(Number(denied.headers.get('retry-after')), 1);
  await unchanged(subject, 1);
  // Exact SQL fixture boundary: elapsed time after setup makes >=60s, without sleeping a minute.
  await age(subject, 60);
  await accepted(await resend({ cookie: subject.cookie, csrf: subject.csrf }));
  const replacement = await captured(subject.email, 2);
  assert.ok(replacement !== subject.token, 'fresh CSPRNG proof');
  await error(await confirm(subject.token), 400, 'LINK_INVALID');
  const again = await resend({ cookie: subject.cookie, csrf: subject.csrf });
  await error(again, 429, 'RATE_LIMITED'); assert.ok(Number(again.headers.get('retry-after')) >= 59);
  await success(await confirm(replacement), 200, { status: 'verified' });
});
test('T3 resend verified user gets exact conflict and cannot replace any proof or session', async () => {
  const subject = await seed({ verified: true });
  await error(await resend({ cookie: subject.cookie, csrf: subject.csrf }), 409, 'EMAIL_ALREADY_VERIFIED');
  const current = await state(subject.cookie); assert.equal(current.user.id, subject.id); assert.equal(current.user.emailVerified, true);
  assert.ok(await csrf(subject.cookie) === subject.csrf, 'binding unchanged'); assert.equal((await messages(subject.email)).length, 0);
});
test('T3 resend user attempt budget shared across devices is distinct from successful issuance anchor', async () => {
  const subject = await seed({ age: 0 }), secondCookie = await session(subject.id), a = await start();
  try {
    for (let i = 0; i < 5; i++) {
      const response = await resend({ cookie: i % 2 ? secondCookie : subject.cookie,
        csrf: i % 2 ? await csrf(secondCookie, a.base) : subject.csrf, target: i % 2 ? a.base : base });
      await error(response, 429, 'RATE_LIMITED'); assert.ok(Number(response.headers.get('retry-after')) > 0);
    }
    await age(subject, 60);
    const limited = await resend({ cookie: subject.cookie, csrf: subject.csrf, target: a.base });
    await error(limited, 429, 'RATE_LIMITED'); assert.ok(Number(limited.headers.get('retry-after')) > 60);
    await unchanged(subject);
    // Attempt budget denial never invalidates the previous still-current proof.
    await success(await confirm(subject.token), 200, { status: 'verified' });
  } finally { await close(a.app); }
});
test('T3 resend IP limits are shared ignore forwarded headers and preserve existing link', async () => {
  const subject = await seed(), a = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ 'verification-resend': { ip: { limit: 1 } } }) });
  try {
    const response = await resend({ cookie: subject.cookie, csrf: subject.csrf, target: a.base, headers: { 'X-Forwarded-For': '203.0.113.77' } });
    await error(response, 429, 'RATE_LIMITED'); assert.ok(Number(response.headers.get('retry-after')) > 0);
    await unchanged(subject); await success(await confirm(subject.token), 200, { status: 'verified' });
  } finally { await close(a.app); }
});
test('T3 resend and consumption serialize across instances without resurrecting invalid proof', async () => {
  const subject = await registered(), a = await start(); await age(subject, 60);
  try {
    const [issued, redeemed] = await Promise.all([
      resend({ cookie: subject.cookie, csrf: subject.csrf, target: a.base }), confirm(subject.token),
    ]);
    if (issued.status === 202) {
      await accepted(issued); await error(redeemed, 400, 'LINK_INVALID');
      const replacement = await captured(subject.email, 2);
      await error(await confirm(subject.token), 400, 'LINK_INVALID');
      await success(await confirm(replacement), 200, { status: 'verified' });
    } else {
      await error(issued, 409, 'EMAIL_ALREADY_VERIFIED'); await success(redeemed, 200, { status: 'verified' });
      assert.equal((await messages(subject.email)).length, 1);
    }
    assert.equal((await state(subject.cookie)).user.emailVerified, true);
    assert.deepEqual(await state(), { authenticated: false });
  } finally { await close(a.app); }
});
test('T3 resend enqueue outage rolls back issuance and cooldown and preserves prior current proof', async () => {
  // Stop actual schedulers before owned SQL contention; no SMTP occurs inside the request transaction.
  for (const app of apps) await app.get(IdentityRuntime).stopMail();
  const prior = await seed(), noCurrent = await seed({ invalidated: true });
  for (const subject of [prior, noCurrent]) {
    await db.query('BEGIN'); await db.query('LOCK TABLE background_jobs IN SHARE MODE');
    try {
      await error(await resend({ cookie: subject.cookie, csrf: subject.csrf }), 503, 'SERVICE_UNAVAILABLE');
    } finally { await db.query('ROLLBACK'); }
    await unchanged(subject);
  }
  // First case blocks cancellation; second has no active old token and blocks the actual encrypted enqueue.
  await success(await confirm(prior.token), 200, { status: 'verified' });
  await error(await confirm(noCurrent.token), 400, 'LINK_INVALID');
  const healthy = await start();
  try {
    await accepted(await resend({ cookie: noCurrent.cookie, csrf: noCurrent.csrf, target: healthy.base }));
    const replacement = await captured(noCurrent.email);
    await success(await confirm(replacement), 200, { status: 'verified' });
  } finally { await close(healthy.app); }
});
test('T3 resend two concurrent requests issue once cancel queued stale mail and renew only idle', async () => {
  const subject = await seed(), recovery = generateVerifier();
  // Purpose isolation: an unrelated recovery proof exists but must not authorize email confirmation.
  await db.query(`INSERT INTO account_tokens(id,user_id,purpose,token_hash,expires_at)
    VALUES($1,$2,'PASSWORD_RESET',$3,clock_timestamp()+interval '15 minutes')`, [randomUUID(), subject.id, accountTokenDigest('PASSWORD_RESET', recovery)]);
  const a = await start();
  await a.app.get(IdentityRuntime).stopMail();
  // The previous outage case stopped the original scheduler. Queue a real registration, then replace
  // its unsent encrypted job before a healthy sender starts. Only the replacement may reach SMTP.
  const email = `Queued${++sequence}@example.test`;
  await accepted(await send('/auth/register', { method: 'POST', body: { email, password, firstName: 'Original', lastName: 'Learner', accountRole: 'student' } }));
  const login = await send('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.status, 200);
  const queuedUser = (await login.json()).user, queuedCookie = login.headers.get('set-cookie').split(';')[0];
  await age({ id: queuedUser.id }, 60);
  await accepted(await resend({ cookie: queuedCookie, csrf: await csrf(queuedCookie) }));
  let healthy;
  try {
    const cookie = await session(subject.id, { idle: -1798.5, absolute: 3 }), binding = await csrf(cookie);
    const pair = await Promise.all([resend({ cookie, csrf: binding }), resend({ cookie, csrf: binding, target: a.base })]);
    assert.deepEqual(pair.map(r => r.status).sort(), [202, 429]);
    for (const r of pair) r.status === 202 ? await accepted(r) : await error(r, 429, 'RATE_LIMITED');
    healthy = await start();
    const replacement = await captured(subject.email);
    const queuedReplacement = await captured(email);
    await success(await confirm(queuedReplacement), 200, { status: 'verified' });
    await error(await confirm(subject.token), 400, 'LINK_INVALID');
    await error(await confirm(recovery), 400, 'LINK_INVALID');
    await delay(1550); assert.equal((await state(cookie)).authenticated, true, 'resend renews idle');
    assert.ok(await csrf(cookie) === binding, 'resend does not rotate');
    await success(await confirm(replacement), 200, { status: 'verified' });
    await delay(1500); assert.deepEqual(await state(cookie), { authenticated: false }, 'resend retains original absolute limit');
    assert.equal((await messages(email)).length, 1, 'stale queued registration mail was cancelled');
  } finally { if (healthy) await close(healthy.app); await close(a.app); }
});
