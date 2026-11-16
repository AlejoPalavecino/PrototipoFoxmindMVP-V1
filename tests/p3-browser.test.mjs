import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { domainToUnicode } from 'node:url';
import { chromium } from '@playwright/test';
import { withP3BrowserRuntime } from '../scripts/p3-browser-runtime.mjs';

const original = 'Original browser password 😀', changed = 'Changed browser password 😀', recovered = 'Recovered browser password 😀';
async function visible(page, text) { await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 }); }
async function fill(page, values) { for (const [label, value] of Object.entries(values)) await page.locator('input').and(page.getByLabel(label, { exact: true })).fill(value); }
async function submit(page, name) { const button = page.getByRole('button', { name, exact: true }); await button.waitFor({ state: 'visible' }); await button.click({ timeout: 15000 }); }
function logoutButton(page) {
  const path = new URL(page.url()).pathname;
  const container = path === '/verify-email' ? page.getByRole('region', { name: 'Verificá tu correo', exact: true })
    : path === '/settings' ? page.getByRole('region', { name: 'Configuración de la cuenta', exact: true })
    : path === '/profile' ? page.getByRole('complementary', { name: 'Configuración de cuenta', exact: true }) : page;
  return container.getByRole('button', { name: 'Cerrar sesión', exact: true });
}
async function logout(page) {
  const button = logoutButton(page); await button.waitFor({ state: 'visible' }); await button.click({ timeout: 15000 });
}
async function openProfile(page) {
  await page.getByRole('link', { name: /^Mi perfil(?: de .+)?$/ }).click();
  await page.waitForURL('**/profile');
  await page.getByLabel('Nombre', { exact: true }).waitFor();
}
async function login(page, origin, email, password) {
  await page.goto(`${origin}/sign-in`);
  await fill(page, { 'Correo electrónico': email, 'Contraseña': password }); await submit(page, 'Iniciar sesión');
}
async function capture(inbox, email, purpose, minimum = 1) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    const response = await fetch(`${inbox}/api/v1/messages`, { signal: AbortSignal.timeout(2000) });
    const at = email.lastIndexOf('@');
    const messages = (await response.json()).messages.filter(message => message.To.some(to => {
      const wireAt = to.Address.lastIndexOf('@');
      return to.Address.slice(0, wireAt) === email.slice(0, at)
        && domainToUnicode(to.Address.slice(wireAt + 1)) === domainToUnicode(email.slice(at + 1));
    }));
    const links = [];
    for (const message of messages) {
      const detail = await (await fetch(`${inbox}/api/v1/message/${message.ID}`)).json();
      const link = new RegExp(`http://127\\.0\\.0\\.1:\\d+/${purpose}#token=[A-Za-z0-9_-]{43}`).exec(detail.Text)?.[0];
      if (link) links.push(link);
    }
    if (links.length >= minimum) return links;
    await delay(100);
  }
  throw new Error('Expected real captured account message unavailable');
}
async function openProof(page, link) {
  const document = await page.goto(link);
  // A fragment-only navigation has no new HTTP response; it still must recapture the proof.
  if (document) {
    assert.match(document.headers()['cache-control'], /no-store/);
    assert.equal(document.headers()['referrer-policy'], 'no-referrer');
    const html = await document.text();
    const captureIndex = html.indexOf('window.__foxmindTakeToken');
    assert.ok(captureIndex >= 0, 'synchronous token capture exists in the actual document');
    for (const resource of html.matchAll(/<(?:link\b[^>]*|script\b[^>]*\bsrc=)[^>]*>/g)) {
      assert.ok(resource.index > captureIndex, 'token capture precedes generated resource tags');
    }
  }
  await page.waitForFunction(() => location.hash === '');
  assert.equal(new URL(page.url()).hash, '');
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
}
async function state(page) { return page.evaluate(async () => (await fetch('/api/v1/auth/session')).json()); }

