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
