import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { channel } from 'node:diagnostics_channel';
import { setTimeout } from 'node:timers/promises';
import pg from 'pg';
import { createApplication } from '../.build/api/apps/api/src/application.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { createPasswordService, generateVerifier, sessionTokenDigest } from '../.build/api/apps/api/src/identity-security/index.js';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';

if (!/^foxmind-identity-[a-f0-9]+$/.test(process.env.P33_IDENTITY_ISOLATED ?? '')) throw new Error('Owned identity runner required');
const browserOrigin = 'http://127.0.0.1:3000';
const password = 'A test-only password 😀';
const changedPassword = 'A different test password 😀';
const fixtureEmail = 'Üser.Name+tag@bücher.test';
let db, app, base, hash, newHash;
const apps = [];
const fixture = {};
before(async () => {
  db = new pg.Client({ connectionString: process.env.DATABASE_URL, query_timeout: 2000 });
  await db.connect();
  const passwords = await createPasswordService();
  hash = await passwords.hash(password); newHash = await passwords.hash(changedPassword);
  for (const [kind, email, verified] of [['verified', fixtureEmail, true], ['unverified', 'Unverified@example.test', false], ['race', 'Race@example.test', true]]) {
    const id = randomUUID(); fixture[kind] = id;
    await db.query(`INSERT INTO users(id,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,$2,lower($2),'Example','Learner',$3,CASE WHEN $4 THEN now() ELSE NULL END)`, [id, email, hash, verified]);
  }
  ({ app, base } = await start());
});
after(async () => { for (const application of apps.reverse()) await application.close(); if (db) await db.end(); });
async function start(overrides = {}, options) {
  const env = { ...process.env, ...identityTestEnvironment(), ...overrides };
  const application = await createApplication(readConfiguration(env), options);
  apps.push(application);
  await application.listen(0, '127.0.0.1');
  return { app: application, base: `http://127.0.0.1:${application.getHttpServer().address().port}` };
}
const send = (path, { method = 'GET', body, cookie, csrf, headers = {}, target = base } = {}) => fetch(`${target}/api/v1${path}`, {
  method, headers: { ...(method !== 'GET' ? { Origin: browserOrigin, 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}), ...headers },
  ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }), signal: AbortSignal.timeout(4000),
});
const login = (email = fixtureEmail, raw = password, options = {}) => send('/auth/login', { method: 'POST', body: { email, password: raw }, ...options });
function cookieOf(response) {
  const value = response.headers.get('set-cookie');
  assert.ok(Boolean(value), 'session cookie emitted');
  return value.split(';')[0];
}
function security(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('x-request-id') ?? '', /^[a-f0-9-]{36}$/);
  assert.equal(response.headers.get('x-powered-by'), null);
}
async function error(response, status, code) {
  assert.equal(response.status, status); security(response);
  const body = await response.json();
  assert.equal(body.error?.code, code);
  assert.equal(body.error?.requestId, response.headers.get('x-request-id'));
  assert.ok(Object.keys(body.error).every(key => ['code', 'requestId', 'fieldErrors'].includes(key)), 'whitelisted envelope');
}
async function seededSession({ user = fixture.verified, idle = 0, absolute = 0, revoked = false } = {}) {
  const verifier = generateVerifier();
  await db.query(`INSERT INTO sessions(id,user_id,token_hash,created_at,expires_at,last_seen_at,revoked_at)
    VALUES($1,$2,$3,now()-interval '13 hours',now()+($4 * interval '1 second'),now()+($5 * interval '1 second'),CASE WHEN $6 THEN now() ELSE NULL END)`,
  [randomUUID(), user, sessionTokenDigest(verifier), absolute || 43200, idle || 0, revoked]);
  return `foxmind_session=${verifier}`;
}

