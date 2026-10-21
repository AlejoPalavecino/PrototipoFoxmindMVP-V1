import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, password } from './p4-integration-helpers.mjs';
import { classroom } from './p6-integration-helpers.mjs';
import { navigationLink, profileAction, visibleNavigation } from './entry-glass-browser-helpers.mjs';

const artifacts = resolve('.test-artifacts/entry-glass');
function luminance(rgb) {
  return rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; })
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
function contrast(first, second) { const a = luminance(rgb(first)), b = luminance(rgb(second)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
async function fit(page, width) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page overflow at${width}`);
  const boxes = await page.locator('.fm-navbar').evaluate(element => {
    const header = element.getBoundingClientRect();
    return { width: header.width, left: header.left, right: header.right, height: header.height };
  });
  assert.ok(boxes.left >= 0 && boxes.right <= width, `Navbar outside viewport: ${JSON.stringify(boxes)}`);
}

test('glass actual account, shared navigation, authorized news and responsive visual evidence', { timeout: 330000 }, async t => {
  await mkdir(artifacts, { recursive: true });
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1448, height: 1086 }, deviceScaleFactor: 1 });
    const page = await context.newPage(), errors = [], evidence = [];
    page.on('pageerror', error => errors.push(error.message));
    const peerContext = await browser.newContext({ viewport: { width: 1448, height: 1086 }, deviceScaleFactor: 1 });
    const peer = await peerContext.newPage();
    try {
      await t.test('public forms reflow across all required widths and expose complete mobile navigation', async () => {
        for (const route of ['sign-in', 'register']) {
          await page.goto(`${runtime.origin}/${route}`);
          await page.getByLabel('Correo electrónico', { exact: true }).waitFor();
          for (const width of [320, 390, 768, 1024, 1440, 1448]) {
            await page.setViewportSize({ width, height: width === 1448 ? 1086 : 900 });
            await fit(page, width);
            await page.screenshot({ path: resolve(artifacts, `${route}-${width}.png`), fullPage: true });
            const nav = await visibleNavigation(page);
            assert.equal(await nav.getByRole('link', { name: route === 'register' ? 'Crear cuenta' : 'Iniciar sesión', exact: true }).getAttribute('aria-current'), 'page');
            if (width < 768) {
              await page.keyboard.press('Escape');
              assert.equal(await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).evaluate(node => node === document.activeElement), true);
            }
          }
        }
      });
      await t.test('rendered form controls and text have sufficient contrast and stable geometry', async () => {
        await page.goto(`${runtime.origin}/sign-in`);
        const style = await page.locator('input[name=email]').evaluate(node => { const s = getComputedStyle(node); return { border: s.borderColor, background: s.backgroundColor }; });
        evidence.push({ name: 'input-boundary', ...style, ratio: contrast(style.border, style.background) });
        assert.ok(contrast(style.border, style.background) >= 3, `Input boundary contrast ${JSON.stringify(style)}`);
        const button = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
        const colors = await button.evaluate(node => { const s = getComputedStyle(node); return { foreground: s.color, background: s.backgroundColor }; });
        evidence.push({ name: 'primary-action', ...colors, ratio: contrast(colors.foreground, colors.background) });
        assert.ok(contrast(colors.foreground, colors.background) >= 4.5);
      });
      await t.test('visible passwords clear after failed submit while nonsecret data remains', async () => {
        await page.goto(`${runtime.origin}/sign-in`);
        await page.getByLabel('Correo electrónico', { exact: true }).fill('not-a-member@example.test');
        await page.getByLabel('Contraseña', { exact: true }).fill(password);
        await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
        assert.equal(await page.getByLabel('Contraseña', { exact: true }).getAttribute('type'), 'text');
        const response = page.waitForResponse(value => new URL(value.url()).pathname === '/api/v1/auth/login');
        await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
        assert.equal((await response).status(), 401);
        await page.getByRole('alert').first().waitFor();
        await page.waitForFunction(() => document.querySelector('input[name=password]')?.value === '');
        assert.equal(await page.getByLabel('Correo electrónico', { exact: true }).inputValue(), 'not-a-member@example.test');
        assert.equal(await page.getByText('Entre 16 y 128 caracteres.', { exact: false }).count(), 0);
      });
      const suffix = Date.now();
      await account(page, runtime.origin, runtime.inbox, `glass-teacher-${suffix}@example.test`);
      await account(peer, runtime.origin, runtime.inbox, `glass-student-${suffix}@example.test`);
      const room = await classroom(page, peer, 'Glass actual classroom');
      const detail = (await api(page, 'GET', `/classrooms/${room.id}`)).body;
      assert.equal((await api(page, 'POST', `/classrooms/${room.id}/wall`, { revision: detail.revision, operation: { action: 'publish', body: 'Glass actual notification destination' } })).status, 200);
      await t.test('profile notifications retain actual unread count and open a freshly authorized academic destination', async () => {
        await peer.goto(`${runtime.origin}/profile`);
        await peer.getByRole('button', { name: /^Notificaciones:.*sin leer/ }).click();
        const dialog = peer.getByRole('dialog', { name: 'Notificaciones', exact: true });
        await dialog.getByRole('button', { name: 'Abrir publicación', exact: true }).first().click();
        await peer.waitForURL(/\/mis-aulas\?notificacion=/);
        await peer.getByRole('region', { name: 'Muro del aula', exact: true }).waitFor();
        await peer.getByText('Glass actual notification destination', { exact: true }).waitFor();
        await peer.screenshot({ path: resolve(artifacts, 'academic-body.png'), fullPage: true });
        const invalidOpens = [];
        const inspect = request => { if (/\/notifications\/.*\/open$/.test(new URL(request.url()).pathname)) invalidOpens.push(request.url()); };
        peer.on('request', inspect);
        await peer.goto(`${runtime.origin}/mis-aulas?notificacion=not-a-notification`);
        await peer.getByRole('heading', { name: 'Mis Aulas', exact: true }).waitFor();
        peer.off('request', inspect);
        assert.deepEqual(invalidOpens, [], 'Invalid page input never becomes an arbitrary notification operation');
      });
      await t.test('teacher and student Home use real cards, menus, focus, zoom and reduced motion', async () => {
        for (const [actor, kind] of [[page, 'teach'], [peer, 'study']]) {
          await actor.goto(`${runtime.origin}/inicio`);
          await actor.getByRole('heading', { name: 'Glass actual classroom', exact: true }).waitFor();
          assert.equal(await actor.getByRole('button', { name: kind === 'teach' ? 'Enseño (1)' : 'Estudio (1)', exact: true }).getAttribute('aria-pressed'), 'true');
          for (const width of [320, 390, 768, 1024, 1440, 1448]) {
            await actor.setViewportSize({ width, height: width === 1448 ? 1086 : 900 });
            await fit(actor, width);
            await actor.screenshot({ path: resolve(artifacts, `home-${kind}-${width}.png`), fullPage: true });
            const link = await navigationLink(actor, 'Inicio'); await link.focus();
            assert.notEqual(await link.evaluate(node => getComputedStyle(node).outlineStyle), 'none');
            await actor.keyboard.press('Tab');
            assert.equal(await (await navigationLink(actor, 'Mis aulas')).evaluate(node => document.activeElement === node), true);
            await actor.keyboard.press('Escape');
          }
          await actor.emulateMedia({ reducedMotion: 'reduce' });
          assert.equal(await (await navigationLink(actor, 'Inicio')).evaluate(node => getComputedStyle(node).transitionDuration), '0s');
          await actor.setViewportSize({ width: 720, height: 450 });
          await actor.evaluate(() => { document.documentElement.style.zoom = '2'; });
          await fit(actor, 720);
          await actor.screenshot({ path: resolve(artifacts, `home-${kind}-zoom200.png`), fullPage: true });
          await actor.evaluate(() => { document.documentElement.style.zoom = ''; });
        }
      });
      await t.test('files and profile share account actions and real logout, companion shells remain usable', async () => {
        await page.setViewportSize({ width: 390, height: 900 });
        await page.goto(`${runtime.origin}/files`);
        await (await profileAction(page)).click(); await page.waitForURL('**/profile');
        await page.getByRole('heading', { name: 'Mi perfil', exact: true }).waitFor();
        for (const route of ['forgot-password', 'recover-password', 'verify-email']) {
          await page.goto(`${runtime.origin}/${route}`);
          await page.locator('.entry-page .surface').waitFor(); await fit(page, 390);
          await page.screenshot({ path: resolve(artifacts, `${route}-390.png`), fullPage: true });
        }
        await page.goto(`${runtime.origin}/files`);
        await profileAction(page);
        await page.locator('#fm-account-menu').getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
        await page.waitForURL('**/sign-in');
        assert.deepEqual((await api(page, 'GET', '/auth/session')).body, { authenticated: false });
      });
      assert.deepEqual(errors, []);
    } finally {
      await writeFile(resolve(artifacts, 'rendered-evidence.json'), JSON.stringify({ evidence, pageErrors: errors }, null, 2));
      await browser.close();
    }
  }, { classrooms: true });
});
