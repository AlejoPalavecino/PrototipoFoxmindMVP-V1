import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, password } from './p4-integration-helpers.mjs';
import { classroom } from './p6-integration-helpers.mjs';
import { navigationLink, visibleNavigation } from './entry-glass-browser-helpers.mjs';

const artifacts = resolve('.test-artifacts/entry-glass');
function luminance(rgb) {
  return rgb.map(value => { const channel = value / 255; return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; })
    .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
}
const rgb = value => value.match(/[\d.]+/g).slice(0, 3).map(Number);
function contrast(first, second) { const a = luminance(rgb(first)), b = luminance(rgb(second)); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }
async function fit(page, width) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page overflow at${width}`);
  const boxes = await page.locator('.brujula-auth main, header.fm3d-shell').evaluate(element => {
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
            const surface = page.locator('.brujula-auth .surface');
            const target = route === 'register' ? 'Iniciar sesión' : 'Crear cuenta';
            const link = surface.locator('.after-form').getByRole('link', { name: target, exact: true });
            assert.equal(await link.getAttribute('href'), route === 'register' ? '/sign-in' : '/register');
            assert.equal(await page.getByRole('button', { name: /Abrir menú de (cuenta|navegación)/ }).count(), 0);
            assert.equal(await surface.getByRole('link', { name: /Mi perfil|Configuración/ }).count(), 0);
            await link.focus();
            await page.keyboard.press('Shift+Tab');
            await page.keyboard.press('Tab');
            assert.equal(await link.evaluate(node => node === document.activeElement), true);
            if (width >= 1024) {
              await page.locator('.br-auth-visual').getByRole('link', { name: 'FoxMind', exact: true }).waitFor();
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
      await account(page, runtime.origin, runtime.inbox, `glass-teacher-${suffix}@example.test`, undefined, "teacher");
      await account(peer, runtime.origin, runtime.inbox, `glass-student-${suffix}@example.test`, undefined, "student");
      const room = await classroom(page, peer, 'Glass actual classroom');
      const detail = (await api(page, 'GET', `/classrooms/${room.id}`)).body;
      assert.equal((await api(page, 'POST', `/classrooms/${room.id}/wall`, { revision: detail.revision, operation: { action: 'publish', body: 'Glass actual notification destination' } })).status, 200);
      await t.test('profile notifications retain actual unread count and open a freshly authorized academic destination', async () => {
        await peer.goto(`${runtime.origin}/profile`);
        const bell = peer.getByRole('link', { name: /^Notificaciones:.*sin leer/ });
        await bell.waitFor();
        const notificationRead = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/classrooms/notifications/page' && response.request().method() === 'GET');
        await bell.click();
        const notificationResponse = await notificationRead;
        assert.equal(notificationResponse.status(), 200);
        await peer.waitForURL('**/notificaciones');
        const current = await api(peer, 'GET', '/classrooms/notifications/page');
        assert.equal(current.status, 200);
        const wallNotice = current.body.items.find(item => item.classroomId === room.id && item.eventType === 'WALL_NOTICE');
        assert.ok(wallNotice && !wallNotice.readAt);
        const inbox = peer.getByRole('region', { name: 'Tu bandeja de notificaciones', exact: true });
        const row = inbox.getByRole('article').filter({ has: peer.getByRole('heading', { name: 'Nuevo aviso del docente', exact: true }) });
        await row.getByText('Sin leer', { exact: true }).waitFor();
        const [openedNotice] = await Promise.all([
          peer.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/notifications/${wallNotice.id}/open`
            && response.request().method() === 'POST'),
          row.getByRole('button', { name: 'Ir al muro', exact: true }).click(),
        ]);
        assert.equal(openedNotice.status(), 200);
        await peer.waitForURL(/\/mis-aulas\?notificacion=/);
        await peer.getByRole('region', { name: 'Muro del aula', exact: true }).waitFor();
        await peer.getByText('Glass actual notification destination', { exact: true }).waitFor();
        await peer.screenshot({ path: resolve(artifacts, 'academic-body.png'), fullPage: true });
        const invalidOpens = [];
        const inspect = request => { if (/\/notifications\/.*\/open$/.test(new URL(request.url()).pathname)) invalidOpens.push(request.url()); };
        peer.on('request', inspect);
        await peer.goto(`${runtime.origin}/mis-aulas?notificacion=not-a-notification`);
        await peer.getByRole('heading', { name: 'Mis aulas', exact: true }).waitFor();
        peer.off('request', inspect);
        assert.deepEqual(invalidOpens, [], 'Invalid page input never becomes an arbitrary notification operation');
      });
      await t.test('teacher and student Home use real cards, menus, focus, zoom and reduced motion', async () => {
        for (const [actor, kind] of [[page, 'teach'], [peer, 'study']]) {
          await actor.goto(`${runtime.origin}/inicio`);
          const session = await api(actor, 'GET', '/auth/session');
          assert.equal(session.status, 200); assert.equal(session.body.authenticated, true);
          assert.equal(session.body.user.accountRole, kind === 'teach' ? 'teacher' : 'student');
          const home = actor.getByRole('region', { name: 'Inicio', exact: true });
          const classroomCard = home.getByRole('link').filter({ has: actor.getByRole('heading', { name: 'Glass actual classroom', exact: true }) });
          await classroomCard.waitFor();
          if (kind === 'teach') {
            await home.getByRole('button', { name: 'Crear actividad', exact: true }).waitFor();
          } else {
            await home.getByRole('link', { name: 'Mi estudio', exact: true }).waitFor();
            for (const name of ['Crear actividad', 'Agregar material', 'Publicar aviso', 'Ver progreso']) assert.equal(await actor.getByRole('button', { name, exact: true }).count(), 0);
          }
          const [opened] = await Promise.all([
            actor.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === `/api/v1/classrooms/${room.id}`),
            classroomCard.click(),
          ]);
          assert.equal(opened.status(), 200);
          const authorizedRoom = await opened.json();
          assert.equal(authorizedRoom.id, room.id);
          assert.equal(authorizedRoom.role, kind === 'teach' ? 'teacher' : 'student');
          const topic = detail.units[0].topics[0];
          assert.ok(authorizedRoom.units.some(unit => unit.topics.some(item => item.id === topic.id)));
          await actor.locator('[data-classroom-tab="plan"]').waitFor();
          await actor.getByRole('region', { name: 'Tema seleccionado', exact: true }).getByRole('heading', { name: topic.name, exact: true }).waitFor();
          const selectedTopic = actor.getByRole('navigation', { name: 'Unidades del plan', exact: true })
            .getByRole('button', { name: topic.name });
          assert.equal(await selectedTopic.getAttribute('aria-current'), 'true');
          await actor.goto(`${runtime.origin}/inicio`);
          await classroomCard.waitFor();
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
          const transitionMs = await (await navigationLink(actor, 'Inicio')).evaluate(node =>
            Math.max(...getComputedStyle(node).transitionDuration.split(',').map(value =>
              Number.parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000))));
          assert.ok(transitionMs <= 0.01, `Reduced motion leaves at most 0.01 ms, got ${transitionMs} ms`);
          await actor.setViewportSize({ width: 720, height: 450 });
          await actor.evaluate(() => { document.documentElement.style.zoom = '2'; });
          await fit(actor, 720);
          await actor.screenshot({ path: resolve(artifacts, `home-${kind}-zoom200.png`), fullPage: true });
          await actor.evaluate(() => { document.documentElement.style.zoom = ''; });
        }
      });
      await t.test('files and profile share account actions and real logout, companion shells remain usable', async () => {
        await page.setViewportSize({ width: 390, height: 900 });
        const openProfileFromFiles = async () => {
          await page.goto(`${runtime.origin}/files`);
          await page.getByRole('button', { name: 'Abrir menú de navegación', exact: true }).click();
          const drawer = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
          const link = drawer.getByRole('link', { name: /^Mi perfil(?: de .+)?$/ });
          assert.equal(await link.getAttribute('href'), '/profile');
          await link.click(); await page.waitForURL('**/profile');
          await page.getByRole('heading', { name: 'Mi perfil', exact: true }).waitFor();
          await fit(page, 390);
        };
        await openProfileFromFiles();
        for (const route of ['forgot-password', 'recover-password', 'verify-email']) {
          await page.goto(`${runtime.origin}/${route}`);
          await page.locator('.entry-page .surface').waitFor(); await fit(page, 390);
          await page.screenshot({ path: resolve(artifacts, `${route}-390.png`), fullPage: true });
        }
        await openProfileFromFiles();
        await page.getByRole('complementary', { name: 'Configuración de cuenta', exact: true })
          .getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
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
