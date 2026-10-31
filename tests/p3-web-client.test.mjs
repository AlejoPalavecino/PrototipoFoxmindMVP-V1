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
