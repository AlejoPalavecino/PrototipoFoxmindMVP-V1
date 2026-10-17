import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccountClient, AccountError, validateAccountFields } from '../apps/web/src/lib/account-client.ts';

test('every mutation obtains fresh session/CSRF and refreshes after rotation', async () => {
  const seen = [];
  let sessionReads = 0;
  const client = createAccountClient(async (url, init) => {
    seen.push({ url, init });
    if (url.endsWith('/auth/session')) { sessionReads++; return Response.json({ authenticated: true, user: { emailVerified: true } }); }
    if (url.endsWith('/auth/csrf')) return Response.json({ csrfToken: sessionReads === 1 ? 'old-binding' : 'rotated-binding' });
    return new Response(null, { status: 204 });
  });
  await client.mutate('/account/password', { currentPassword: ' raw old password ', newPassword: ' raw new password ' });
  assert.deepEqual(seen.map(x => x.url), ['/api/v1/auth/session','/api/v1/auth/csrf','/api/v1/account/password','/api/v1/auth/session','/api/v1/auth/csrf']);
  assert.equal(seen[2].init.headers['X-CSRF-Token'], 'old-binding');
  assert.equal(JSON.parse(seen[2].init.body).newPassword, ' raw new password ');
  assert.equal(seen[2].init.credentials, 'same-origin');
});

test('anonymous mutation omits CSRF and preserves broad mailbox spelling', async () => {
  let body;
  const client = createAccountClient(async (url, init) => {
    if (url.endsWith('/auth/session')) return Response.json({ authenticated: false });
    body = init;
    return Response.json({ status: 'accepted' }, { status: 202 });
  });
  await client.mutate('/auth/password-recovery/request', { email: '"Alumno ejemplo"@mañana.test' });
  assert.equal(body.headers['X-CSRF-Token'], undefined);
  assert.equal(JSON.parse(body.body).email, '"Alumno ejemplo"@mañana.test');
});

test('rate-limit metadata remains available and server details never become UI copy', async () => {
  const client = createAccountClient(async () => Response.json({ error: { code: 'RATE_LIMITED', secret: 'private detail' } }, { status: 429, headers: { 'Retry-After': '60' } }));
  await assert.rejects(client.read('/auth/session'), error => error instanceof AccountError && error.retryAfter === 60 && !error.message.includes('private'));
});

test('validation counts raw Unicode code points without trimming passwords or names', () => {
  assert.equal(validateAccountFields({ password: '😀'.repeat(16), firstName: 'A'.repeat(80) }), null);
  assert.match(validateAccountFields({ password: '😀'.repeat(15) }), /16/);
  assert.match(validateAccountFields({ firstName: ' '.repeat(80) + 'A' }), /80/);
  assert.equal(validateAccountFields({ email: '"Alumno ejemplo"@mañana.test' }), null);
  assert.match(validateAccountFields({ email: 'Alumno@Mañana.test' }), /minúsculas/);
});

test('actual account navigation releases registration cooldown before sign-in', { skip: !process.env.FOXMIND_WEB_TEST_ORIGIN }, async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  try {
    const page = await browser.newPage();
    let registerCalls = 0;
    await page.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/v1/auth/register') { registerCalls++; return route.fulfill({ status: 202, json: { status: 'accepted' } }); }
      if (path === '/api/v1/auth/session') return route.fulfill({ json: { authenticated: false } });
      return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
    });
    await page.goto(`${process.env.FOXMIND_WEB_TEST_ORIGIN}/register`);
    await page.getByLabel('Nombre', { exact: true }).fill('Alumno');
    await page.getByLabel('Apellido', { exact: true }).fill('Prueba');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('"Alumno prueba"@mañana.test');
    await page.getByLabel('Contraseña', { exact: true }).fill('Una contraseña de prueba');
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await page.getByText(/Podrás volver a intentar en/).waitFor();
    assert.equal(registerCalls, 1);
    await page.locator('.after-form').getByRole('link', { name: 'Iniciar sesión', exact: true }).click();
    await page.waitForURL('**/sign-in');
    await page.getByLabel('Correo electrónico', { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('fieldset')?.disabled);
    assert.equal(await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).isEnabled(), true);
    assert.equal(await page.getByText(/Podrás volver a intentar en/).count(), 0);
  } finally { await browser.close(); }
});

test('actual token document clears fragment before every generated resource tag', { skip: !process.env.FOXMIND_WEB_TEST_ORIGIN }, async () => {
  const response = await fetch(`${process.env.FOXMIND_WEB_TEST_ORIGIN}/verify-email`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  const html = await response.text();
  const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
  assert.match(head, /<title[^>]*>Verifica tu correo · FoxMind<\/title>/);
  const capture = head.indexOf('window.__foxmindTakeToken');
  assert.ok(capture > 0);
  const scriptStart = head.lastIndexOf('<script', capture);
  const firstResource = head.search(/<(?:script|link)\b/);
  assert.equal(scriptStart, firstResource);
});
