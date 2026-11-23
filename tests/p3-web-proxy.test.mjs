import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { proxyAccountRequest } from '../apps/web/src/application/server/identity-proxy.ts';

test('proxy-owned failures preserve the public request identifier contract', async () => {
  const response = await proxyAccountRequest(new Request('http://127.0.0.1:3000/api/v1/auth/session'), undefined);
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.match(body.error.requestId ?? '', /^[a-f0-9-]{36}$/);
  assert.equal(response.headers.get('x-request-id'), body.error.requestId);
  assert.deepEqual(Object.keys(body.error).sort(), ['code', 'requestId']);
});
import { tokenCaptureScript } from '../apps/web/src/application/server/token-capture.ts';
import vm from 'node:vm';

const origin = 'http://127.0.0.1:3001';
test('proxy forwards only exact account operations and security headers, preserves cookies', async () => {
  let observed;
  const upstream = async (url, init) => {
    observed = { url: String(url), init };
    return new Response('{"authenticated":false}', { headers: { 'set-cookie': 'foxmind_session=rotated; HttpOnly; SameSite=Lax', 'retry-after': '60' } });
  };
  const request = new Request('http://localhost:3000/api/v1/auth/login', {
    method: 'POST', body: '{"email":"x@example.com","password":"secret"}',
    headers: { origin: 'http://localhost:3000', cookie: 'foxmind_session=old', 'content-type': 'application/json', 'x-csrf-token': 'bound', 'x-forwarded-host': 'evil.test', authorization: 'Bearer ignored' },
  });
  const result = await proxyAccountRequest(request, origin, upstream);
  assert.equal(result.status, 200);
  assert.equal(observed.url, `${origin}/api/v1/auth/login`);
  assert.equal(observed.init.headers.get('origin'), 'http://localhost:3000');
  assert.equal(observed.init.headers.get('cookie'), 'foxmind_session=old');
  assert.equal(observed.init.headers.get('x-csrf-token'), 'bound');
  assert.equal(observed.init.headers.has('authorization'), false);
  assert.equal(observed.init.headers.has('x-forwarded-host'), false);
  assert.equal(observed.init.redirect, 'manual');
  assert.match(result.headers.get('set-cookie'), /rotated/);
  assert.equal(result.headers.get('retry-after'), '60');
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
});

test('unknown paths, queries, methods and oversized bodies never reach backend', async () => {
  let calls = 0;
  const upstream = async () => { calls++; return new Response('{}'); };
  for (const [path, method, status] of [['/admin','GET',404], ['/account?token=secret','GET',400], ['/account','DELETE',405]]) {
    const response = await proxyAccountRequest(new Request(`http://localhost/api/v1${path}`, { method }), origin, upstream);
    assert.equal(response.status, status);
  }
  const overflow = await proxyAccountRequest(new Request('http://localhost/api/v1/auth/register', { method: 'POST', body: 'x'.repeat(16385), headers: { 'content-type': 'application/json' } }), origin, upstream);
  assert.equal(overflow.status, 413);
  assert.equal(calls, 0);
});

test('missing or unsafe backend configuration, upstream errors and redirects are sanitized', async () => {
  const request = () => new Request('http://localhost/api/v1/auth/session');
  for (const unsafe of [undefined, 'http://remote.test', 'https://user:password@remote.test', 'https://remote.test/path']) {
    const response = await proxyAccountRequest(request(), unsafe, async () => { throw new Error('must not run'); });
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /password|remote|stack/);
  }
  const failure = await proxyAccountRequest(request(), origin, async () => { throw new Error('private details'); });
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /private/);
  const redirect = await proxyAccountRequest(request(), origin, async () => new Response(null, { status: 302, headers: { location: 'https://evil.test' } }));
  assert.equal(redirect.status, 503);
});

test('token script clears fragment synchronously and exposes a one-time in-memory reader only', () => {
  const token = 'x'.repeat(43);
  const events = [];
  const context = { window: new EventTarget(), location: { pathname: '/verify-email', search: '', hash: `#token=${token}` }, history: { state: null, replaceState: (...args) => events.push(args) }, URLSearchParams, Event };
  vm.runInNewContext(tokenCaptureScript, context);
  assert.equal(events.length, 1);
  assert.equal(events[0][2], '/verify-email');
  assert.equal(context.window.__foxmindTakeToken(), token);
  assert.equal(context.window.__foxmindTakeToken(), null);
  assert.doesNotMatch(tokenCaptureScript, /localStorage|sessionStorage|fetch\(/);
});

test('malformed or ambiguous token fragments are cleared without enabling confirmation', () => {
  for (const hash of ['#token=short', `#token=${'x'.repeat(43)}&token=${'y'.repeat(43)}`, `#token=${'x'.repeat(43)}&extra=1`]) {
    const cleared = [];
    const context = { window: new EventTarget(), location: { pathname: '/recover-password', search: '', hash }, history: { state: null, replaceState: (...args) => cleared.push(args) }, URLSearchParams, Event };
    vm.runInNewContext(tokenCaptureScript, context);
    assert.equal(cleared[0][2], '/recover-password');
    assert.equal(context.window.__foxmindTakeToken(), null);
  }
});

test('chunked request body limit applies without a Content-Length header', async () => {
  let calls = 0;
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(10_000)); controller.enqueue(new Uint8Array(10_000)); controller.close(); } });
  const request = new Request('http://localhost/api/v1/auth/register', { method: 'POST', body: stream, duplex: 'half' });
  const response = await proxyAccountRequest(request, origin, async () => { calls++; return new Response('{}'); });
  assert.equal(response.status, 413);
  assert.equal(calls, 0);
});

