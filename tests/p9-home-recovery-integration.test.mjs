import { navigationLink, visibleNavigation, profileAction } from './entry-glass-browser-helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, password } from './p4-integration-helpers.mjs';
import { classroom, rejectSame } from './p6-integration-helpers.mjs';

const listPaths = ['/api/v1/classrooms', '/api/v1/classrooms/drafts', '/api/v1/classrooms/invitations'];
const newsPath = '/api/v1/classrooms/notifications/page';
const homePath = '/api/v1/home';
const waitLists = page => Promise.all(listPaths.map(path => page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'GET')));
const listAlert = page => page.locator('.p5-main > [role="alert"]');
const newsRegion = page => page.getByRole('dialog', { name: 'Notificaciones', exact: true });
const waitHome = page => page.waitForResponse(response => new URL(response.url()).pathname === homePath && response.request().method() === 'GET');

// Advance only the browser clock to exercise the existing 60-second focus refresh.
async function refreshHomeByFocus(page) {
  await page.clock.install();
  await page.clock.fastForward(60_001);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}

async function homeAlertOwners(page) {
  return page.locator('[role="alert"]').evaluateAll(elements => elements.map(element => {
    const routeAnnouncement = element.id === '__next-route-announcer__'
      && element.tagName === 'P' && element.getAttribute('aria-live') === 'assertive';
    return {
      id: element.id, tag: element.tagName, ariaLive: element.getAttribute('aria-live'),
      text: element.textContent?.trim(),
      region: element.closest('section[aria-label]')?.getAttribute('aria-label') ?? null,
      owner: routeAnnouncement ? 'framework-route-announcement'
        : element.closest('.p9-home-news') ? 'news'
          : element.parentElement?.matches('.p5-main') ? 'classroom-lists'
            : element.closest('.p5-gate') ? 'account-gate' : 'other',
      parentClass: element.parentElement?.className ?? '',
      visible: Boolean(element.getClientRects().length),
    };
  }));
}

async function assertHomeRecoveryOwners(page) {
  const alerts = await homeAlertOwners(page);
  for (const owner of ['classroom-lists', 'news', 'account-gate', 'other']) {
    assert.deepEqual(alerts.filter(alert => alert.owner === owner), [],
      owner + ' must have no remaining application error after completed recovery: ' + JSON.stringify(alerts));
  }
  // Only Next's exact installed announcement contract is non-error; other alerts still fail above.
  console.log('P9 settled route announcements', JSON.stringify(alerts.filter(alert => alert.owner === 'framework-route-announcement')));
}

function observeReads(page) {
  const active = new Set(), events = [];
  const watched = request => request.method() === 'GET' && [...listPaths, newsPath, homePath].includes(new URL(request.url()).pathname);
  const started = request => { if (watched(request)) active.add(request); };
  const ended = request => active.delete(request);
  const failed = request => {
    if (watched(request)) events.push({ path: new URL(request.url()).pathname, failure: request.failure()?.errorText });
    ended(request);
  };
  const responded = response => {
    if (watched(response.request())) events.push({ path: new URL(response.url()).pathname, status: response.status(), retryAfter: response.headers()['retry-after'] });
  };
  page.on('request', started); page.on('requestfinished', ended); page.on('requestfailed', failed); page.on('response', responded);
  return { active, events, detach() { page.off('request', started); page.off('requestfinished', ended); page.off('requestfailed', failed); page.off('response', responded); } };
}

/** Observe completion only: no extra request, server retry or expanded UI wait budget. */
async function drainReads(observation) {
  const deadline = Date.now() + 30000;
  while (observation.active.size && Date.now() < deadline) await delay(20);
  assert.equal(observation.active.size, 0, 'Previously observed Home reads must finish within the existing30s UI wait before transport changes');
}

async function successfulJson(response, owner) {
  assert.equal(response.status(), 200, `${owner}: actual admittedHTTP200 required`);
  assert.equal(await response.finished(), null, `${owner}: response body must finish`);
  return response.json();
}

