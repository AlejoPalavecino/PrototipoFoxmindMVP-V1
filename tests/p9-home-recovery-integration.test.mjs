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
const newsPath = '/api/v1/classrooms/notifications';
const waitLists = page => Promise.all(listPaths.map(path => page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'GET')));
const listAlert = page => page.locator('.p5-main > [role="alert"]');
const newsRegion = page => page.getByRole('region', { name: 'Novedades', exact: true });

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
  const watched = request => request.method() === 'GET' && [...listPaths, newsPath].includes(new URL(request.url()).pathname);
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
    const primary = document.querySelector('.p9-home-hero button.primary');
    return primary && !primary.disabled && document.querySelector('.p9-home [aria-label="Enseño"]')
      && !document.querySelector('.p5-main > [role="alert"]');
  });
  assert.equal(await listAlert(page).count(), 0, 'Classroom-list owner must clear its own error after its completed action');
}

async function refreshNews(page, name) {
  const news = newsRegion(page);
  const request = () => page.waitForResponse(response => new URL(response.url()).pathname === newsPath && response.request().method() === 'GET');
  let pending = request();
  await news.getByRole('button', { name, exact: true }).click();
  let response = await pending;
  if (await pauseForActualAdmission([response], 'news')) {
    pending = request();
    await news.getByRole('button', { name: 'Reintentar novedades', exact: true }).click();
    response = await pending;
  }
  const body = await successfulJson(response, 'news');
  assert.ok(Array.isArray(body), 'News body must complete as the actual notification array');
  await page.waitForFunction(() => {
    const region = document.querySelector('.p9-home-news');
    return region?.getAttribute('aria-busy') === 'false' && !region.querySelector('[role="alert"]')
      && ![...region.querySelectorAll('[role="status"]')].some(element => element.textContent.includes('Cargando novedades'));
  });
  assert.equal(await news.getByRole('alert').count(), 0, 'News owner must clear only after its own successful settled read');
  return body;
}

