import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import * as apiPart0 from "../.build/p33-security/apps/api/src/modules/identity/domain/security/errors.js";
import * as apiPart1 from "../.build/p33-security/apps/api/src/modules/identity/domain/security/inputs.js";
import * as apiPart2 from "../.build/p33-security/apps/api/src/modules/identity/accounts/infrastructure/security/verifiers.js";
import * as apiPart3 from "../.build/p33-security/apps/api/src/modules/identity/accounts/infrastructure/security/configuration.js";
import * as apiPart4 from "../.build/p33-security/apps/api/src/modules/identity/accounts/infrastructure/security/passwords.js";
import * as apiPart5 from "../.build/p33-security/apps/api/src/modules/identity/accounts/infrastructure/security/sessions.js";
import * as apiPart6 from "../.build/p33-security/apps/api/src/modules/identity/accounts/presentation/session-cookies.js";
const api = Object.freeze({IdentitySecurityError: apiPart0.IdentitySecurityError,validatePassword: apiPart1.validatePassword,validateName: apiPart1.validateName,validateBodyShape: apiPart1.validateBodyShape,assertBodySize: apiPart1.assertBodySize,generateVerifier: apiPart2.generateVerifier,parseVerifier: apiPart2.parseVerifier,accountTokenDigest: apiPart2.accountTokenDigest,sessionTokenDigest: apiPart2.sessionTokenDigest,readIdentityConfiguration: apiPart3.readIdentityConfiguration,createPasswordService: apiPart4.createPasswordService,IDENTITY_POLICY: apiPart5.IDENTITY_POLICY,newSessionWindow: apiPart5.newSessionWindow,sessionIsActive: apiPart5.sessionIsActive,refreshSessionWindow: apiPart5.refreshSessionWindow,sessionCookie: apiPart6.sessionCookie,clearSessionCookie: apiPart6.clearSessionCookie});
const key = () => randomBytes(32).toString('base64url');
const env = () => ({ APP_ORIGIN: 'https://foxmind.example.test', AUTH_CSRF_HMAC_KEY: key(), AUTH_ABUSE_HMAC_KEY: key(), FOXMIND_PROXY_CLIENT_KEY: key() });
const configuration = (values = env(), host = '127.0.0.1') => api.readIdentityConfiguration(values, host);
const safeError = (code) => (error) => {
  assert.ok(error instanceof api.IdentitySecurityError);
  assert.equal(error.code, code);
  assert.equal(error.message, 'Identity security operation rejected.');
  assert.equal(error.cause, undefined);
  return true;
};
const password = () => randomBytes(24).toString('base64url');

test('S2 raw Unicode passwords: 16/128 accepted, 15/129 and unpaired surrogates rejected', () => {
  for (const size of [16, 128]) assert.ok(api.validatePassword('😀'.repeat(size)).length === size * 2);
  for (const value of ['x'.repeat(15), 'x'.repeat(129), 'x'.repeat(16) + '\ud800', 16, null]) {
    assert.throws(() => api.validatePassword(value), safeError('VALIDATION_ERROR'));
  }
  const raw = '  e\u0301' + 'x'.repeat(12);
  assert.ok(api.validatePassword(raw) === raw);
  assert.ok(api.validatePassword(' '.repeat(16)).length === 16);
});

test('S2 names count raw scalar points without trimming or normalization', () => {
  assert.ok(api.validateName('😀'.repeat(80)).length === 160);
  assert.ok(api.validateName(' Example ') === ' Example ');
  for (const value of ['', ' \t\n', ' ' + 'x'.repeat(80), '\udc00', null]) {
    assert.throws(() => api.validateName(value), safeError('VALIDATION_ERROR'));
  }
});

test('S4 login and recovery limits separate each address from a wider per-identifier ceiling', () => {
  const limits = configuration().rateLimits, window = limit => ({ limit, windowSeconds: 900 });
  assert.deepEqual(limits.login, { ip: window(300), identifierPerIp: window(10), identifier: window(100) });
  assert.deepEqual(limits['recovery-request'], { ip: window(20), identifierPerIp: window(3), identifier: window(10), cooldownSeconds: 60 });
  const tuned = configuration({ ...env(), AUTH_RATE_LIMITS_JSON: JSON.stringify({ login: { identifierPerIp: { limit: 5 } } }) });
  assert.deepEqual(tuned.rateLimits.login.identifierPerIp, window(5));
});