test('P3 real browser accounts, captured mail, session rotation, recovery, failures and restart', { timeout: 210000 }, async t => {
  await withP3BrowserRuntime(async ({ origin, inbox, db, restartApi }) => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const secondContext = await browser.newContext(); const second = await secondContext.newPage();
    const email = `Browser${Date.now()}@example.test`;
    const errors = []; const external = []; const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (new URL(request.url()).origin !== origin) external.push(new URL(request.url()).origin);
      if (request.url().includes('/api/v1/')) requests.push({ path: new URL(request.url()).pathname, method: request.method() });
    });
    try {
      await t.test('register and unverified sign-in use real session gates', async () => {
        await page.goto(`${origin}/register`);
        await fill(page, { Nombre: 'Ada', Apellido: 'Learner', 'Correo electrónico': email, 'Contraseña': original });
        await page.getByRole('radio', { name: 'Estudiante', exact: true }).check();
        await submit(page, 'Crear cuenta'); await visible(page, 'recibirás un correo de verificación');
        assert.deepEqual(await state(page), { authenticated: false });
        // Real Next client navigation must not inherit registration's resend cooldown.
        await page.getByRole('link', { name: 'Iniciar sesión', exact: true }).first().click();
        await page.waitForURL('**/sign-in');
        await fill(page, { 'Correo electrónico': email, 'Contraseña': original });
        assert.equal(await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).isEnabled(), true);
        await submit(page, 'Iniciar sesión'); await page.waitForURL('**/verify-email'); await visible(page, 'Revisa tu correo');
        const active = await state(page); assert.equal(active.authenticated, true); assert.equal(active.user.emailVerified, false);
        await page.goto(`${origin}/profile`); await visible(page, 'Primero verifica tu correo');
        assert.equal(await page.getByRole('button', { name: 'Guardar cambios', exact: true }).count(), 0);
      });
      let verification;
      await t.test('GET never consumes proof; explicit verification rotates cookie and rejects reuse', async () => {
        [verification] = await capture(inbox, email, 'verify-email');
        const before = (await context.cookies()).find(cookie => cookie.name === 'foxmind_session');
        const count = requests.filter(request => request.path.endsWith('/email-verification/confirm')).length;
        await openProof(page, verification); await visible(page, 'Confirma tu dirección');
        assert.equal((await state(page)).user.emailVerified, false);
        assert.equal(requests.filter(request => request.path.endsWith('/email-verification/confirm')).length, count);
        await submit(page, 'Confirmar verificación'); await visible(page, 'Tu correo está verificado');
        assert.equal((await state(page)).user.emailVerified, true);
        const after = (await context.cookies()).find(cookie => cookie.name === 'foxmind_session');
        assert.ok(after?.httpOnly); assert.equal(after?.sameSite, 'Lax'); assert.notEqual(before?.value, after?.value);
        await openProof(page, verification); await submit(page, 'Confirmar verificación');
        await page.getByRole('alert').waitFor(); assert.equal((await state(page)).user.emailVerified, true);
      });
      await t.test('profile persists in SQL across API restart with immutable email and no role setting', async () => {
        await page.goto(`${origin}/profile`); await page.getByLabel('Nombre', { exact: true }).waitFor();
        await fill(page, { Nombre: 'Ada María', Apellido: 'Lovelace' }); await submit(page, 'Guardar cambios');
        await visible(page, 'Guardaste los cambios');
        assert.equal(await page.getByLabel('Correo electrónico', { exact: true }).getAttribute('readonly'), '');
        assert.equal(await page.getByLabel('Rol', { exact: true }).getAttribute('readonly'), '');
        assert.equal(await page.getByRole('combobox').count(), 0);
        await restartApi(); await page.reload(); await page.getByLabel('Nombre', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Nombre', { exact: true }).inputValue(), 'Ada María');
        assert.equal((await state(page)).user.lastName, 'Lovelace');
      });
      await t.test('password change renews current session and revokes another real browser session', async () => {
        await login(second, origin, email, original); await second.waitForURL('**/inicio');
        const before = (await context.cookies()).find(cookie => cookie.name === 'foxmind_session');
        await page.goto(`${origin}/settings`);
        await fill(page, { 'Contraseña actual': original, 'Nueva contraseña': changed, 'Repetir contraseña': changed }); await submit(page, 'Cambiar contraseña');
        await visible(page, 'Tu sesión continúa');
        const after = (await context.cookies()).find(cookie => cookie.name === 'foxmind_session');
        assert.notEqual(before?.value, after?.value); assert.equal((await state(page)).authenticated, true);
        assert.deepEqual(await state(second), { authenticated: false });
        await logout(page); await page.waitForURL('**/sign-in');
        await login(page, origin, email, original); await page.getByRole('alert').waitFor();
        await login(page, origin, email, changed); await page.waitForURL('**/inicio');
        await openProfile(page);
      });
      let recovery;
      await t.test('captured recovery requires explicit confirmation and revokes all sessions without login', async () => {
        await login(second, origin, email, changed); await second.waitForURL('**/inicio');
        await logout(page); await page.waitForURL('**/sign-in');
        await page.goto(`${origin}/forgot-password`); await fill(page, { 'Correo electrónico': email }); await submit(page, 'Enviar enlace de recuperación');
        await visible(page, 'Si existe una cuenta'); [recovery] = await capture(inbox, email, 'recover-password');
        await openProof(page, recovery); await visible(page, 'Confirmar nueva contraseña');
        assert.equal((await state(second)).authenticated, true);
        await fill(page, { 'Nueva contraseña': recovered, 'Repetir contraseña': recovered }); await submit(page, 'Confirmar nueva contraseña');
        await visible(page, 'Las sesiones anteriores se cerraron');
        assert.deepEqual(await state(page), { authenticated: false }); assert.deepEqual(await state(second), { authenticated: false });
        await openProof(page, recovery); await fill(page, { 'Nueva contraseña': original, 'Repetir contraseña': original }); await submit(page, 'Confirmar nueva contraseña');
        await page.getByRole('alert').waitFor();
        await login(page, origin, email, changed); await page.getByRole('alert').waitFor();
        await login(page, origin, email, recovered); await page.waitForURL('**/inicio');
        await openProfile(page);
      });
      await t.test('expired verification and recovery links reject without changing credentials', async () => {
        await logout(page); await page.waitForURL('**/sign-in');
        const expiredEmail = `Expired${Date.now()}@example.test`;
        await page.goto(`${origin}/register`); await fill(page, { Nombre: 'Expiry', Apellido: 'Learner', 'Correo electrónico': expiredEmail, 'Contraseña': original });
        await page.getByRole('radio', { name: 'Estudiante', exact: true }).check();
        await submit(page, 'Crear cuenta'); await visible(page, 'recibirás un correo');
        const [verify] = await capture(inbox, expiredEmail, 'verify-email');
        await db.query("UPDATE account_tokens SET expires_at=clock_timestamp() WHERE user_id=(SELECT id FROM users WHERE email=$1)", [expiredEmail]);
        await openProof(page, verify); await submit(page, 'Confirmar verificación'); await page.getByRole('alert').waitFor();
        await page.goto(`${origin}/forgot-password`); await fill(page, { 'Correo electrónico': expiredEmail }); await submit(page, 'Enviar enlace de recuperación');
        await visible(page, 'Si existe una cuenta'); const [reset] = await capture(inbox, expiredEmail, 'recover-password');
        await db.query("UPDATE account_tokens SET expires_at=clock_timestamp() WHERE purpose='PASSWORD_RESET' AND user_id=(SELECT id FROM users WHERE email=$1)", [expiredEmail]);
        await openProof(page, reset); await fill(page, { 'Nueva contraseña': recovered, 'Repetir contraseña': recovered }); await submit(page, 'Confirmar nueva contraseña'); await page.getByRole('alert').waitFor();
        await login(page, origin, expiredEmail, original); await page.waitForURL('**/verify-email'); assert.equal((await state(page)).user.emailVerified, false);
      });
      await t.test('resend captures a current link and its cooldown still permits logout', async () => {
        const current = await state(page);
        await db.query("UPDATE account_tokens SET created_at=clock_timestamp()-interval '61 seconds' WHERE purpose='EMAIL_VERIFICATION' AND user_id=$1", [current.user.id]);
        await submit(page, 'Reenviar correo'); await visible(page, 'Solicitud aceptada');
        const links = await capture(inbox, current.user.email, 'verify-email', 2);
        assert.equal(links.length, 2);
        assert.equal(await page.getByRole('button', { name: 'Reenviar correo', exact: true }).isDisabled(), true);
        assert.equal(await logoutButton(page).isEnabled(), true);
        await logout(page); await page.waitForURL('**/sign-in');
        assert.deepEqual(await state(page), { authenticated: false });
        // Reopening the expired/superseded link remains rejected after an actual resend.
        await openProof(page, links[1]); await submit(page, 'Confirmar verificación'); await page.getByRole('alert').waitFor();
        await openProof(page, links[0]); await submit(page, 'Confirmar verificación'); await visible(page, 'Tu correo está verificado');
        assert.deepEqual(await state(page), { authenticated: false });
        await login(page, origin, current.user.email, original); await page.waitForURL('**/inicio');
        await openProfile(page);
      });
      await t.test('quoted and international mailboxes retain spelling through real browser and SMTP', async () => {
        for (const mailbox of [`"Quoted Learner ${Date.now()}"@example.test`, `Élève${Date.now()}@bücher.example`]) {
          await logout(page); await page.waitForURL('**/sign-in');
          await page.goto(`${origin}/register`);
          await fill(page, { Nombre: 'Élève', Apellido: 'Learner', 'Correo electrónico': mailbox, 'Contraseña': original });
          await page.getByRole('radio', { name: 'Estudiante', exact: true }).check();
          await submit(page, 'Crear cuenta'); await visible(page, 'recibirás un correo');
          await capture(inbox, mailbox, 'verify-email');
          await login(page, origin, mailbox, original); await page.waitForURL('**/verify-email');
          assert.equal((await state(page)).user.email, mailbox);
        }
      });
      await t.test('responsive forms, keyboard focus and safe failure retry preserve navigation', async () => {
        await logout(page); await page.waitForURL('**/sign-in');
        for (const width of [320, 375, 1280]) {
          await page.setViewportSize({ width, height: 900 }); await page.goto(`${origin}/register`); await page.getByRole('heading', { name: 'Creá tu cuenta', exact: true }).waitFor();
          await page.getByRole('button', { name: 'Crear cuenta', exact: true }).waitFor({ state: 'visible' });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.keyboard.press('Tab'); assert.ok(await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement !== document.body));
          await page.screenshot({ path: `.test-artifacts/p3-register-${width}.png`, fullPage: true });
        }
        await page.route('**/api/v1/auth/session', route => route.abort()); await page.reload(); await visible(page, 'No se pudo comprobar tu sesión');
        await page.unroute('**/api/v1/auth/session'); await submit(page, 'Volver a intentar'); await visible(page, 'Crear cuenta');
        assert.equal((await state(page)).authenticated, false);
        assert.equal(external.length, 0, 'account documents fetch no third-party resources');
        assert.deepEqual(errors, [], 'no browser runtime exception');
      });
    } finally { await browser.close(); }
  });
});
