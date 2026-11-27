import test from 'node:test';
import assert from 'node:assert/strict';
import { createCsrfSource, withCsrf } from '../apps/web/src/shared/http/csrf.ts';
import { ClientError, errorCode } from '../src/core/contracts/client-error.ts';
import { createJsonRequest } from '../apps/web/src/application/transport/json-request.ts';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { AccountError } from '../apps/web/src/features/identity/api/account-client.ts';
import { AgendaClientError } from '../apps/web/src/features/agenda/api/api.ts';

const { createWebAgendaClient } = loadTsModule('apps/web/src/application/clients/agenda-client.ts');

test('a CSRF source reads the token once, shares it and reads again after invalidation or failure', async () => {
  let reads = 0, fail = true;
  const source = createCsrfSource(async () => { reads++; if (fail) { fail = false; throw new Error('offline'); } return 'token-' + reads; });
  await assert.rejects(source.token(), /offline/);
  assert.deepEqual(await Promise.all([source.token(), source.token()]), ['token-2', 'token-2']);
  assert.equal(reads, 2);
  source.invalidate();
  assert.equal(await source.token(), 'token-3');
});

test('withCsrf drops a rejected token without resending the mutation', async () => {
  let reads = 0;
  const source = createCsrfSource(async () => 'token-' + ++reads);
  const sent = [];
  const reject = code => token => { sent.push(token); throw Object.assign(new Error(code), { code }); };
  await assert.rejects(withCsrf(source, reject('FORBIDDEN')), { code: 'FORBIDDEN' });
  await assert.rejects(withCsrf(source, reject('CSRF_INVALID')), { code: 'CSRF_INVALID' });
  await withCsrf(source, async token => { sent.push(token); });
  assert.deepEqual(sent, ['token-1', 'token-1', 'token-2'], 'one request per call; only CSRF_INVALID refreshes the token');
});

test('a caller that leaves while the token is read gets an abort, and the token stays for the next caller', async () => {
  let finish;
  const source = createCsrfSource(() => new Promise(resolve => { finish = resolve; }));
  const lifetime = new AbortController();
  const pending = source.token(lifetime.signal);
  lifetime.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  finish('late');
  assert.equal(await source.token(), 'late');
});

test('the academic transport reuses its token and reads a new one after a rotated session', async () => {
  const calls = [];
  let reads = 0, rejectNext = false;
  const source = createCsrfSource(async () => 'token-' + ++reads);
  const response = createJsonRequest({ csrfToken: source.token, invalidateCsrf: source.invalidate, fetch: async (path, init) => {
    calls.push({ path, method: init.method, token: init.headers['X-CSRF-Token'] });
    if (rejectNext && init.method !== 'GET') { rejectNext = false; return Response.json({ error: { code: 'CSRF_INVALID' } }, { status: 403 }); }
    return Response.json({ ok: true });
  } });
  await response('/a', 'POST', {});
  await response('/b', 'GET');
  await response('/c', 'PATCH', {});
  rejectNext = true;
  await assert.rejects(response('/d', 'POST', {}), { code: 'CSRF_INVALID' });
  await response('/e', 'POST', {});
  assert.deepEqual(calls.map(call => [call.path, call.token]), [
    ['/a', 'token-1'], ['/b', undefined], ['/c', 'token-1'], ['/d', 'token-1'], ['/e', 'token-2'],
  ]);
  assert.equal(reads, 2);
});

test('without an invalidation hook the transport keeps asking for a token per mutation and surfaces CSRF_INVALID', async () => {
  let reads = 0;
  const response = createJsonRequest({ csrfToken: async () => String(++reads),
    fetch: async () => Response.json({ error: { code: 'CSRF_INVALID' } }, { status: 403 }) });
  await assert.rejects(response('/a', 'POST', {}), { code: 'CSRF_INVALID' });
  assert.equal(reads, 1);
});

test('the agenda client asks for the CSRF token once per client instance and renews it after CSRF_INVALID', async () => {
  const requests = [];
  let tokens = 0, rejectNext = false;
  const fetcher = async (path, init = {}) => {
    if (path === '/api/v1/auth/csrf') return Response.json({ csrfToken: 'agenda-' + ++tokens });
    requests.push([init.method, init.headers['X-CSRF-Token']]);
    if (rejectNext) { rejectNext = false; return Response.json({ error: { code: 'CSRF_INVALID' } }, { status: 403 }); }
    return new Response(null, { status: 204 });
  };
  const client = createWebAgendaClient(fetcher);
  const id = '11111111-1111-4111-8111-111111111111';
  await client.remove(id, '1');
  await client.remove(id, '2');
  rejectNext = true;
  await assert.rejects(client.remove(id, '3'), { code: 'CSRF_INVALID' });
  await client.remove(id, '4');
  assert.deepEqual(requests, [['DELETE', 'agenda-1'], ['DELETE', 'agenda-1'], ['DELETE', 'agenda-1'], ['DELETE', 'agenda-2']]);
});

