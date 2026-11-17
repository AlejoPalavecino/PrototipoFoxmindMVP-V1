import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { domainToASCII, domainToUnicode } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { createApplication } from '../.build/api/apps/api/src/application.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { createPasswordService } from '../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/passwords.js';
import { generateVerifier, accountTokenDigest, sessionTokenDigest } from '../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/verifiers.js';
import { IdentityRuntime } from '../.build/api/apps/api/src/bootstrap/identity-runtime.js';

if (process.send) { process.send({ type: 'foxmind-test-ready' }); process.disconnect(); }
if (!/^foxmind-identity-[a-f0-9]+$/.test(process.env.P33_IDENTITY_ISOLATED ?? '')
  || !/^http:\/\/127\.0\.0\.1:\d+$/.test(process.env.P33_OWNED_INBOX ?? '')) throw new Error('Owned recovery runner required');
const origin = 'http://127.0.0.1:3000';
const password = 'Only a fixture password 😀';
const replacementPassword = 'Replacement recovery password 😀';
const confirmPath = '/auth/password-recovery/confirm', requestPath = '/auth/password-recovery/request';
const apps = new Set();
let db, base, hash, sequence = 0;
// Only unrelated registration/login/general budgets are widened. T3 budgets/TTLs are real defaults.
const rates = JSON.stringify({ registration: { ip: { limit: 100 }, identifier: { limit: 100 } },
  login: { ip: { limit: 100 }, identifier: { limit: 100 } },
  'general-identity': { ip: { limit: 1000 }, session: { limit: 1000 } } });