test('oversized backend response is a sanitized service failure, not a caller body error', async () => {
  const response = await proxyAccountRequest(new Request('http://localhost/api/v1/auth/session'), origin, async () => new Response('private'.repeat(4000)));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /private/);
});

test('same-document proof navigation clears fragments and exposes each new proof only once', () => {
  const window = new EventTarget();
  const location = { pathname: '/verify-email', search: '', hash: `#token=${'x'.repeat(43)}` };
  const history = { state: null, replaceState: () => { location.hash = ''; } };
  vm.runInNewContext(tokenCaptureScript, { window, location, history, URLSearchParams, Event });
  assert.equal(window.__foxmindTakeToken(), 'x'.repeat(43));
  const observed = [];
  const receive = () => observed.push({ hash: location.hash, token: window.__foxmindTakeToken() });
  window.addEventListener('foxmind:account-proof', receive);
  location.hash = `#token=${'y'.repeat(43)}`;
  window.dispatchEvent(new Event('hashchange'));
  assert.equal(location.hash, '');
  assert.deepEqual(observed, [{ hash: '', token: 'y'.repeat(43) }]);
  assert.equal(window.__foxmindTakeToken(), null);
  location.hash = '#token=short'; window.dispatchEvent(new Event('hashchange'));
  assert.equal(location.hash, ''); assert.equal(observed[1].token, null);
  window.removeEventListener('foxmind:account-proof', receive);
  location.hash = `#token=${'z'.repeat(43)}`; window.dispatchEvent(new Event('hashchange'));
  location.pathname = '/recover-password';
  assert.equal(window.__foxmindTakeToken(), null, 'a different proof purpose cannot take a pending token');
});

test('aborted, oversized and timed-out bodies handle rejected cancellation without unhandled errors', () => {
  const moduleUrl = new URL('../apps/web/src/application/server/identity-proxy.ts', import.meta.url).href;
  const source = `
    import assert from 'node:assert/strict';
    import { setImmediate as tick } from 'node:timers/promises';
    import { proxyAccountRequest } from ${JSON.stringify(moduleUrl)};
    let forwarded = 0;
    const upstream = async () => { forwarded++; return new Response('{}'); };
    const cases = [
      [503, new ReadableStream({ start(c) { c.error(new Error('owned aborted body')); } })],
      [413, new ReadableStream({ start(c) { c.enqueue(new Uint8Array(16385)); }, cancel() { return Promise.reject(new Error('owned overflow cancellation')); } })],
      [503, new ReadableStream({ cancel() { return Promise.reject(new Error('owned deadline cancellation')); } })],
    ];
    for (const [status, body] of cases) {
      const request = new Request('http://localhost/api/v1/auth/register', { method: 'POST', body, duplex: 'half' });
      const response = await proxyAccountRequest(request, 'http://127.0.0.1:3001', upstream);
      assert.equal(response.status, status);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.ok((await response.json()).error.requestId);
      await tick();
    }
    assert.equal(forwarded, 0);
    console.log('Three bounded body failures handled');
  `;
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, ['--unhandled-rejections=strict', '--input-type=module', '--eval', source], {
    env, encoding: 'utf8', windowsHide: true, timeout: 30000,
  });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Three bounded body failures handled/);
});

test('page CSP authorizes inline scripts only by a fresh per-request nonce', async () => {
  const { pageContentSecurityPolicy, readNonce } = await import('../apps/web/src/application/server/content-security-policy.ts');
  const { loadTsModule } = await import('./helpers/load-ts-module.mjs');
  const { proxy, config: proxyConfig } = loadTsModule('apps/web/proxy.ts');
  const directives = policy => Object.fromEntries(policy.split(';').map(part => part.trim().split(/\s+/)).map(([name, ...values]) => [name, values]));
  const nonceOf = response => /'nonce-([^']+)'/.exec(response.headers.get('content-security-policy'))?.[1];
  const first = proxy(new Request('http://127.0.0.1:3000/sign-in', { headers: { 'x-nonce': 'attacker' } }));
  const second = proxy(new Request('http://127.0.0.1:3000/sign-in'));
  const nonce = nonceOf(first);
  assert.equal(readNonce(nonce), nonce);
  assert.notEqual(nonce, nonceOf(second));
  assert.equal(first.headers.get('x-middleware-request-x-nonce'), nonce);
  assert.equal(first.headers.get('x-middleware-request-content-security-policy'), first.headers.get('content-security-policy'));
  const page = directives(first.headers.get('content-security-policy'));
  assert.deepEqual(page['script-src'], ["'self'", `'nonce-${nonce}'`]);
  assert.deepEqual(page['object-src'], ["'none'"]);
  assert.deepEqual(page['frame-ancestors'], ["'none'"]);
  assert.ok(directives(pageContentSecurityPolicy(nonce, true))['script-src'].includes("'unsafe-eval'"));
  for (const forged of ['attacker', '"><script>', undefined, ['a', 'b']]) assert.equal(readNonce(forged), undefined);
  assert.deepEqual(proxyConfig.matcher, ['/((?!api/|_next/static/|_next/image|favicon\\.ico).*)']);

  const { default: nextConfig } = await import('../apps/web/next.config.mjs');
  const rules = await nextConfig.headers();
  const csp = rules.filter(rule => rule.headers.some(header => header.key === 'Content-Security-Policy'));
  assert.deepEqual(csp.map(rule => rule.source), ['/api/:path*', '/_next/:path*']);
  for (const rule of csp) assert.deepEqual(directives(rule.headers.find(header => header.key === 'Content-Security-Policy').value)['script-src'], ["'self'"]);
});