test('S2 names reject control and bidirectional characters but keep regular names', () => {
  for (const value of ['María José', "D'Angelo", 'Ñandú Pérez', 'Łukasz', '李 小龍', 'Ana-Lía']) assert.equal(api.validateName(value), value);
  for (const control of ['\u0000', '\u0007', '\t', '\n', '\u001f', '\u007f', '\u0085', '\u009f',
    '؜', '‎', '‏', '‪', '‫', '‬', '‭', '‮', '⁦', '⁧', '⁨', '⁩']) {
    assert.throws(() => api.validateName(`Ana${control}lía`), safeError('VALIDATION_ERROR'), JSON.stringify(control));
  }
});

test('S2 exact body shapes and byte cap reject before expensive work', () => {
  assert.ok(api.validateBodyShape({ firstName: 'A' }, ['firstName', 'lastName'], [], true).firstName === 'A');
  for (const body of [null, [], {}, { email: 'unused' }, { firstName: 'A', role: 'teacher' }]) {
    assert.throws(() => api.validateBodyShape(body, ['firstName', 'lastName'], [], true), safeError('VALIDATION_ERROR'));
  }
  assert.throws(() => api.validateBodyShape({}, ['password'], ['password']), safeError('VALIDATION_ERROR'));
  api.assertBodySize(16384);
  for (const size of [16385, -1, NaN]) assert.throws(() => api.assertBodySize(size), safeError('REQUEST_TOO_LARGE'));
});

test('S4 config fails closed for origin, local HTTP and missing/weak/dependent keys', () => {
  const base = env();
  assert.equal(configuration(base).origin, base.APP_ORIGIN);
  for (const patch of [
    { APP_ORIGIN: undefined }, { APP_ORIGIN: '*' }, { APP_ORIGIN: 'null' },
    { APP_ORIGIN: 'https://user:pass@example.test' }, { APP_ORIGIN: base.APP_ORIGIN + '/' },
    { APP_ORIGIN: base.APP_ORIGIN + '?x=1' }, { APP_ORIGIN: base.APP_ORIGIN + '#x' },
    { APP_ORIGIN: 'http://remote.example.test', AUTH_LOCAL_HTTP: 'true' },
    { APP_ORIGIN: 'http://127.0.0.1:3000' }, { AUTH_LOCAL_HTTP: 'yes' },
    { AUTH_CSRF_HMAC_KEY: undefined }, { AUTH_CSRF_HMAC_KEY: 'weak' },
    { AUTH_CSRF_HMAC_KEY: Buffer.alloc(32).toString('base64url') },
    { AUTH_ABUSE_HMAC_KEY: base.AUTH_CSRF_HMAC_KEY },
    // Without the proxy key every client shares the web server's loopback address and its limits.
    { FOXMIND_PROXY_CLIENT_KEY: undefined }, { FOXMIND_PROXY_CLIENT_KEY: '' }, { AUTH_LOCAL_HTTP: 'false', FOXMIND_PROXY_CLIENT_KEY: undefined },
  ]) assert.throws(() => configuration({ ...base, ...patch }), safeError('IDENTITY_CONFIG_INVALID'));
  const local = { ...base, APP_ORIGIN: 'http://127.0.0.1:3000', AUTH_LOCAL_HTTP: 'true' };
  assert.equal(configuration(local).secureCookies, false);
  assert.equal(configuration({ ...local, FOXMIND_PROXY_CLIENT_KEY: undefined }).secureCookies, false, 'local development may run without the proxy key');
  assert.throws(() => configuration(local, '0.0.0.0'), safeError('IDENTITY_CONFIG_INVALID'));
  assert.throws(() => configuration({ ...local, NODE_ENV: 'production' }), safeError('IDENTITY_CONFIG_INVALID'));
  assert.equal(configuration().secureCookies, true);
});

test('S4 config retains secrets privately and copies supplied values', () => {
  const source = env();
  const config = configuration(source);
  const session = api.generateVerifier();
  const before = config.csrfToken(session);
  source.AUTH_CSRF_HMAC_KEY = key();
  assert.ok(config.csrfToken(session) === before);
  assert.ok(!JSON.stringify(config).includes(source.AUTH_ABUSE_HMAC_KEY));
  assert.ok(!Object.values(config).some(Buffer.isBuffer));
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.rateLimits.login.ip));
  assert.ok(Object.isFrozen(config.trustedProxyCidrs));
});