test('client errors share one base with code, status and retryAfter', () => {
  const errors = [new AccountError('RATE_LIMITED', 429, 30), new AgendaClientError('CONFLICT', 409, { revision: '2' })];
  for (const error of errors) assert.ok(error instanceof ClientError);
  assert.deepEqual([errors[0].code, errors[0].status, errors[0].retryAfter], ['RATE_LIMITED', 429, 30]);
  assert.deepEqual(errors[1].details, { revision: '2' });
  assert.equal(errors[1].message, 'Este evento cambió en otra pestaña. Recargá la versión guardada antes de volver a guardar.');
  assert.equal(errorCode({ error: { code: 'FORBIDDEN' } }), 'FORBIDDEN');
  assert.equal(errorCode(null), 'SERVICE_UNAVAILABLE');
});

test('a session change announced by an account mutation drops every cached token', async () => {
  const { forgetSessionCsrfTokens } = await import('../apps/web/src/shared/http/csrf.ts');
  let reads = 0;
  const source = createCsrfSource(async () => 'token-' + ++reads);
  assert.equal(await source.token(), 'token-1');
  assert.equal(await source.token(), 'token-1');
  forgetSessionCsrfTokens();
  assert.equal(await source.token(), 'token-2');
});

test('account mutations announce that the session may have changed', async () => {
  const { createAccountClient } = await import('../apps/web/src/features/identity/api/account-client.ts');
  const { sessionChangedEvent } = await import('../src/core/contracts/csrf.ts');
  const events = [], original = globalThis.dispatchEvent;
  globalThis.dispatchEvent = event => { events.push(event.type); return true; };
  try {
    const client = createAccountClient(async path => {
      if (path.endsWith('/auth/session')) return Response.json({ authenticated: false });
      return Response.json({ ok: true });
    });
    await client.mutate('/auth/login', { email: 'a@example.test', password: 'x'.repeat(16) });
    assert.deepEqual(events, [sessionChangedEvent]);
  } finally { globalThis.dispatchEvent = original; }
});

test('the session source keeps the API error code when the token cannot be read', async () => {
  const { createSessionCsrfSource } = await import('../apps/web/src/shared/http/csrf.ts');
  const denied = createSessionCsrfSource(async () => Response.json({ error: { code: 'AUTH_REQUIRED' } }, { status: 401 }));
  await assert.rejects(denied.token(), { code: 'AUTH_REQUIRED', status: 401 });
  let reads = 0;
  const ok = createSessionCsrfSource(async path => { assert.equal(path, '/api/v1/auth/csrf'); reads++; return Response.json({ csrfToken: 'session-token' }); });
  assert.equal(await ok.token(), 'session-token');
  assert.equal(await ok.token(), 'session-token');
  assert.equal(reads, 1);
});

test('Foxy, Study and Files clients reuse an injected token and drop it on CSRF_INVALID', async () => {
  const { createWebFoxyClient } = loadTsModule('apps/web/src/features/foxy/api/foxy-client.ts');
  const { createStudyClient } = loadTsModule('apps/web/src/features/study/api/study-http.ts');
  const { createFileClient } = loadTsModule('apps/web/src/features/files/api/client.ts');
  let reads = 0;
  function source() { return createCsrfSource(async () => 'shared-' + ++reads); }
  const sent = [];
  let reject = false;
  const fetcher = async (path, init = {}) => {
    if (path.endsWith('/auth/csrf')) throw new Error('the injected source must be used');
    sent.push(init.headers?.['X-CSRF-Token']);
    if (reject) { reject = false; return Response.json({ error: { code: 'CSRF_INVALID' } }, { status: 403 }); }
    return Response.json({ id: 'f', name: 'n', ready: false, validation: 'PENDING', scan: 'PENDING', rejectionCode: null });
  };
  const study = createStudyClient(fetcher, source());
  await study.call('/x', 'POST', {});
  await study.call('/x', 'POST', {});
  reject = true;
  await assert.rejects(study.call('/x', 'POST', {}), { code: 'CSRF_INVALID' });
  await study.call('/x', 'POST', {});
  assert.deepEqual(sent.splice(0), ['shared-1', 'shared-1', 'shared-1', 'shared-2']);
  const files = createFileClient(fetcher, source());
  const file = new File(['x'], 'a.pdf');
  await files.begin({ kind: 'draft', id: 'd', purpose: 'plan' }, file);
  await files.begin({ kind: 'draft', id: 'd', purpose: 'plan' }, file);
  assert.deepEqual(sent.splice(0), ['shared-3', 'shared-3']);
  const foxy = createWebFoxyClient(fetcher, undefined, source());
  const id = '11111111-1111-4111-8111-111111111111';
  await foxy.cancelVisual(id, id).catch(() => {});
  await foxy.cancelVisual(id, id).catch(() => {});
  reject = true;
  await assert.rejects(foxy.cancelVisual(id, id), { code: 'CSRF_INVALID' });
  await foxy.cancelVisual(id, id).catch(() => {});
  assert.deepEqual(sent.splice(0), ['shared-4', 'shared-4', 'shared-4', 'shared-5']);
});