async function openReadyHome(page, origin, observation) {
  let pending = waitLists(page);
  await page.goto(`${origin}/inicio`);
  let responses = await pending;
  if (await pauseForActualAdmission(responses, 'lists')) {
    pending = waitLists(page);
    await listAlert(page).getByRole('button', { name: 'Volver a intentar', exact: true }).click();
    responses = await pending;
  }
  await completedLists(responses);
  await listSettled(page);
  await drainReads(observation);
  await refreshNews(page, 'Actualizar novedades');
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
      await account(teacher, runtime.origin, runtime.inbox, `p9-remaining-teacher-${suffix}@example.test`);
      await account(seed, runtime.origin, runtime.inbox, email);
      const room = await classroom(teacher, seed, roomName);
      const draft = await api(seed, 'POST', '/classrooms/drafts', {}); assert.equal(draft.status, 200, 'Owned draft prerequisite');
      assert.equal((await api(seed, 'PATCH', `/classrooms/drafts/${draft.body.id}`, { revision: draft.body.revision, payload: { name: draftName } })).status, 200, 'Owned named draft prerequisite');
      const wall = await api(teacher, 'GET', `/classrooms/${room.id}/wall`); assert.equal(wall.status, 200, 'Actual notice prerequisite');
      assert.equal((await api(teacher, 'POST', `/classrooms/${room.id}/wall`, { revision: wall.body.revision, operation: { action: 'publish', body: 'P9 remaining recovery notice' } })).status, 200, 'Real notification prerequisite');
      await seed.close(); await teacherContext.close();

      // These groups have independent pages after common real setup. A failure never authorizes another run.
      const check = (name, operation) => t.test(name, async () => {
        const page = await actorContext.newPage(), observation = observeReads(page);
        observations.set(page, observation);
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        try { await operation(page, observation, errors); }
        catch (error) { await captureAlerts(browser, observations, artifacts, name); throw error; }
        finally { observation.detach(); await actorContext.setOffline(false); await page.close(); }
      });

      await check('list and news recover through their own real offline errors and visible retries', async (page, observation) => {
        await openReadyHome(page, runtime.origin, observation);
        const news = newsRegion(page);
        await actorContext.setOffline(true);
        await page.getByRole('navigation', { name: 'Navegación principal', exact: true }).getByRole('button', { name: 'Inicio', exact: true }).click();
        await listAlert(page).getByRole('button', { name: 'Volver a intentar', exact: true }).waitFor();
        assert.equal(await page.getByRole('region', { name: 'Enseño', exact: true }).count(), 0, 'List owner conceals old cards after offline failure');
        await news.getByRole('button', { name: 'Actualizar novedades', exact: true }).click();
        await news.getByRole('button', { name: 'Reintentar novedades', exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelector('.p9-home-news')?.getAttribute('aria-busy') === 'false');
        await drainReads(observation);
        const newsFailure = await news.getByRole('alert').innerText();
        assert.ok(newsFailure.length > 0, 'News error text must be observed, not inferred from an alert count');
        await actorContext.setOffline(false);
        let pending = waitLists(page);
        await listAlert(page).getByRole('button', { name: 'Volver a intentar', exact: true }).click();
        let responses = await pending;
        if (await pauseForActualAdmission(responses, 'list recovery')) {
          pending = waitLists(page);
          await listAlert(page).getByRole('button', { name: 'Volver a intentar', exact: true }).click();
          responses = await pending;
        }
        await completedLists(responses); await listSettled(page); await drainReads(observation);
        assert.equal(await news.getByRole('alert').innerText(), newsFailure, 'List recovery does not falsely clear the separately owned news error');
        await refreshNews(page, 'Reintentar novedades'); await drainReads(observation);
        await page.getByRole('region', { name: 'Estudio', exact: true }).getByRole('heading', { name: roomName, exact: true }).waitFor();
        await assertHomeRecoveryOwners(page);
      });

      await check('Home320/375/1280 preserves keyboard focus, reflow and reduced motion', async (page, observation, errors) => {
        await openReadyHome(page, runtime.origin, observation);
        const nav = page.getByRole('navigation', { name: 'Navegación principal', exact: true });
        for (const width of [320, 375, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Home overflow ${width}`);
          await page.keyboard.press('Tab'); await nav.getByRole('button', { name: 'Inicio', exact: true }).focus();
          assert.equal(await nav.getByRole('button', { name: 'Inicio', exact: true }).evaluate(element => document.activeElement === element && getComputedStyle(element).outlineStyle !== 'none'), true, 'Actual Home keyboard focus must remain visible');
          await page.keyboard.press('Tab');
          assert.equal(await nav.getByRole('button', { name: 'Mis Aulas', exact: true }).evaluate(element => document.activeElement === element), true, 'Mis Aulas remains keyboard reachable');
          await page.screenshot({ path: join(artifacts, `remaining-inicio-${width}.png`), fullPage: true });
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await nav.getByRole('button', { name: 'Inicio', exact: true }).evaluate(element => getComputedStyle(element).transitionDuration), '0s');
        assert.deepEqual(errors, [], 'No actual Home page errors');
      });

      await check('private draft wizard retains restricted navigation and confirmed save exit', async (page, observation) => {
        await openReadyHome(page, runtime.origin, observation);
        const lists = waitLists(page);
        await page.getByRole('button', { name: 'Ver borradores e invitaciones', exact: true }).click();
        await page.waitForURL('**/mis-aulas'); await completedLists(await lists);
        const loaded = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/drafts/${draft.body.id}` && response.request().method() === 'GET');
        await page.locator('.p5-drafts').getByRole('button').filter({ has: page.getByText(draftName, { exact: true }) }).click();
        assert.equal((await successfulJson(await loaded, 'draft read')).id, draft.body.id);
        await page.getByRole('heading', { name: 'Datos generales', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Inicio', exact: true }).count(), 0, 'Wizard hides global Inicio');
        assert.equal(await page.getByRole('link', { name: 'Mi perfil', exact: true }).count(), 0, 'Wizard hides account navigation while saving is owned');
        // Saving an unchanged draft may correctly be a no-op; make this owned edit explicit.
        const savedName = `${draftName} saved`;
        const saved = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/drafts/${draft.body.id}`
          && response.request().method() === 'PATCH' && response.request().postDataJSON()?.payload?.name === savedName);
        await page.getByLabel('Nombre del aula', { exact: true }).fill(savedName);
        await page.getByRole('button', { name: 'Mis Aulas / Guardar y salir', exact: true }).click();
        const confirmed = await successfulJson(await saved, 'draft save exit');
        assert.equal(confirmed.id, draft.body.id); assert.equal(confirmed.payload.name, savedName);
        await page.getByRole('heading', { name: 'Mis Aulas', exact: true }).waitFor();
      });

      await check('ordinary login stays on profile while explicit Inicio and revocation preserve the exact gate', async () => {
        const anonymousContext = await browser.newContext(), anonymous = await anonymousContext.newPage();
        const observation = observeReads(anonymous); observations.set(anonymous, observation);
        try {
          await anonymous.goto(`${runtime.origin}/sign-in`);
          await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(email);
          await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
          await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/profile');
          const current = await api(anonymous, 'GET', '/account'); assert.equal(current.status, 200, 'Actual default profile account read');
          assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
          await anonymous.goto(`${runtime.origin}/sign-in?next=%2Finicio`);
          await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(email);
          await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
          const lists = waitLists(anonymous);
          await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/inicio');
          await completedLists(await lists); await listSettled(anonymous); await drainReads(observation);
          assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
          const denied = await rejectSame(runtime.db, () => api(anonymous, 'GET', '/classrooms'), 401);
          assert.equal(denied.body.error.code, 'AUTH_REQUIRED', 'Revoked session must retain the real identity error contract');
          await anonymous.getByRole('button', { name: 'Inicio', exact: true }).click();
          await anonymous.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === '/inicio');
          assert.equal(await anonymous.getByRole('region', { name: 'Enseño', exact: true }).count(), 0, 'Revoked account sees no Home classroom data');
        } catch (error) { await captureAlerts(browser, observations, artifacts, 'login-continuation-revocation'); throw error; }
        finally { observation.detach(); await anonymousContext.close(); }
      });

      await check('verified account navigation320/375/1280 stays visible and keyboard reachable', async page => {
        const ready = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/account' && response.request().method() === 'GET');
        await page.goto(`${runtime.origin}/profile`); await successfulJson(await ready, 'account navigation');
        await page.getByRole('heading', { name: 'Files Fixture', exact: true }).waitFor();
        const nav = page.getByRole('navigation', { name: 'Cuenta', exact: true });
        for (const width of [320, 375, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          const metrics = await nav.evaluate(element => ({ overflow: document.documentElement.scrollWidth > innerWidth,
            links: [...element.querySelectorAll('a')].map(link => { const bounds = link.getBoundingClientRect(); return { label: link.textContent, left: bounds.left, right: bounds.right }; }) }));
          await page.screenshot({ path: join(artifacts, `remaining-profile-${width}.png`), fullPage: true });
          assert.equal(metrics.overflow, false, `Account navigation overflow ${width}: ${JSON.stringify(metrics)}`);
          assert.ok(metrics.links.every(link => link.left >= 0 && link.right <= width), `Account links remain visible ${width}`);
          await page.keyboard.press('Tab'); await nav.getByRole('link', { name: 'Inicio', exact: true }).focus();
          await page.keyboard.press('Tab');
          assert.equal(await nav.getByRole('link', { name: 'Mis Aulas', exact: true }).evaluate(element => document.activeElement === element), true, 'Verified Mis Aulas remains keyboard reachable');
        }
      });
    } catch (error) { await captureAlerts(browser, observations, artifacts, 'prerequisite-or-host'); throw error; }
    finally { try { await actorContext?.setOffline(false); } finally { await browser.close(); } }
  }, { classrooms: true });
});