test('S6 validated proxy/rate config never silently disables controls', () => {
  const config = configuration({ ...env(), AUTH_TRUSTED_PROXY_CIDRS: '127.0.0.1/32,::1/128',
    AUTH_RATE_LIMITS_JSON: JSON.stringify({ login: { ip: { limit: 4, windowSeconds: 60 } } }) });
  assert.equal(config.rateLimits.login.ip.limit, 4);
  assert.equal(config.rateLimits.login.identifierPerIp.limit, 10);
  assert.equal(config.rateLimits.login.identifier.limit, 100);
  assert.equal(config.trustedProxyCidrs.length, 2);
  assert.equal(configuration().trustedProxyCidrs.length, 0);
  for (const patch of [
    { AUTH_TRUSTED_PROXY_CIDRS: '0.0.0.0/33' }, { AUTH_TRUSTED_PROXY_CIDRS: 'forwarded' },
    ...['null', '[]', '{', '{"unknown":{}}', '{"login":{"ip":{"limit":0}}}',
      '{"login":{"ip":{"windowSeconds":1.5}}}', '{"verification-resend":{"cooldownSeconds":59}}',
      '{"login":{"extra":1}}'].map(AUTH_RATE_LIMITS_JSON => ({ AUTH_RATE_LIMITS_JSON })),
  ]) assert.throws(() => configuration({ ...env(), ...patch }), safeError('IDENTITY_CONFIG_INVALID'));
  const bucket = config.abuseDigest('login', 'opaque-canonical-identifier');
  assert.match(bucket, /^[a-f0-9]{64}$/);
  assert.ok(bucket !== config.abuseDigest('registration', 'opaque-canonical-identifier'));
});

test('S4 canonical 32-byte verifier generation/parser rejects aliases and unsafe values', () => {
  const first = api.generateVerifier();
  const second = api.generateVerifier();
  assert.ok(first !== second);
  assert.ok(api.parseVerifier(first) === first);
  const alias = first.slice(0, -1) + 'B'; // nonzero unused base64 bits
  for (const value of [alias, first + '=', ' ' + first, first.slice(1), null, 42]) {
    assert.throws(() => api.parseVerifier(value), safeError('VERIFIER_INVALID'));
  }
});

test('S4 account purpose and session digest domains match shared protocol', () => {
  const token = api.generateVerifier();
  const verification = api.accountTokenDigest('EMAIL_VERIFICATION', token);
  const expected = createHash('sha256').update('foxmind.account-token.v1\0EMAIL_VERIFICATION\0' + token).digest('hex');
  assert.ok(verification === expected);
  assert.match(verification, /^[a-f0-9]{64}$/);
  assert.ok(verification !== api.accountTokenDigest('PASSWORD_RESET', token));
  assert.ok(verification !== api.sessionTokenDigest(token));
  assert.throws(() => api.accountTokenDigest('invitation', token), safeError('VERIFIER_INVALID'));
});

test('S4 bound HMAC CSRF rejects wrong session/key, aliases and malformed inputs', () => {
  const config = configuration();
  const session = api.generateVerifier();
  const csrf = config.csrfToken(session);
  assert.ok(csrf !== session);
  assert.equal(config.validateCsrf(session, csrf), true);
  assert.equal(config.validateCsrf(api.generateVerifier(), csrf), false);
  assert.equal(configuration().validateCsrf(session, csrf), false);
  for (const value of [undefined, '', csrf + '=', 'B'.repeat(43)]) assert.equal(config.validateCsrf(session, value), false);
  assert.equal(config.validateCsrf('invalid', csrf), false);
  assert.throws(() => config.csrfToken('invalid'), safeError('VERIFIER_INVALID'));
});

