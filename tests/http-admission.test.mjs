import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { IdentityHttpError } from '../.build/api/apps/api/src/modules/identity/domain/errors.js';
import { admitRequest, assertWriteGuard } from '../.build/api/apps/api/src/bootstrap/http-admission.js';

const verifier = randomBytes(32).toString('base64url');
function runtime(options = {}) {
  const security = {
    clientAddress: () => '203.0.113.9',
    assertOrigin(origin) { if (origin !== 'https://web.test') throw new IdentityHttpError('ORIGIN_NOT_ALLOWED'); },
    validateCsrf: (raw, submitted) => raw === verifier && submitted === 'valid',
  };
  return {
    configuration: { security },
    async authenticateVerifier() { return { verifier, sessionId: 's', user: { id: 'u', account_role: 'teacher', email_verified_at: new Date() } }; },
    async generalAdmission() { if (options.rateLimited) throw new IdentityHttpError('RATE_LIMITED', 17); },
  };
}
const request = (method, headers = {}) => ({ method, headers: { cookie: `foxmind_session=${verifier}`, ...headers }, socket: {} });
const response = () => { const headers = new Map(); return { headers, headersSent: false, setHeader: (name, value) => headers.set(name.toLowerCase(), value) }; };

test('every rejected admission carries Retry-After from the budget, whatever host maps the error', async () => {
  const res = response();
  await assert.rejects(admitRequest(runtime({ rateLimited: true }), request('GET'), res), { code: 'RATE_LIMITED' });
  assert.equal(res.headers.get('retry-after'), '17');
});

test('origin and CSRF are required on every method that is not GET or HEAD', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    await assert.rejects(admitRequest(runtime(), request(method, { origin: 'https://web.test' }), response()), { code: 'CSRF_INVALID' }, method);
    await assert.rejects(admitRequest(runtime(), request(method, { origin: 'https://evil.test', 'x-csrf-token': 'valid' }), response()), { code: 'ORIGIN_NOT_ALLOWED' }, method);
    assert.ok(await admitRequest(runtime(), request(method, { origin: 'https://web.test', 'x-csrf-token': 'valid' }), response()), method);
  }
  for (const method of ['GET', 'HEAD']) assert.doesNotThrow(() => assertWriteGuard(runtime().configuration.security, request(method), verifier, false), method);
  assert.throws(() => assertWriteGuard(runtime().configuration.security, request('GET', { origin: 'https://web.test' }), verifier, true), { code: 'CSRF_INVALID' }, 'a handler may mark a GET as a write');
});

test('no host reaches the identity store directly', async () => {
  const dir = 'apps/api/src/bootstrap';
  for (const name of (await readdir(dir)).filter(file => file.endsWith('.ts'))) {
    const source = await readFile(`${dir}/${name}`, 'utf8');
    assert.doesNotMatch(source, /\b(?:runtime|identity)\.store\b/, name);
  }
});
