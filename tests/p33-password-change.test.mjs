import assert from 'node:assert/strict';
import { before, after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createApplication } from '../.build/api/apps/api/src/application.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { createPasswordService } from '../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/passwords.js';
import { generateVerifier, sessionTokenDigest, accountTokenDigest } from '../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/verifiers.js';

if (process.send) { process.send({ type: 'foxmind-test-ready' }); process.disconnect(); }
if (!/^foxmind-identity-[a-f0-9]+$/.test(process.env.P33_IDENTITY_ISOLATED ?? '')) throw new Error('Owned runner required');
const origin = 'http://127.0.0.1:3000', password = 'Original fixture password 😀', replacement = 'New fixture password 😀';
const rates = JSON.stringify({ login: { ip: { limit: 100 }, identifier: { limit: 100 } }, 'general-identity': { ip: { limit: 1000 }, session: { limit: 1000 } } });
let db, hash, base;
const apps = new Set();
async function start(ports = {}) {
  const app = await createApplication(readConfiguration({ ...process.env, AUTH_RATE_LIMITS_JSON: rates }), { identity: ports });
  apps.add(app); await app.listen(0, '127.0.0.1'); return { app, base: `http://127.0.0.1:${app.getHttpServer().address().port}` };
}
before(async () => {
  db = new pg.Client({ connectionString: process.env.DATABASE_URL, query_timeout: 2000 }); await db.connect();
  hash = await (await createPasswordService()).hash(password); ({ base } = await start());
});
after(async () => { for (const app of apps) await app.close(); await db?.end(); });
async function send(path, { method = 'GET', body, cookie, csrf, target = base, headers = {}, omitOrigin = false } = {}) {
  return fetch(`${target}/api/v1${path}`, { method, headers: {
    ...(method !== 'GET' ? { ...(!omitOrigin ? { Origin: origin } : {}), 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(4000) });
}
const state = async cookie => (await send('/auth/session', { cookie })).json();
const getCsrf = async cookie => (await send('/auth/csrf', { cookie })).json().then(x => x.csrfToken);
const login = (user, value = password, options = {}) => send('/auth/login', { method: 'POST', body: { email: user.email, password: value }, ...options });
const change = (user, options = {}) => send('/account/password', { method: 'POST', cookie: user.cookie, csrf: user.csrf,
  body: { currentPassword: password, newPassword: replacement }, ...options });
async function session(id, absolute = 43200) {
  const raw = generateVerifier();
  await db.query("INSERT INTO sessions(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,clock_timestamp()+$4*interval '1 second')", [randomUUID(), id, sessionTokenDigest(raw), absolute]);
  const cookie = `foxmind_session=${raw}`; return { cookie, csrf: await getCsrf(cookie) };
}
async function seed(verified = true, absolute = 43200) {
  const id = randomUUID(), email = `${id}@example.test`;
  await db.query("INSERT INTO users(id,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role) VALUES($1,$2,$2,'Original','Learner',$3,CASE WHEN $4 THEN clock_timestamp() ELSE NULL END,'student')", [id, email, hash, verified]);
  return { id, email, ...await session(id, absolute) };
}
async function error(response, status, code) {
  assert.equal(response.status, status); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('set-cookie'), null);
  const value = await response.json(); assert.equal(value.error.code, code);
  assert.deepEqual(Object.keys(value.error).sort(), ['code', 'requestId']);
}
async function changed(response) {
  assert.equal(response.status, 204); assert.equal(await response.text(), '');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const header = response.headers.get('set-cookie') ?? '';
  assert.match(header, /HttpOnly/); assert.match(header, /SameSite=Lax/); assert.doesNotMatch(header, /Domain=/);
  return { cookie: header.split(';')[0], header };
}

test('P core changes password rotates cookie and CSRF revokes every old session preserves identity', async () => {
  const user = await seed(), second = await session(user.id), beforeState = await state(user.cookie);
  const result = await changed(await change(user)); assert.notEqual(result.cookie, user.cookie);
  assert.deepEqual(await state(result.cookie), beforeState);
  assert.notEqual(await getCsrf(result.cookie), user.csrf);
  for (const cookie of [user.cookie, second.cookie]) assert.deepEqual(await state(cookie), { authenticated: false });
  await error(await login(user), 401, 'AUTHENTICATION_FAILED'); assert.equal((await login(user, replacement)).status, 200);
  await error(await send('/account', { method: 'PATCH', cookie: result.cookie, csrf: user.csrf, body: { firstName: 'Changed' } }), 403, 'CSRF_INVALID');
});
test('P core rotation preserves remaining absolute lifetime', async () => {
  const user = await seed(true, 90), started = Date.now();
  const result = await changed(await change(user));
  const maxAge = Number(/Max-Age=(\d+)/.exec(result.header)?.[1]);
  assert.ok(maxAge > 70 && maxAge <= 90, `remaining lifetime ${maxAge}`);
  assert.ok(Date.now() - started < 10000);
});
test('P core wrong current password leaves all sessions and credentials unchanged', async () => {
  const user = await seed(), second = await session(user.id);
  await error(await change(user, { body: { currentPassword: replacement, newPassword: replacement } }), 401, 'AUTHENTICATION_FAILED');
  assert.equal((await state(user.cookie)).authenticated, true); assert.equal((await state(second.cookie)).authenticated, true);
  assert.equal(await getCsrf(user.cookie), user.csrf); assert.equal((await login(user)).status, 200);
});
test('P core Unicode password boundaries retain raw spaces and code points', async () => {
  for (const value of ['😀'.repeat(16), ' '.repeat(2) + 'a'.repeat(126)]) {
    const user = await seed(); await changed(await change(user, { body: { currentPassword: password, newPassword: value } }));
    assert.equal((await login(user, value)).status, 200);
  }
});
test('P guards anonymous and unverified callers cannot change credentials', async () => {
  await error(await change({}, {}), 401, 'AUTH_REQUIRED');
  const user = await seed(false); await error(await change(user), 403, 'EMAIL_VERIFICATION_REQUIRED');
  assert.equal((await login(user)).status, 200);
});
test('P guards Origin CSRF body media and raw bounds reject without rotation', async () => {
  const user = await seed();
  for (const options of [{ omitOrigin: true }, { headers: { Origin: 'https://wrong.test' } }]) await error(await change(user, options), 403, 'ORIGIN_NOT_ALLOWED');
  for (const csrf of [undefined, 'wrong']) await error(await change(user, { csrf }), 403, 'CSRF_INVALID');
  for (const body of [{ currentPassword: password }, { currentPassword: password, newPassword: replacement, role: 'teacher' },
    { currentPassword: password, newPassword: 'a'.repeat(15) }, { currentPassword: password, newPassword: '😀'.repeat(129) },
    { currentPassword: 'a'.repeat(129), newPassword: replacement }, []]) await error(await change(user, { body }), 422, 'VALIDATION_ERROR');
  await error(await change(user, { headers: { 'Content-Type': 'text/plain' } }), 415, 'MEDIA_TYPE_UNSUPPORTED');
  await error(await change(user, { body: JSON.stringify({ value: 'x'.repeat(17000) }) }), 413, 'REQUEST_TOO_LARGE');
  assert.equal(await getCsrf(user.cookie), user.csrf); assert.equal((await login(user)).status, 200);
});
test('P guards default per-user admission counts failed current-password attempts', async () => {
  const user = await seed();
  for (let i = 0; i < 5; i++) await error(await change(user, { body: { currentPassword: replacement, newPassword: replacement } }), 401, 'AUTHENTICATION_FAILED');
  const denied = await change(user); await error(denied, 429, 'RATE_LIMITED');
  assert.ok(Number(denied.headers.get('retry-after')) > 0); assert.equal((await login(user)).status, 200);
});
test('P ip default shared IP admission cannot be bypassed with forwarded headers', async () => {
  for (let i = 0; i < 20; i++) {
    const user = await seed(); await error(await change(user, { body: { currentPassword: replacement, newPassword: replacement } }), 401, 'AUTHENTICATION_FAILED');
  }
  const user = await seed(); const denied = await change(user, { headers: { 'X-Forwarded-For': '203.0.113.33' } });
  await error(denied, 429, 'RATE_LIMITED'); assert.ok(Number(denied.headers.get('retry-after')) > 0);
  assert.equal((await login(user)).status, 200);
});
test('P races concurrent changes accept once and stale login cannot resurrect old password', async () => {
  const user = await seed(); let reached, release;
  const checked = new Promise(r => reached = r), gate = new Promise(r => release = r);
  const other = await start({ beforeCredentialCommit: async () => { reached(); await gate; } });
  const pending = login(user, password, { target: other.base });
  let responses;
  try { await checked; responses = await Promise.all([change(user), change(user)]); } finally { release(); }
  assert.deepEqual(responses.map(x => x.status).sort(), [204, 401]);
  await error(await pending, 401, 'AUTHENTICATION_FAILED');
  assert.equal((await login(user, replacement)).status, 200);
});
test('P races logout during password hashing prevents change', async () => {
  const user = await seed(); let reached, release;
  const checked = new Promise(r => reached = r), gate = new Promise(r => release = r);
  const other = await start({ beforePasswordChangeCommit: async () => { reached(true); await gate; } });
  const pending = change(user, { target: other.base }); let entered;
  try { entered = await Promise.race([checked, pending.then(() => false)]);
    if (entered) assert.equal((await send('/auth/logout', { method: 'POST', cookie: user.cookie, csrf: user.csrf })).status, 204);
  } finally { release(); }
  assert.equal(entered, true); await error(await pending, 401, 'AUTH_REQUIRED'); assert.equal((await login(user)).status, 200);
});
test('P races recovery during change hashing cannot restore stale credentials or session', async () => {
  const user = await seed(), token = generateVerifier();
  await db.query("INSERT INTO account_tokens(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'PASSWORD_RESET',$3,clock_timestamp()+interval '15 minutes')", [randomUUID(), user.id, accountTokenDigest('PASSWORD_RESET', token)]);
  let reached, release; const checked = new Promise(r => reached = r), gate = new Promise(r => release = r);
  const other = await start({ beforePasswordChangeCommit: async () => { reached(true); await gate; } });
  const pending = change(user, { target: other.base }); let entered;
  try { entered = await Promise.race([checked, pending.then(() => false)]);
    if (entered) assert.equal((await send('/auth/password-recovery/confirm', { method: 'POST', body: { token, newPassword: 'Reset wins this password 😀' } })).status, 204);
  } finally { release(); }
  assert.equal(entered, true); await error(await pending, 401, 'AUTH_REQUIRED');
  assert.equal((await login(user, 'Reset wins this password 😀')).status, 200);
  assert.deepEqual(await state(user.cookie), { authenticated: false });
});