async function pauseForActualAdmission(responses, owner) {
  const limited = responses.filter(response => response.status() === 429);
  if (!limited.length) return false;
  const seconds = Math.max(...limited.map(response => Number(response.headers()['retry-after'])));
  assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, `${owner}: actual bounded Retry-After required`);
  console.log(`P9 remaining ${owner}: actual Retry-After=${seconds}s; one visible manual retry`);
  await delay(seconds * 1000);
  return true;
}

async function completedLists(responses) {
  const bodies = await Promise.all(responses.map(response => successfulJson(response, `lists ${new URL(response.url()).pathname}`)));
  assert.ok(Array.isArray(bodies[0].teach) && Array.isArray(bodies[0].study), 'List body has actual role-grouped classrooms');
  assert.ok(Array.isArray(bodies[1]) && Array.isArray(bodies[2]), 'Draft/invitation bodies must complete as arrays');
  return bodies;
}

async function listSettled(page) {
  await page.waitForFunction(() => {
    const create = [...document.querySelectorAll('.entry-classrooms button')].find(button => button.textContent === 'Crear aula');
    return create && !create.disabled && document.querySelector('.entry-contexts [aria-pressed="true"]')
      && !document.querySelector('.p5-main > [role="alert"]');
  });
  assert.equal(await listAlert(page).count(), 0, 'Classroom-list owner must clear its own error after its completed action');
}

async function refreshNews(page) {
  const news = newsRegion(page);
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === newsPath && response.request().method() === 'GET');
  await news.getByRole('button', { name: 'Actualizar notificaciones', exact: true }).click();
  const body = await successfulJson(await pending, 'notifications');
  assert.ok(Array.isArray(body.items), 'Notification page contains actual items');
  await page.waitForFunction(() => !document.querySelector('dialog[open][aria-labelledby="p5-dialog-title"] [role="alert"]'));
  return body;
}

async function openReadyHome(page, origin, observation) {
  const pending = waitHome(page);
  await page.goto(`${origin}/inicio`);
  const body = await successfulJson(await pending, 'Home');
  assert.ok(body.subjectId && body.modules && body.memberships, 'Authenticated Home aggregate completed');
  await page.getByRole('region', { name: 'Inicio', exact: true }).waitFor();
  await drainReads(observation);
}

async function captureAlerts(browser, observations, artifacts, stage) {
  const pages = [];
  for (const context of browser.contexts()) for (const page of context.pages()) {
    if (page.isClosed()) continue;
    const alerts = await homeAlertOwners(page).catch(error => [{ captureError: error.message }]);
    pages.push({ path: new URL(page.url()).pathname, alerts, reads: observations.get(page)?.events ?? [] });
  }
  const report = { stage, pages };
  console.error('P9 remaining alert ownership', JSON.stringify(report));
  await writeFile(join(artifacts, `failure-${stage.replace(/[^a-z0-9]+/gi, '-').slice(0, 80)}.json`), JSON.stringify(report, null, 2))
    .catch(error => console.error('P9 remaining diagnostic artifact unavailable', error.message));
}