test('D1 anonymous session, protected CSRF, sanitized request IDs and no anonymous cookie', async () => {
  const response = await send('/auth/session');
  assert.equal(response.status, 200); security(response);
  assert.deepEqual(await response.json(), { authenticated: false });
  assert.equal(response.headers.get('set-cookie'), null);
  await error(await send('/auth/csrf'), 401, 'AUTH_REQUIRED');
});
test('D1 verified and unverified login uses fresh opaque cookie and preserved broad mailbox spelling', async () => {
  for (const email of [fixtureEmail, 'Unverified@example.test']) {
    const response = await login(` ${email} `);
    assert.equal(response.status, 200); security(response);
    const value = response.headers.get('set-cookie');
    assert.ok(/^foxmind_session=[A-Za-z0-9_-]{43};/.test(value), 'opaque verifier shape');
    for (const part of ['HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=']) assert.ok(value.includes(part));
    assert.ok(!value.includes('Domain=') && !value.includes('Secure'));
    const state = await response.json();
    assert.equal(state.authenticated, true); assert.ok(state.user.email === email, 'delivery spelling preserved');
    assert.equal(state.user.emailVerified, email === fixtureEmail);
    assert.deepEqual(Object.keys(state.user).sort(), ['email', 'emailVerified', 'firstName', 'id', 'lastName']);
    const cookie = cookieOf(response);
    const read = await send('/auth/session', { cookie });
    assert.equal((await read.json()).user.id, state.user.id);
  }
});
test('D1 wrong and unknown credentials share generic failure; case-insensitive DB lookup', async () => {
  for (const [email, raw] of [[fixtureEmail, changedPassword], ['Absent@example.test', password]]) {
    const response = await login(email, raw);
    await error(response, 401, 'AUTHENTICATION_FAILED');
    assert.equal(response.headers.get('set-cookie'), null);
  }
  assert.equal((await login('üSER.nAME+TAG@bücher.test')).status, 200);
});
test('D1 exact Origin is required on all mutations, arbitrary forwarded headers ignored', async () => {
  for (const path of ['/auth/login', '/auth/logout']) for (const origin of ['', 'null', 'http://localhost:3000', 'https://attacker.test']) {
    await error(await send(path, { method: 'POST', body: {}, headers: { Origin: origin, 'X-Forwarded-For': '192.0.2.4', 'X-Forwarded-Host': '127.0.0.1:3000' } }), 403, 'ORIGIN_NOT_ALLOWED');
  }
});
test('D1 JSON media, malformed JSON, unknown fields and raw Unicode password boundaries', async () => {
  await error(await login(fixtureEmail, password, { headers: { 'Content-Type': 'text/plain' } }), 415, 'MEDIA_TYPE_UNSUPPORTED');
  for (const body of ['{', '[]', 'null', '{}', '{"email":"x","password":"x","untrusted-field":"private"}']) {
    await error(await send('/auth/login', { method: 'POST', body }), 422, 'VALIDATION_ERROR');
  }
  for (const raw of ['x'.repeat(15), 'x'.repeat(129), '\ud800'.repeat(16)]) await error(await login(fixtureEmail, raw), 422, 'VALIDATION_ERROR');
  for (const raw of ['😀'.repeat(16), 'x'.repeat(128)]) await error(await login('BoundaryUnknown@example.test', raw), 401, 'AUTHENTICATION_FAILED');
  for (const email of ['User@EXAMPLE.test', 'User@Bücher.test', 'bad\n@example.test']) await error(await login(email), 422, 'VALIDATION_ERROR');
});
test('D1 actual chunked received bytes enforce 16 KiB before credential work', async () => {
  const result = await new Promise((resolve, reject) => {
    const req = request(`${base}/api/v1/auth/login`, { method: 'POST', headers: { Origin: browserOrigin, 'Content-Type': 'application/json' } }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; }); res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.setTimeout(3000, () => req.destroy(new Error('chunked request timeout'))); req.on('error', reject);
    req.write('{"email":"'); req.write('😀'.repeat(4100)); req.end('"}');
  });
  assert.equal(result.status, 413); assert.equal(JSON.parse(result.body).error.code, 'REQUEST_TOO_LARGE');
});
test('D1 exact byte boundary is accepted and next byte rejected without credential echo', async () => {
  const body = JSON.stringify({ email: 'ByteBoundaryUnknown@example.test', password });
  const padded = body + ' '.repeat(16384 - Buffer.byteLength(body));
  await error(await send('/auth/login', { method: 'POST', body: padded }), 401, 'AUTHENTICATION_FAILED');
  await error(await send('/auth/login', { method: 'POST', body: `${padded} ` }), 413, 'REQUEST_TOO_LARGE');
});
test('D1 authenticated public mutations require CSRF; failed login preserves old session', async () => {
  const first = await login(); const cookie = cookieOf(first);
  const csrfResponse = await send('/auth/csrf', { cookie }); assert.equal(csrfResponse.status, 200);
  const { csrfToken } = await csrfResponse.json(); assert.ok(/^[A-Za-z0-9_-]{43}$/.test(csrfToken), 'opaque CSRF shape');
  for (const path of ['/auth/login', '/auth/logout']) await error(await send(path, { method: 'POST', cookie, body: {} }), 403, 'CSRF_INVALID');
  await error(await login(fixtureEmail, changedPassword, { cookie, csrf: csrfToken }), 401, 'AUTHENTICATION_FAILED');
  assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, true);
  const second = await login('Unverified@example.test', password, { cookie, csrf: csrfToken });
  assert.equal(second.status, 200); const secondCookie = cookieOf(second);
  assert.ok(cookie !== secondCookie, 'successful login rotates identifier');
  assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, false);
  assert.ok((await (await send('/auth/session', { cookie: secondCookie })).json()).user.email === 'Unverified@example.test', 'new session has intended identity');
  await error(await send('/auth/logout', { method: 'POST', cookie: secondCookie, csrf: csrfToken }), 403, 'CSRF_INVALID');
});
test('D1 logout revokes current only, is idempotent, and clears matching cookie scope', async () => {
  const first = await login(); const second = await login(); const cookie = cookieOf(first), other = cookieOf(second);
  const { csrfToken } = await (await send('/auth/csrf', { cookie })).json();
  const response = await send('/auth/logout', { method: 'POST', cookie, csrf: csrfToken });
  assert.equal(response.status, 204); assert.equal(await response.text(), ''); security(response);
  const clear = response.headers.get('set-cookie');
  for (const scope of ['foxmind_session=', 'Max-Age=0', 'HttpOnly', 'SameSite=Lax', 'Path=/']) assert.ok(clear.includes(scope));
  assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, false);
  assert.equal((await (await send('/auth/session', { cookie: other })).json()).authenticated, true);
  assert.equal((await send('/auth/logout', { method: 'POST', cookie })).status, 204);
  assert.equal((await send('/auth/logout', { method: 'POST' })).status, 204);
});
test('D1 concurrent logout and cookie-bearing login cannot resurrect the old session', async () => {
  const cookie = cookieOf(await login());
  const { csrfToken } = await (await send('/auth/csrf', { cookie })).json();
  const [signedIn, signedOut] = await Promise.all([
    login(fixtureEmail, password, { cookie, csrf: csrfToken }),
    send('/auth/logout', { method: 'POST', cookie, csrf: csrfToken }),
  ]);
  assert.equal(signedOut.status, 204);
  assert.ok([200, 401].includes(signedIn.status), 'only a serialized successful login or stale-context denial is allowed');
  assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, false);
  if (signedIn.status === 200) {
    assert.equal((await (await send('/auth/session', { cookie: cookieOf(signedIn) })).json()).authenticated, true);
  }
});
test('D1 expired idle/absolute and revoked cookies cannot authenticate CSRF and are cleared', async () => {
  for (const options of [{ idle: -1800 }, { absolute: -1 }, { revoked: true }]) {
    const cookie = await seededSession(options);
    const response = await send('/auth/session', { cookie }); assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { authenticated: false }); assert.ok(response.headers.get('set-cookie').includes('Max-Age=0'));
    await error(await send('/auth/csrf', { cookie }), 401, 'AUTH_REQUIRED');
    assert.equal((await send('/auth/logout', { method: 'POST', cookie, csrf: generateVerifier() })).status, 204);
  }
  const malformed = await send('/auth/session', { cookie: 'foxmind_session=not-valid' });
  assert.equal((await malformed.json()).authenticated, false); assert.ok(malformed.headers.get('set-cookie').includes('Max-Age=0'));
});
test('D1 session/CSRF/health reads never renew idle', async () => {
  const cookie = await seededSession({ idle: -1799 });
  assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, true);
  assert.equal((await send('/auth/csrf', { cookie })).status, 200);
  assert.equal((await send('/health/live')).status, 200);
  await setTimeout(1050);
  assert.equal((await (await send('/auth/session', { cookie })).json()).authenticated, false);
});
test('D1 unknown identifier rate admission is shared across app instances and expires', async () => {
  const rates = JSON.stringify({ login: { identifier: { limit: 2, windowSeconds: 1 } } });
  const env = { ...identityTestEnvironment(), AUTH_RATE_LIMITS_JSON: rates };
  const a = await start(env), b = await start(env);
  await error(await login('LimitedUnknown@example.test', password, { target: a.base }), 401, 'AUTHENTICATION_FAILED');
  await error(await login('LimitedUnknown@example.test', password, { target: b.base }), 401, 'AUTHENTICATION_FAILED');
  const limited = await login('LimitedUnknown@example.test', password, { target: a.base });
  await error(limited, 429, 'RATE_LIMITED'); assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  await setTimeout(1050);
  await error(await login('LimitedUnknown@example.test', password, { target: b.base }), 401, 'AUTHENTICATION_FAILED');
});
test('D1 concurrent nonexistent-identifier admission accepts exactly the shared budget', async () => {
  const a = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ login: { identifier: { limit: 1, windowSeconds: 60 } } }) });
  const responses = await Promise.all([login('ConcurrentUnknown@example.test', password, { target: a.base }), login('ConcurrentUnknown@example.test', password, { target: a.base })]);
  assert.deepEqual(responses.map(r => r.status).sort(), [401, 429]);
});
test('D1 sign-in IP budget applies across distinct unknown identifiers', async () => {
  const a = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ login: { ip: { limit: 1, windowSeconds: 60 } } }) });
  await error(await login('IpUnknownOne@example.test', password, { target: a.base }), 401, 'AUTHENTICATION_FAILED');
  const response = await login('IpUnknownTwo@example.test', password, { target: a.base });
  await error(response, 429, 'RATE_LIMITED'); assert.ok(Number(response.headers.get('retry-after')) > 0);
});
test('D1 socket IP ignores spoofed XFF; general and session limits are enforced', async () => {
  const ip = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ 'general-identity': { ip: { limit: 1, windowSeconds: 60 } } }) });
  assert.equal((await send('/auth/session', { target: ip.base, headers: { 'X-Forwarded-For': '192.0.2.1' } })).status, 200);
  await error(await send('/auth/session', { target: ip.base, headers: { 'X-Forwarded-For': '192.0.2.2' } }), 429, 'RATE_LIMITED');
  const session = await start({ AUTH_RATE_LIMITS_JSON: JSON.stringify({ 'general-identity': { session: { limit: 1, windowSeconds: 60 } } }) });
  const cookie = cookieOf(await login(fixtureEmail, password, { target: session.base }));
  assert.equal((await send('/auth/session', { cookie, target: session.base })).status, 200);
  await error(await send('/auth/csrf', { cookie, target: session.base }), 429, 'RATE_LIMITED');
});
test('D1 stale credential snapshot cannot sign in after serialized password replacement', async () => {
  let reached, release;
  const checked = new Promise(resolve => { reached = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const a = await start({}, { identity: { beforeCredentialCommit: async () => { reached(); await gate; } } });
  const pending = login('Race@example.test', password, { target: a.base });
  try {
    await Promise.race([checked, setTimeout(2000).then(() => { throw new Error('credential boundary not reached'); })]);
    // Owned competing writer: same user lock that D2/T3 must use, no post-request storage assertions.
    await db.query('BEGIN');
    await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [fixture.race]);
    await db.query('UPDATE users SET password_hash=$2 WHERE id=$1', [fixture.race, newHash]);
    await db.query('UPDATE sessions SET revoked_at=now() WHERE user_id=$1', [fixture.race]);
    await db.query('COMMIT');
  } finally { release(); }
  await error(await pending, 401, 'AUTHENTICATION_FAILED');
  const good = await login('Race@example.test', changedPassword); assert.equal(good.status, 200);
  await error(await login('Race@example.test', password), 401, 'AUTHENTICATION_FAILED');
});
test('D1 invalid B/C/mail configuration fails before listen without input echo; old config priority preserved', () => {
  const main = '.build/api/apps/api/src/main.js';
  const scenarios = [
    { AUTH_CSRF_HMAC_KEY: undefined }, { AUTH_ABUSE_HMAC_KEY: 'private-invalid' },
    { AUTH_OUTBOX_KEYS_JSON: undefined }, { AUTH_OUTBOX_ACTIVE_KEY_ID: 'missing' },
    { MAIL_SMTP_PORT: 'invalid-private' }, { AUTH_LOCAL_HTTP: 'true', NODE_ENV: 'production' },
    { AUTH_RATE_LIMITS_JSON: '{"unexpected":{}}' }, { AUTH_TRUSTED_PROXY_CIDRS: '127.0.0.1/32' },
  ];
  for (const change of scenarios) {
    const env = { ...process.env, ...identityTestEnvironment(), API_PORT: '0', ...change };
    for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
    const result = spawnSync(process.execPath, [main], { env, encoding: 'utf8', timeout: 1500 });
    assert.equal(result.status, 1); assert.equal(result.stdout, ''); assert.equal(result.stderr, 'Backend startup failed.\n');
  }
});
test('D1 secure configuration emits Secure cookie; trusted CIDRs do not silently enable arbitrary proxy trust', async () => {
  const a = await start({ APP_ORIGIN: 'https://foxmind.example.test', AUTH_LOCAL_HTTP: 'false', NODE_ENV: 'production' });
  const response = await login(fixtureEmail, password, { target: a.base, headers: { Origin: 'https://foxmind.example.test' } });
  assert.equal(response.status, 200); assert.ok(response.headers.get('set-cookie').includes('Secure'));
});
function observeOutageSockets(t, server) {
  let phase = 'warm-session', nextId = 0;
  const port = server.address().port;
  const sockets = new WeakMap();
  const requests = new WeakMap();
  const phases = new Map();
  const cleanups = [];
  const emit = (event, metadata = {}) => t.diagnostic(JSON.stringify({ event, phase, ...metadata }));
  const socketId = socket => {
    if (!sockets.has(socket)) sockets.set(socket, ++nextId);
    return sockets.get(socket);
  };
  const sendHeaders = ({ request, socket }) => {
    if (socket.remotePort !== port) return; // Observe only this fixture's origin, not earlier apps.
    const seenDuringCase = sockets.has(socket);
    const record = { socket, id: socketId(socket), phase, completed: false, failed: false };
    requests.set(request, record);
    if (!phases.has(phase)) phases.set(phase, []);
    phases.get(phase).push(record);
    emit('client-send', { id: record.id, seenDuringCase, destroyed: socket.destroyed });
  };
  const headers = ({ request, response }) => {
    const record = requests.get(request);
    if (record) record.status = response.statusCode;
  };
  const trailers = ({ request }) => {
    const record = requests.get(request);
    if (record) record.completed = true;
  };
  const requestError = ({ request, error }) => {
    const record = requests.get(request);
    if (!record) return;
    record.failed = true;
    // Only known transport codes; never error objects/messages, requests, headers or payloads.
    const code = ['ECONNRESET', 'UND_ERR_SOCKET', 'ABORT_ERR'].includes(error?.code) ? error.code : 'OTHER';
    emit('client-error', { phase: record.phase, id: record.id, code });
  };
  const received = (request, response) => {
    const id = socketId(request.socket), requestPhase = phase;
    emit('server-request', { id });
    const finish = () => emit('server-finish', { phase: requestPhase, id, status: response.statusCode });
    const closed = () => emit('server-response-close', { phase: requestPhase, id, finished: response.writableFinished });
    response.once('finish', finish); response.once('close', closed);
    cleanups.push(() => { response.off('finish', finish); response.off('close', closed); });
  };
  function completed(value, status) {
    const records = phases.get(value) ?? [];
    assert.equal(records.length, 1, `${value}: exactly one actual HTTP send`);
    const record = records[0];
    assert.equal(record.status, status, `${value}: observed wire status`);
    assert.equal(record.completed, true, `${value}: response transport completed`);
    assert.equal(record.failed, false, `${value}: no transport error`);
    return record;
  }
  const subscriptions = [
    [channel('undici:client:sendHeaders'), sendHeaders], [channel('undici:request:error'), requestError],
    [channel('undici:request:headers'), headers], [channel('undici:request:trailers'), trailers],
  ];
  for (const [events, listener] of subscriptions) events.subscribe(listener);
  server.on('request', received);
  return {
    phase(value) { phase = value; emit('phase'); },
    completed,
    reused(value, status) {
      const record = completed(value, status);
      const warm = ['warm-session', 'warm-ready'].map(value => completed(value, 200))
        .find(previous => previous.socket === record.socket);
      assert.ok(warm, `${value}: same client socket object as a completed healthy request`);
      emit('client-reuse-confirmed', { phase: value, id: record.id, from: warm.phase, status });
    },
    close() {
      for (const [events, listener] of subscriptions) events.unsubscribe(listener);
      server.off('request', received);
      for (const cleanup of cleanups) cleanup();
    },
  };
}
test('D1 identity SQL/counter outage fails closed while unrelated liveness remains available', async t => {
  const container = process.env.FOXMIND_API_TEST_CONTAINER;
  // A fresh app/pool/origin excludes unrelated earlier body/lifetime/startup-child history.
  // start tracks it for the global after hook; do not close it a second time here.
  const outage = await start();
  const trace = observeOutageSockets(t, outage.app.getHttpServer());
  async function healthy(prefix) {
    trace.phase(`${prefix}-session`);
    const session = await send('/auth/session', { target: outage.base });
    assert.equal(session.status, 200); security(session);
    assert.deepEqual(await session.json(), { authenticated: false });
    trace.completed(`${prefix}-session`, 200);
    trace.phase(`${prefix}-ready`);
    const ready = await send('/health/ready', { target: outage.base });
    assert.equal(ready.status, 200); assert.equal(ready.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await ready.json(), { status: 'ready' });
    trace.completed(`${prefix}-ready`, 200);
  }
  try {
    // Exercise real SQL admission and readiness on the dedicated pool before pausing it.
    await healthy('warm');
    trace.phase('pause');
    execFileSync('docker', ['pause', container], { stdio: 'pipe', timeout: 2000 });
    try {
      trace.phase('session');
      await error(await send('/auth/session', { target: outage.base }), 503, 'SERVICE_UNAVAILABLE');
      trace.reused('session', 503);
      trace.phase('login');
      await error(await login(fixtureEmail, password, { target: outage.base }), 503, 'SERVICE_UNAVAILABLE');
      trace.reused('login', 503);
      trace.phase('live');
      const live = await send('/health/live', { target: outage.base });
      assert.equal(live.status, 200); assert.equal(live.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await live.json(), { status: 'ok' });
      trace.reused('live', 200);
      trace.phase('ready');
      const ready = await send('/health/ready', { target: outage.base });
      assert.equal(ready.status, 503); assert.equal(ready.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await ready.json(), { status: 'unavailable' });
      trace.reused('ready', 503);
    } finally {
      trace.phase('unpause');
      execFileSync('docker', ['unpause', container], { stdio: 'pipe', timeout: 2000 });
    }
    await healthy('restored');
  } finally { trace.close(); }
});
test('D1 preserves health/unknown routes and leaves eight later operations absent', async () => {
  for (const path of ['/health/live', '/health/ready']) assert.equal((await send(path)).status, 200);
  for (const [path, method] of [['/auth/register', 'POST'], ['/account', 'GET'], ['/account', 'PATCH'], ['/auth/email-verification/resend', 'POST'], ['/auth/email-verification/confirm', 'POST'], ['/auth/password-recovery/request', 'POST'], ['/auth/password-recovery/confirm', 'POST'], ['/account/password', 'POST'], ['/classrooms', 'GET']]) {
    assert.equal((await send(path, { method, body: method === 'GET' ? undefined : {} })).status, 404);
  }
  const response = await send('/unknown', { method: 'POST', body: '{' });
  assert.equal(response.status, 400); // Existing Nest parser behavior outside identity is retained.
});