async function start(overrides = {}, options = {}) {
  const app = await createApplication(readConfiguration({ ...process.env, AUTH_RATE_LIMITS_JSON: rates, ...overrides }), options);
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
const confirm = (token, options = {}) => send(confirmPath, { method: 'POST', body: { token, newPassword: replacementPassword }, ...options });
const requestRecovery = (email, options = {}) => send(requestPath, { method: 'POST', body: { email }, ...options });
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
async function messages(email) {
  const at = email.lastIndexOf('@'), local = email.slice(0, at), domain = email.slice(at + 1);
  // Reuse accepted SMTP wire equivalence only; never rewrite the stored account spelling/local part.
  return (await inbox()).filter(message => message.To.some(to => {
    const wireAt = to.Address.lastIndexOf('@'), wireDomain = to.Address.slice(wireAt + 1);
    return to.Address.slice(0, wireAt) === local && domainToUnicode(wireDomain) === domainToUnicode(domain)
      && [domain, domainToASCII(domain)].includes(wireDomain);
  }));
}
async function captured(email, count = 1, purpose = 'PASSWORD_RESET') {
  const end = Date.now() + 1800;
  do {
    const found = await messages(email);
    if (found.length >= count) {
      assert.equal(found.length, count, 'exact issuance mail count');
      const message = await (await fetch(`${process.env.P33_OWNED_INBOX}/api/v1/message/${found[0].ID}`)).json();
      const token = /#token=([A-Za-z0-9_-]{43})/.exec(message.Text)?.[1];
      assert.ok(Boolean(token), 'actual SMTP contains canonical proof');
      const route = purpose === 'PASSWORD_RESET' ? 'recover-password' : 'verify-email';
      assert.ok(message.Text.includes(`${origin}/${route}#token=`), 'trusted fragment, not backend/query');
      assert.ok(message.Text.includes(purpose === 'PASSWORD_RESET' ? '15 minutos' : '1 hora'), 'fixed lifetime');
      return token;
    }
    await delay(25);
  } while (Date.now() < end);
  assert.fail('Expected owned verification capture missing');
}
async function seed({ verified = false, purpose = 'PASSWORD_RESET', age = 61, expiry = 900, invalidated = false, consumed = false, email: deliveryEmail } = {}) {
  const id = randomUUID(), token = generateVerifier(), tokenId = randomUUID(), email = deliveryEmail ?? `Seed${++sequence}@example.test`;
  await db.query(`INSERT INTO users(id,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,$2,lower($2),'Original','Learner',$3,CASE WHEN $4 THEN clock_timestamp() ELSE NULL END,'student')`, [id, email, hash, verified]);
  await db.query(`INSERT INTO account_tokens(id,user_id,purpose,token_hash,created_at,expires_at,invalidated_at,consumed_at)
    VALUES($1,$2,$3,$4,clock_timestamp()-$5*interval '1 second',clock_timestamp()+$6*interval '1 second',
      CASE WHEN $7 THEN clock_timestamp() ELSE NULL END,CASE WHEN $8 THEN clock_timestamp() ELSE NULL END)`,
  [tokenId, id, purpose, accountTokenDigest(purpose, token), age, expiry, invalidated, consumed]);
  const cookie = await session(id);
  return { id, tokenId, token, email, cookie, verified, csrf: await csrf(cookie) };
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
  assert.deepEqual(current, { authenticated: true, user: { id: subject.id, email: subject.email,
    firstName: 'Original', lastName: 'Learner', emailVerified: subject.verified, accountRole: 'student', avatarKey: 'initials' } });
  assert.ok(await csrf(subject.cookie) === subject.csrf, 'binding unchanged');
  assert.equal((await messages(subject.email)).length, mailCount, 'rejection issued no mail');
}
async function age(seconds) {
  // Owned arrangement only: success marker is private; attempt clocks are untouched.
  await db.query(`UPDATE account_action_controls SET last_requested_at=clock_timestamp()-$1*interval '1 second',
    window_started_at=clock_timestamp()-interval '1 day' WHERE action='identity.v1:recovery-request:success'`, [seconds]);
}
const login = (subject, secret = password, options = {}) => send('/auth/login', {
  method: 'POST', body: { email: subject.email, password: secret }, ...options,
});
async function reset(response) {
  assert.equal(response.status, 204); security(response); assert.equal(await response.text(), '');
  const cookie = response.headers.get('set-cookie') ?? '';
  assert.match(cookie, /^foxmind_session=;/); assert.match(cookie, /Max-Age=0/);
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.doesNotMatch(cookie, /Domain=/);
}

// S3/S5/S6/S7: groups fixed before the first RED; no timing/rate bypass.
test('R request-core generic known and unknown wait for maintained work and preserve credentials', async () => {
  const subject = await seed(), unknown = `Unknown${++sequence}@example.test`;
  const runtime = [...apps][0].get(IdentityRuntime), original = runtime.passwords;
  let release, arrived, calls = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const blocked = new Promise(resolve => { arrived = resolve; });
  // Trusted dependency synchronization only: real maintained work still runs after release.
  runtime.passwords = { ...original, async dummyCheck(raw) {
    if (++calls === 2) arrived(true);
    await gate; return original.dummyCheck(raw);
  } };
  const pending = [requestRecovery(subject.email), requestRecovery(unknown)];
  let both;
  try { both = await Promise.race([blocked, Promise.race(pending).then(() => false)]); }
  finally { release(); }
  const responses = await Promise.all(pending); runtime.passwords = original;
  for (const response of responses) await accepted(response);
  assert.equal(both, true, 'neither public path may finish before the shared maintained work');
  const token = await captured(subject.email);
  assert.deepEqual(await state(), { authenticated: false });
  await unchanged(subject, 1); assert.equal((await messages(unknown)).length, 0);
  // Explicit later registration must create verification mail: recovery did not secretly create a user.
  await accepted(await send('/auth/register', { method: 'POST', body: { email: unknown, password, firstName: 'Original', lastName: 'Learner', accountRole: 'student' } }));
  await captured(unknown, 1, 'EMAIL_VERIFICATION');
  assert.equal((await login({ email: unknown })).status, 200);
  const signed = await login(subject); assert.equal(signed.status, 200);
  assert.equal((await signed.json()).user.emailVerified, false);
  await reset(await confirm(token));
  await error(await login(subject), 401, 'AUTHENTICATION_FAILED');
  assert.equal((await login(subject, replacementPassword)).status, 200);
});
test('R request-core validates mailbox shape Origin conditional CSRF media and size before issuance', async () => {
  const subject = await seed();
  for (const options of [{ omitOrigin: true }, { headers: { Origin: 'null' } }, { headers: { Origin: 'https://attacker.test' } }]) {
    await error(await requestRecovery(subject.email, options), 403, 'ORIGIN_NOT_ALLOWED');
  }
  for (const binding of [undefined, generateVerifier()]) {
    await error(await requestRecovery(subject.email, { cookie: subject.cookie, csrf: binding }), 403, 'CSRF_INVALID');
  }
  for (const body of [{}, [], 'null', '{', { email: subject.email, token: subject.token }, { email: 1 }, { email: 'bad' },
    { email: 'Reject@Example.TEST' }, { email: 'alumno@ÉXAMPLE.test' }, { email: '\u0000bad@example.test' }]) {
    await error(await requestRecovery(subject.email, { body }), 422, 'VALIDATION_ERROR');
  }
  await error(await requestRecovery(subject.email, { headers: { 'Content-Type': 'text/plain' } }), 415, 'MEDIA_TYPE_UNSUPPORTED');
  await error(await requestRecovery(subject.email, { body: ' '.repeat(16385) }), 413, 'REQUEST_TOO_LARGE');
  for (const email of ['"Quoted Person"@example.test', 'alumnó@ejemplo.测试']) {
    const owner = await seed({ email });
    await accepted(await requestRecovery(email));
    await reset(await confirm(await captured(email)));
    assert.equal((await login(owner, replacementPassword)).status, 200);
  }
  // Positive SMTP controls run first; no assumption that durable202 already means delivered.
  await unchanged(subject); assert.equal((await login(subject)).status, 200);
  await reset(await confirm(subject.token));
});
test('R request-core known unknown 59s cooldown ignores attempt windows and permits 60s boundary', async () => {
  const subject = await seed(), unknown = `Cooldown${++sequence}@example.test`;
  await accepted(await requestRecovery(subject.email)); const old = await captured(subject.email);
  await accepted(await requestRecovery(unknown));
  await age(59);
  for (const email of [subject.email, unknown.toUpperCase().replace('EXAMPLE.TEST', 'example.test')]) {
    const denied = await requestRecovery(email); await error(denied, 429, 'RATE_LIMITED');
    assert.equal(Number(denied.headers.get('retry-after')), 1);
  }
  await unchanged(subject, 1);
  await age(60);
  for (const email of [subject.email, unknown]) await accepted(await requestRecovery(email));
  const current = await captured(subject.email, 2);
  await error(await confirm(old), 400, 'LINK_INVALID'); await reset(await confirm(current));
  assert.equal((await messages(unknown)).length, 0);
});
test('R request-core identifier attempts include unknown aliases across instances without moving success', async () => {
  const unknown = `Identifier${++sequence}@example.test`, other = await start();
  try {
    await accepted(await requestRecovery(unknown));
    for (const target of [other.base, base]) {
      await error(await requestRecovery(unknown.replace('Identifier', 'IDENTIFIER'), { target }), 429, 'RATE_LIMITED');
    }
    await age(60);
    const denied = await requestRecovery(unknown, { target: other.base });
    await error(denied, 429, 'RATE_LIMITED'); assert.ok(Number(denied.headers.get('retry-after')) > 60);
    assert.equal((await messages(unknown)).length, 0); assert.deepEqual(await state(), { authenticated: false });
  } finally { await close(other.app); }
});

test('R issuance shared IP admission ignores forwarded headers without consuming prior proof', async () => {
  const subject = await seed(); await accepted(await requestRecovery(subject.email));
  const token = await captured(subject.email);
  const other = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ 'recovery-request': { ip: { limit: 1 } } }) });
  try {
    const response = await requestRecovery(`Ip${++sequence}@example.test`, { target: other.base, headers: { 'X-Forwarded-For': '203.0.113.2' } });
    await error(response, 429, 'RATE_LIMITED'); assert.ok(Number(response.headers.get('retry-after')) > 0);
    await unchanged(subject, 1); await reset(await confirm(token));
  } finally { await close(other.app); }
});
test('R issuance concurrent requests serialize known and unknown acceptance across instances', async () => {
  const subject = await seed(), unknown = `Concurrent${++sequence}@example.test`, other = await start();
  try {
    for (const email of [subject.email, unknown]) {
      const pair = await Promise.all([requestRecovery(email), requestRecovery(email, { target: other.base })]);
      assert.deepEqual(pair.map(r => r.status).sort(), [202, 429]);
      for (const response of pair) response.status === 202 ? await accepted(response) : await error(response, 429, 'RATE_LIMITED');
    }
    const current = await captured(subject.email);
    await unchanged(subject, 1); await reset(await confirm(current));
    assert.equal((await messages(unknown)).length, 0); assert.deepEqual(await state(), { authenticated: false });
  } finally { await close(other.app); }
});
test('R issuance cancellation and encrypted enqueue outages roll back proof and successful marker', async () => {
  for (const app of apps) await app.get(IdentityRuntime).stopMail();
  for (const invalidated of [false, true]) {
    const subject = await seed({ invalidated });
    await db.query('BEGIN'); await db.query('LOCK TABLE background_jobs IN SHARE MODE');
    try { await error(await requestRecovery(subject.email), 503, 'SERVICE_UNAVAILABLE'); }
    finally { await db.query('ROLLBACK'); }
    await unchanged(subject);
    if (invalidated) await error(await confirm(subject.token), 400, 'LINK_INVALID');
    else await reset(await confirm(subject.token));
    const healthy = await start();
    try {
      await accepted(await requestRecovery(subject.email, { target: healthy.base }));
      await reset(await confirm(await captured(subject.email)));
      assert.equal((await login(subject, replacementPassword)).status, 200);
    } finally { await close(healthy.app); }
  }
});
test('R issuance replacement cancels queued mail while preserving verification-purpose proof', async () => {
  for (const app of apps) await app.get(IdentityRuntime).stopMail();
  const subject = await seed({ purpose: 'EMAIL_VERIFICATION' });
  await accepted(await requestRecovery(subject.email)); await age(60);
  await accepted(await requestRecovery(subject.email));
  const healthy = await start();
  try {
    await reset(await confirm(await captured(subject.email)));
    const signed = await login(subject, replacementPassword); assert.equal(signed.status, 200);
    assert.equal((await signed.json()).user.emailVerified, false);
    await success(await send('/auth/email-verification/confirm', { method: 'POST', body: { token: subject.token } }), 200, { status: 'verified' });
    assert.equal((await messages(subject.email)).length, 1, 'only the current queued recovery is captured');
  } finally { await close(healthy.app); }
});