test('P9 actual Home remaining recovery, responsive and account proof', { timeout: 330000 }, async t => {
  const artifacts = await mkdtemp(join(tmpdir(), 'foxmind-p9-home-remaining-'));
  console.log(`P9 remaining Home scratch: ${artifacts}`);
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    const observations = new Map();
    let actorContext;
    try {
      actorContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const teacherContext = await browser.newContext();
      const teacher = await teacherContext.newPage(), seed = await actorContext.newPage();
      const suffix = Date.now(), email = `p9-remaining-${suffix}@example.test`;
      const roomName = 'P9 remaining classroom', draftName = 'P9 remaining private draft';
      // Real prerequisites only; the six completed acceptance groups are not asserted again.
      await account(teacher, runtime.origin, runtime.inbox, `p9-remaining-teacher-${suffix}@example.test`, undefined, "teacher");
      await account(seed, runtime.origin, runtime.inbox, email, undefined, "student");
      const room = await classroom(teacher, seed, roomName);
      const draft = await api(teacher, 'POST', '/classrooms/drafts', {}); assert.equal(draft.status, 200, 'Owned draft prerequisite');
      assert.equal((await api(teacher, 'PATCH', `/classrooms/drafts/${draft.body.id}`, { revision: draft.body.revision, payload: { name: draftName } })).status, 200, 'Owned named draft prerequisite');
      const wall = await api(teacher, 'GET', `/classrooms/${room.id}/wall`); assert.equal(wall.status, 200, 'Actual notice prerequisite');
      assert.equal((await api(teacher, 'POST', `/classrooms/${room.id}/wall`, { revision: wall.body.revision, operation: { action: 'publish', body: 'P9 remaining recovery notice' } })).status, 200, 'Real notification prerequisite');
      await seed.close(); await teacher.close();

      // These groups have independent pages after common real setup. A failure never authorizes another run.
      const check = (name, operation, context = actorContext) => t.test(name, async () => {
        const page = await context.newPage(), observation = observeReads(page);
        observations.set(page, observation);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        try { await operation(page, observation, errors); }
        catch (error) { await captureAlerts(browser, observations, artifacts, name); throw error; }
        finally { observation.detach(); await context.setOffline(false); await page.close(); }
      });

      await check('list and news recover through their own real offline errors and visible retries', async (page, observation) => {
        await openReadyHome(page, runtime.origin, observation);
        await actorContext.setOffline(true);
        await refreshHomeByFocus(page);
        await page.getByRole('button', { name: 'Reintentar Inicio', exact: true }).waitFor();
        assert.equal(await page.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).count(), 0, 'Home conceals old cards after offline failure');
        await page.getByRole('button', { name: /^Notificaciones/ }).click();
        const news = newsRegion(page);
        await news.locator('p[role="alert"]').waitFor();
        await drainReads(observation);
        const newsFailure = await news.locator('p[role="alert"]').innerText();
        assert.ok(newsFailure.length > 0, 'Notification error text must be observed');
        await news.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        await actorContext.setOffline(false);
        const notificationRequests = [];
        const captureNotification = request => {
          if (request.method() === 'GET' && new URL(request.url()).pathname === newsPath) notificationRequests.push(request);
        };
        page.on('request', captureNotification);
        try {
          const pending = waitHome(page);
          await page.getByRole('button', { name: 'Reintentar Inicio', exact: true }).click();
          const home = await successfulJson(await pending, 'Home recovery');
          assert.ok(home.modules.classrooms.items.some(item => item.classroom.id === room.id && item.classroom.role === 'student'));
          await page.getByRole('region', { name: 'Accesos de mi aula', exact: true }).getByText(`${roomName} · A`, { exact: true }).waitFor();
          assert.equal(notificationRequests.length, 0, 'Home retry does not fetch the independently owned notifications');
        } finally { page.off('request', captureNotification); }
        const reopened = page.waitForResponse(response => new URL(response.url()).pathname === newsPath && response.request().method() === 'GET');
        await page.getByRole('button', { name: /^Notificaciones/ }).click();
        const reopenedPage = await successfulJson(await reopened, 'notifications reopen');
        assert.ok(reopenedPage.items.some(item => item.classroomId === room.id), 'Reopened page contains the actual classroom notification');
        const notifications = await refreshNews(page); await drainReads(observation);
        assert.ok(notifications.items.some(item => item.classroomId === room.id), 'Recovered page contains the actual classroom notification');
        await news.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        await assertHomeRecoveryOwners(page);
      });

      await check('Home320/375/1280 preserves keyboard focus, reflow and reduced motion', async (page, observation, errors) => {
        await openReadyHome(page, runtime.origin, observation);
        // Responsive navigation is resolved anew after each viewport change.
        for (const width of [320, 375, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Home overflow ${width}`);
          await page.keyboard.press('Tab'); await (await navigationLink(page, 'Inicio')).focus();
          assert.equal(await (await navigationLink(page, 'Inicio')).evaluate(element => document.activeElement === element && getComputedStyle(element).outlineStyle !== 'none'), true, 'Actual Home keyboard focus must remain visible');
          await page.keyboard.press('Tab');
          assert.equal(await (await navigationLink(page, 'Mis aulas')).evaluate(element => document.activeElement === element), true, 'Mis Aulas remains keyboard reachable');
          await page.screenshot({ path: join(artifacts, `remaining-inicio-${width}.png`), fullPage: true });
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await (await navigationLink(page, 'Inicio')).evaluate(element => getComputedStyle(element).transitionDuration), '0s');
        assert.deepEqual(errors, [], 'No actual Home page errors');
      });

      await check('private draft wizard retains restricted navigation and confirmed save exit', async (page, observation) => {
        await openReadyHome(page, runtime.origin, observation);
        const lists = waitLists(page);
        await (await navigationLink(page, 'Mis aulas')).click();
        await page.waitForURL('**/mis-aulas'); await completedLists(await lists);
        const loaded = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/drafts/${draft.body.id}` && response.request().method() === 'GET');
        await page.getByRole('button', { name: /^Pendientes/ }).click();
        await page.getByRole('article').filter({ has: page.getByRole('heading', { name: draftName, exact: true }) }).getByRole('button', { name: 'Continuar creación', exact: true }).click();
        assert.equal((await successfulJson(await loaded, 'draft read')).id, draft.body.id);
        const wizard = page.getByRole('dialog', { name: 'Crear aula', exact: true });
        await wizard.getByRole('heading', { name: 'Dale un lugar a tu próxima clase', exact: true }).waitFor();
        for (const width of [1280, 375]) {
          await page.setViewportSize({ width, height: 812 });
          for (const name of ['Inicio', 'Mis aulas', 'Agenda', 'Mi perfil', 'Configuración', 'FoxMind']) {
            for (const control of await page.getByRole('link', { name, exact: true }).all()) {
              await control.evaluate(element => element.focus());
              assert.equal(await wizard.evaluate(element => element.contains(document.activeElement)), true, `Modal blocks focus on ${name} at ${width}`);
            }
          }
          for (const name of ['Cerrar sesión', /^Notificaciones/, 'Abrir menú de navegación']) {
            for (const control of await page.getByRole('button', { name, exact: typeof name === 'string' }).all()) {
              await control.evaluate(element => element.focus());
              assert.equal(await wizard.evaluate(element => element.contains(document.activeElement)), true, `Modal blocks background button focus at ${width}`);
            }
          }
          const controls = wizard.locator('button, input, select, textarea').filter({ visible: true });
          const count = await controls.count();
          await controls.first().focus();
          for (let index = 0; index <= count; index++) {
            await page.keyboard.press('Tab');
            const readFocus = () => wizard.evaluate(element => ({ inside: element.contains(document.activeElement), modal: element.matches(':modal'), tag: document.activeElement?.tagName, id: document.activeElement?.id, hasFocus: document.hasFocus(), activeFocused: document.activeElement?.matches(':focus') }));
            let focus = await readFocus();
            // Native showModal may hand Tab to browser chrome at the boundary.
            // Only an unfocused document with BODY is eligible; the next Tab must reenter.
            if (!focus.inside && focus.tag === 'BODY' && !focus.hasFocus && !focus.activeFocused && focus.modal) {
              assert.equal(new URL(page.url()).pathname, '/mis-aulas');
              await page.keyboard.press('Tab'); focus = await readFocus();
            }
            assert.equal(focus.modal, true);
            assert.equal(focus.inside, true, `Keyboard focus stays in the creation modal: ${JSON.stringify(focus)}`);
            assert.equal(new URL(page.url()).pathname, '/mis-aulas');
          }
          assert.equal(new URL(page.url()).pathname, '/mis-aulas');
        }
        // Saving an unchanged draft may correctly be a no-op; make this owned edit explicit.
        const savedName = `${draftName} saved`;
        const saved = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/drafts/${draft.body.id}`
          && response.request().method() === 'PATCH' && response.request().postDataJSON()?.payload?.name === savedName);
        await page.getByLabel('Nombre del aula', { exact: true }).fill(savedName);
        await wizard.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
        const confirmed = await successfulJson(await saved, 'draft save exit');
        assert.equal(confirmed.id, draft.body.id); assert.equal(confirmed.payload.name, savedName);
        await page.getByRole('heading', { name: 'Mis aulas', exact: true }).waitFor();
        await wizard.waitFor({ state: 'hidden' });
        await (await profileAction(page)).waitFor();
        await page.getByRole('dialog', { name: 'Mi cuenta', exact: true }).getByRole('button', { name: 'Cerrar Mi cuenta', exact: true }).click();
        const restored = page.getByRole('dialog', { name: 'Menú de navegación', exact: true });
        for (const name of ['Inicio', 'Mis aulas', 'Agenda']) await restored.getByRole('link', { name, exact: true }).waitFor();
        await restored.getByRole('button', { name: 'Cerrar menú de navegación', exact: true }).click();
      }, teacherContext);

      await check('ordinary login lands on Inicio while explicit Inicio and revocation preserve the exact gate', async () => {
        const anonymousContext = await browser.newContext(), anonymous = await anonymousContext.newPage();
        const observation = observeReads(anonymous); observations.set(anonymous, observation);
        try {
          await anonymous.goto(`${runtime.origin}/sign-in`);
          await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(email);
          await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
          await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/inicio');
          const current = await api(anonymous, 'GET', '/account'); assert.equal(current.status, 200, 'Actual authenticated account read after default Inicio login');
          assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
          await anonymous.goto(`${runtime.origin}/sign-in?next=%2Finicio`);
          await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(email);
          await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
          const homeRead = waitHome(anonymous);
          await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/inicio');
          const home = await successfulJson(await homeRead, 'explicit Inicio');
          assert.ok(home.modules.classrooms.items.some(item => item.classroom.id === room.id && item.classroom.role === 'student'));
          await anonymous.getByRole('region', { name: 'Accesos de mi aula', exact: true }).getByText(`${roomName} · A`, { exact: true }).waitFor();
          await drainReads(observation);
          assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
          const denied = await rejectSame(runtime.db, () => api(anonymous, 'GET', '/classrooms'), 401);
          assert.equal(denied.body.error.code, 'AUTH_REQUIRED', 'Revoked session must retain the real identity error contract');
          const rejectedHome = waitHome(anonymous);
          await refreshHomeByFocus(anonymous);
          const rejectedResponse = await rejectedHome;
          assert.equal(rejectedResponse.status(), 401);
          assert.equal((await rejectedResponse.json()).error.code, 'AUTH_REQUIRED');
          await anonymous.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === '/inicio');
          assert.equal(await anonymous.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).count(), 0, 'Revoked account sees no Home classroom data');
        } catch (error) { await captureAlerts(browser, observations, artifacts, 'login-continuation-revocation'); throw error; }
        finally { observation.detach(); await anonymousContext.close(); }
      });

      await check('verified account navigation320/375/1280 stays visible and keyboard reachable', async page => {
        const ready = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/account' && response.request().method() === 'GET');
        await page.goto(`${runtime.origin}/profile`); await successfulJson(await ready, 'account navigation');
        await page.getByRole('heading', { name: 'Files Fixture', exact: true }).waitFor();
        // Responsive navigation is resolved anew after each viewport change.
        for (const width of [320, 375, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          const metrics = await (await visibleNavigation(page)).evaluate(element => ({ overflow: document.documentElement.scrollWidth > innerWidth,
            links: [...element.querySelectorAll('a')].map(link => { const bounds = link.getBoundingClientRect(); return { label: link.textContent, left: bounds.left, right: bounds.right }; }) }));
          await page.screenshot({ path: join(artifacts, `remaining-profile-${width}.png`), fullPage: true });
          assert.equal(metrics.overflow, false, `Account navigation overflow ${width}: ${JSON.stringify(metrics)}`);
          assert.ok(metrics.links.every(link => link.left >= 0 && link.right <= width), `Account links remain visible ${width}`);
          await page.keyboard.press('Tab'); await (await navigationLink(page, 'Inicio')).focus();
          await page.keyboard.press('Tab');
          assert.equal(await (await navigationLink(page, 'Mis aulas')).evaluate(element => document.activeElement === element), true, 'Verified Mis Aulas remains keyboard reachable');
        }
      });
    } catch (error) { await captureAlerts(browser, observations, artifacts, 'prerequisite-or-host'); throw error; }
    finally { try { await actorContext?.setOffline(false); } finally { await browser.close(); } }
  }, { classrooms: true });
});