test('S2 cookie scopes/clearing and exact-origin guard preserve policy', () => {
  const secure = configuration();
  const token = api.generateVerifier();
  const cookie = api.sessionCookie(secure, token, 10500, 10000);
  assert.ok(cookie.includes('foxmind_session='));
  for (const attribute of ['HttpOnly', 'SameSite=Lax', 'Path=/', 'Secure', 'Max-Age=0']) assert.ok(cookie.includes(attribute));
  assert.ok(!cookie.includes('Domain='));
  const clear = api.clearSessionCookie(secure);
  for (const attribute of ['Max-Age=0', 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Secure']) assert.ok(clear.includes(attribute));
  assert.ok(api.sessionCookie(secure, token, 13000, 10000).includes('Max-Age=3'));
  const local = configuration({ ...env(), APP_ORIGIN: 'http://127.0.0.1:3000', AUTH_LOCAL_HTTP: 'true' });
  assert.ok(!api.sessionCookie(local, token, 13000, 10000).includes('Secure'));
  assert.ok(!api.clearSessionCookie(local).includes('Secure'));
  assert.ok(api.sessionCookie(secure, token, 10000 + 86400000, 10000).includes('Max-Age=43200'));
  assert.throws(() => api.sessionCookie(secure, token, 10000, 10000), safeError('SESSION_INVALID'));
  secure.assertOrigin(secure.origin);
  for (const origin of [undefined, 'null', secure.origin + '/', 'https://other.example.test']) {
    assert.throws(() => secure.assertOrigin(origin), safeError('ORIGIN_NOT_ALLOWED'));
  }
});

test('S2 session reads do not touch idle, boundaries reject, rotation preserves absolute', () => {
  const start = 1000;
  const state = api.newSessionWindow(start);
  assert.equal(state.absoluteExpiresAt, start + 43200000);
  assert.equal(state.idleExpiresAt, start + 1800000);
  assert.equal(api.sessionIsActive(state, state.idleExpiresAt - 1), true);
  assert.equal(api.sessionIsActive(state, state.idleExpiresAt), false);
  const rotated = api.refreshSessionWindow(state, start + 100, false);
  assert.equal(rotated.idleExpiresAt, state.idleExpiresAt);
  assert.equal(rotated.absoluteExpiresAt, state.absoluteExpiresAt);
  const active = api.refreshSessionWindow(state, start + 100, true);
  assert.equal(active.idleExpiresAt, state.idleExpiresAt + 100);
  assert.equal(active.absoluteExpiresAt, state.absoluteExpiresAt);
  const nearEnd = { idleExpiresAt: state.absoluteExpiresAt, absoluteExpiresAt: state.absoluteExpiresAt };
  assert.equal(api.refreshSessionWindow(nearEnd, state.absoluteExpiresAt - 1, true).idleExpiresAt, state.absoluteExpiresAt);
  assert.equal(api.sessionIsActive(nearEnd, state.absoluteExpiresAt), false);
  assert.throws(() => api.refreshSessionWindow(state, state.idleExpiresAt, true), safeError('SESSION_INVALID'));
  assert.equal(api.IDENTITY_POLICY.verificationTtlSeconds, 3600);
  assert.equal(api.IDENTITY_POLICY.recoveryTtlSeconds, 900);
  assert.equal(api.IDENTITY_POLICY.resendMinimumSeconds, 60);
});

test('S4 Argon2id random salts, explicit costs, raw Unicode and dummy comparable work', async (t) => {
  const service = await api.createPasswordService(2);
  const raw = '  😀e\u0301' + password();
  const started = performance.now();
  const one = await service.hash(raw);
  const two = await service.hash(raw);
  const elapsed = performance.now() - started;
  assert.ok(one !== two);
  assert.ok(one.startsWith('$argon2id$v=19$m=19456,t=2,p=1$'));
  assert.equal(await service.verify(raw, one), true);
  assert.equal(await service.verify(password(), one), false);
  assert.equal(await service.verify(raw.trim(), one), false);
  assert.equal(await service.dummyCheck(raw), false);
  t.diagnostic(`Local two-hash elapsed milliseconds: ${Math.round(elapsed)}; not a production sizing claim.`);
});

test('S4 password capacity bounded with no unbounded queue and releases on failure', async (t) => {
  const logs = ['log', 'warn', 'error'].map(method => t.mock.method(console, method, () => {}));
  const service = await api.createPasswordService(1);
  const encoded = await service.hash(password());
  const first = service.hash(password());
  await assert.rejects(service.hash(password()), safeError('PASSWORD_CAPACITY_EXCEEDED'));
  await assert.rejects(service.verify(password(), encoded), safeError('PASSWORD_CAPACITY_EXCEEDED'));
  await assert.rejects(service.dummyCheck(password()), safeError('PASSWORD_CAPACITY_EXCEEDED'));
  await first;
  for (const invalid of ['malformed', encoded.replace('m=19456', 'm=999999999')]) {
    await assert.rejects(service.verify(password(), invalid), safeError('PASSWORD_OPERATION_FAILED'));
  }
  assert.ok(typeof await service.hash(password()) === 'string');
  await assert.rejects(service.hash('short'), safeError('VALIDATION_ERROR'));
  await assert.rejects(api.createPasswordService(0), safeError('IDENTITY_CONFIG_INVALID'));
  await assert.rejects(api.createPasswordService(9), safeError('IDENTITY_CONFIG_INVALID'));
  for (const log of logs) assert.equal(log.mock.callCount(), 0);
});