test('R confirm captured 15-minute proof resets anonymously revokes all sessions without verification or login', async () => {
  const subject = await seed(), second = await session(subject.id);
  await accepted(await requestRecovery(subject.email)); const token = await captured(subject.email);
  await reset(await confirm(token));
  for (const cookie of [undefined, subject.cookie, second]) assert.deepEqual(await state(cookie), { authenticated: false });
  await error(await login(subject), 401, 'AUTHENTICATION_FAILED');
  const signed = await login(subject, replacementPassword); assert.equal(signed.status, 200);
  assert.equal((await signed.json()).user.emailVerified, false);
  await error(await confirm(token), 400, 'LINK_INVALID'); assert.equal((await messages(subject.email)).length, 1);
  const expired = await seed(); await accepted(await requestRecovery(expired.email)); const old = await captured(expired.email);
  // Owned aging preserves the issued TTL; a mistaken one-hour reset TTL would still authorize.
  await db.query("UPDATE account_tokens SET created_at=created_at-interval '900 seconds',expires_at=expires_at-interval '900 seconds' WHERE user_id=$1 AND purpose='PASSWORD_RESET'", [expired.id]);
  await error(await confirm(old), 400, 'LINK_INVALID'); assert.equal((await login(expired)).status, 200);
});
test('R confirm same-user reset clears cookie revokes other devices and preserves verified status', async () => {
  const subject = await seed({ verified: true }), second = await session(subject.id);
  await reset(await confirm(subject.token, { cookie: subject.cookie, csrf: subject.csrf }));
  for (const cookie of [subject.cookie, second]) assert.deepEqual(await state(cookie), { authenticated: false });
  const signed = await login(subject, replacementPassword); assert.equal(signed.status, 200);
  assert.equal((await signed.json()).user.emailVerified, true); assert.deepEqual(await state(), { authenticated: false });
});
test('R confirm wrong signed-in account preserves identities credentials and usable owner proof', async () => {
  const owner = await seed(), other = await seed();
  await error(await confirm(owner.token, { cookie: other.cookie, csrf: other.csrf }), 400, 'LINK_INVALID');
  await unchanged(owner); await unchanged(other);
  assert.equal((await login(owner)).status, 200); await reset(await confirm(owner.token)); await unchanged(other);
});
test('R confirm wrong purpose expired consumed invalidated and unknown preserve original credentials', async () => {
  for (const options of [{ purpose: 'EMAIL_VERIFICATION' }, { expiry: 0 }, { consumed: true }, { invalidated: true }]) {
    const subject = await seed(options);
    await error(await confirm(subject.token, { cookie: subject.cookie, csrf: subject.csrf }), 400, 'LINK_INVALID');
    await unchanged(subject); assert.equal((await login(subject)).status, 200);
    await error(await login(subject, replacementPassword), 401, 'AUTHENTICATION_FAILED');
    if (options.purpose) await success(await send('/auth/email-verification/confirm', { method: 'POST', body: { token: subject.token } }), 200, { status: 'verified' });
  }
  const subject = await seed(); await error(await confirm(generateVerifier()), 400, 'LINK_INVALID');
  await unchanged(subject); await reset(await confirm(subject.token));
});
test('R confirm exact transport raw password boundaries and malformed proof leave current proof usable', async () => {
  const subject = await seed();
  for (const options of [{ omitOrigin: true }, { headers: { Origin: 'null' } }, { headers: { Origin: 'https://attacker.test' } }]) {
    await error(await confirm(subject.token, options), 403, 'ORIGIN_NOT_ALLOWED');
  }
  for (const binding of [undefined, generateVerifier()]) await error(await confirm(subject.token, { cookie: subject.cookie, csrf: binding }), 403, 'CSRF_INVALID');
  for (const body of [{}, [], 'null', '{', { token: subject.token }, { token: subject.token, newPassword: replacementPassword, extra: true },
    { token: 'short', newPassword: replacementPassword }, { token: 'A'.repeat(42) + 'B', newPassword: replacementPassword },
    ...[1, 'x'.repeat(15), '😀'.repeat(129)].map(newPassword => ({ token: subject.token, newPassword }))]) {
    await error(await confirm(subject.token, { body }), 422, 'VALIDATION_ERROR');
  }
  await error(await confirm(subject.token, { headers: { 'Content-Type': 'text/plain' } }), 415, 'MEDIA_TYPE_UNSUPPORTED');
  await error(await confirm(subject.token, { body: ' '.repeat(16385) }), 413, 'REQUEST_TOO_LARGE');
  await unchanged(subject); await reset(await confirm(subject.token));
  for (const secret of [' '.repeat(16), '😀'.repeat(128)]) {
    const owner = await seed(); await reset(await confirm(owner.token, { body: { token: owner.token, newPassword: secret } }));
    assert.equal((await login(owner, secret)).status, 200);
  }
});
test('R confirm duplicate redemption and stale in-flight login cannot resurrect old credentials', async () => {
  const subject = await seed(); let reached, release;
  const checked = new Promise(resolve => { reached = resolve; }), gate = new Promise(resolve => { release = resolve; });
  const other = await start({}, { identity: { beforeCredentialCommit: async () => { reached(); await gate; } } });
  const pending = login(subject, password, { target: other.base });
  let pair;
  try {
    await Promise.race([checked, delay(2000).then(() => { throw new Error('Credential boundary unavailable'); })]);
    pair = await Promise.all([confirm(subject.token), confirm(subject.token)]);
  } finally { release(); }
  const stale = await pending;
  try {
    assert.deepEqual(pair.map(r => r.status).sort(), [204, 400]);
    for (const response of pair) response.status === 204 ? await reset(response) : await error(response, 400, 'LINK_INVALID');
    await error(stale, 401, 'AUTHENTICATION_FAILED');
    assert.deepEqual(await state(subject.cookie), { authenticated: false });
    assert.equal((await login(subject, replacementPassword)).status, 200); await error(await login(subject), 401, 'AUTHENTICATION_FAILED');
  } finally { await close(other.app); }
});
test('R confirm session revocation and expiry during real hash boundary prevent mutation', async () => {
  for (const scenario of ['logout', 'expiry']) {
    const subject = await seed(); let reached, release;
    const checked = new Promise(resolve => { reached = () => resolve(true); }), gate = new Promise(resolve => { release = resolve; });
    const other = await start({}, { identity: { beforeRecoveryCommit: async () => { reached(); await gate; } } });
    const pending = confirm(subject.token, { cookie: subject.cookie, csrf: subject.csrf, target: other.base });
    let entered;
    try {
      entered = await Promise.race([checked, pending.then(() => false)]);
      if (entered) {
        if (scenario === 'logout') {
          const response = await send('/auth/logout', { method: 'POST', cookie: subject.cookie, csrf: subject.csrf });
          assert.equal(response.status, 204); await response.arrayBuffer();
        } else await db.query('UPDATE account_tokens SET expires_at=clock_timestamp() WHERE id=$1', [subject.tokenId]);
      }
    } finally { release(); }
    const response = await pending;
    try {
      assert.equal(entered, true, 'public reset waits at trusted post-hash/pre-lock boundary');
      await error(response, 400, 'LINK_INVALID'); assert.equal((await login(subject)).status, 200);
      await error(await login(subject, replacementPassword), 401, 'AUTHENTICATION_FAILED');
      if (scenario === 'logout') await reset(await confirm(subject.token));
      else await error(await confirm(subject.token), 400, 'LINK_INVALID');
    } finally { await close(other.app); }
  }
});
test('R confirm shared verification-redemption IP budget rejects without consuming reset proof', async () => {
  const subject = await seed();
  const other = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ 'token-redemption': { ip: { limit: 1 } } }) });
  try {
    const denied = await confirm(subject.token, { target: other.base, headers: { 'X-Forwarded-For': '203.0.113.9' } });
    await error(denied, 429, 'RATE_LIMITED'); assert.ok(Number(denied.headers.get('retry-after')) > 0);
    await unchanged(subject); await reset(await confirm(subject.token));
  } finally { await close(other.app); }
});
