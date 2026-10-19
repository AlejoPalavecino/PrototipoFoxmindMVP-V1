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
const waitLists = page => Promise.all(listPaths.map(path => page.waitForResponse(response => new URL(response.url()).pathname === path)));

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

async function completedListBodies(responses) {
  const bodies = await Promise.all(responses.map(async response => {
    assert.equal(response.status(), 200, 'List owner requires actual admittedHTTP200');
    assert.equal(await response.finished(), null, 'List response body must finish');
    return response.json();
  }));
  assert.ok(Array.isArray(bodies[0].teach) && Array.isArray(bodies[0].study));
  assert.ok(Array.isArray(bodies[1]) && Array.isArray(bodies[2]));
}

async function completedNewsRead(page, name) {
  const news = page.getByRole('region', { name: 'Novedades', exact: true });
  const request = () => page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/classrooms/notifications' && response.request().method() === 'GET');
  let pending = request();
  await news.getByRole('button', { name, exact: true }).click();
  let response = await pending;
  if (response.status() === 429) {
    const seconds = Number(response.headers()['retry-after']);
    assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'News requires actual bounded Retry-After');
    await delay(seconds * 1000);
    pending = request();
    await news.getByRole('button', { name: 'Reintentar novedades', exact: true }).click();
    response = await pending;
  }
  assert.equal(response.status(), 200, 'News owner requires its own admittedHTTP200');
  assert.equal(await response.finished(), null, 'News response body must finish');
  assert.ok(Array.isArray(await response.json()));
  await page.waitForFunction(() => {
    const region = document.querySelector('.p9-home-news');
    return region?.getAttribute('aria-busy') === 'false' && !region.querySelector('[role="alert"]')
      && ![...region.querySelectorAll('[role="status"]')].some(element => element.textContent.includes('Cargando novedades'));
  });
}

/** A displayed card counts only after fresh successful real list responses. */
async function openHome(page, origin) {
  const pending = waitLists(page);
  await page.goto(`${origin}/inicio`);
  const results = await pending;
  const limited = results.filter(result => result.status() === 429);
  if (limited.length) {
    const seconds = Math.max(...limited.map(result => Number(result.headers()['retry-after'])));
    assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'Real bounded Retry-After is required');
    console.log(`P9 Inicio respects actual Retry-After=${seconds}s; one visible manual retry`);
    await delay(seconds * 1000);
    const retry = waitLists(page);
    await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
    for (const response of await retry) assert.equal(response.status(), 200, 'Single admission recovery must succeed');
  } else for (const response of results) assert.equal(response.status(), 200, 'Fresh actual list response required');
  await page.getByRole('heading', { name: 'Hola, Files Fixture', exact: true }).waitFor();
  await page.getByRole('region', { name: 'Enseño', exact: true }).waitFor();
}

async function capturedInvitation(inbox, email, id) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const response = await fetch(`${inbox}/api/v1/messages`); assert.equal(response.status, 200);
    const messages = await response.json();
    for (const item of messages.messages.filter(item => item.To.some(to => to.Address === email))) {
      const detailResponse = await fetch(`${inbox}/api/v1/message/${item.ID}`); assert.equal(detailResponse.status, 200);
      const detail = await detailResponse.json();
      const link = /http:\/\/127\.0\.0\.1:\d+\/mis-aulas\?invitacion=[a-f0-9-]{36}/i.exec(detail.Text)?.[0];
      if (link && new URL(link).searchParams.get('invitacion') === id) return link;
    }
    await delay(100);
  }
  throw new Error('Actual captured invitation unavailable; fixture preparation failed');
}

test('P9 actual Inicio, mixed classroom roles, safe news and additive account navigation', { timeout: 330000 }, async t => {
  const artifacts = await mkdtemp(join(tmpdir(), 'foxmind-p9-home-'));
  console.log(`P9 Home screenshot scratch: ${artifacts}`);
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const peer = await (await browser.newContext()).newPage();
      const empty = await (await browser.newContext()).newPage();
      const anonymous = await (await browser.newContext()).newPage();
      const suffix = Date.now(), teacherEmail = `p9-home-a-${suffix}@example.test`, peerEmail = `p9-home-b-${suffix}@example.test`, emptyEmail = `p9-home-empty-${suffix}@example.test`;
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const pendingHomeReads = new Set();
      const watched = request => request.method() === 'GET' && [...listPaths, '/api/v1/classrooms/notifications'].includes(new URL(request.url()).pathname);
      page.on('request', request => { if (watched(request)) pendingHomeReads.add(request); });
      page.on('requestfinished', request => pendingHomeReads.delete(request));
      page.on('requestfailed', request => pendingHomeReads.delete(request));
      const drainHomeReads = async () => {
        const deadline = Date.now() + 30000;
        while (pendingHomeReads.size && Date.now() < deadline) await delay(20);
        assert.equal(pendingHomeReads.size, 0, 'Observe existing reads completing before offline within the existing30s UI wait');
      };
      let failed = false;
      const check = (name, operation) => t.test(name, { skip: failed ? 'Prior shared journey failed' : false }, async () => {
        try { await operation(); } catch (error) {
          failed = true;
          const diagnostics = [];
          for (const [label, current] of [['main', page], ['peer', peer], ['empty', empty], ['anonymous', anonymous]]) {
            const alerts = await homeAlertOwners(current).catch(failure => [{ captureError: failure.message }]);
            diagnostics.push({ label, path: new URL(current.url()).pathname, alerts });
          }
          console.error('P9 Home alert ownership', JSON.stringify({ name, diagnostics }));
          await writeFile(join(artifacts, 'failure-alert-ownership.json'), JSON.stringify({ name, diagnostics }, null, 2))
            .catch(failure => console.error('P9 Home diagnostic artifact unavailable', failure.message));
          throw error;
        }
      });
      let teacher, roomA, roomB, notification, ownDraft;

      await check('signed-out and unverified Home gates keep the exact explicit destination', async () => {
        await anonymous.goto(`${runtime.origin}/inicio`);
        await anonymous.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === '/inicio');
        assert.equal(await anonymous.getByRole('region', { name: 'Enseño', exact: true }).count(), 0);
        teacher = await account(page, runtime.origin, runtime.inbox, teacherEmail, async () => {
          await page.goto(`${runtime.origin}/inicio`);
          await page.waitForURL(url => url.pathname === '/verify-email' && url.searchParams.get('next') === '/inicio');
          assert.equal(await page.getByRole('region', { name: 'Enseño', exact: true }).count(), 0);
        });
        await page.getByRole('link', { name: 'Ir a Inicio', exact: true }).click();
        await page.waitForURL('**/inicio');
      });

      await check('new verified accounts have honest empty groups and usable create/join actions', async () => {
        await account(peer, runtime.origin, runtime.inbox, peerEmail);
        await account(empty, runtime.origin, runtime.inbox, emptyEmail);
        // Delay forwarding one real list request, never replace its response or data.
        let release;
        const barrier = new Promise(resolve => { release = resolve; });
        const hold = async route => { await barrier; await route.continue(); };
        await empty.route('**/api/v1/classrooms', hold);
        const lists = waitLists(empty);
        try {
          await empty.goto(`${runtime.origin}/inicio`);
          await empty.getByText('Cargando tus aulas…', { exact: true }).waitFor();
          assert.equal(await empty.getByRole('region', { name: 'Enseño', exact: true }).count(), 0);
        } finally { release(); }
        for (const response of await lists) assert.equal(response.status(), 200);
        await empty.unroute('**/api/v1/classrooms', hold);
        await empty.getByText('0 aulas en Enseño y 0 aulas en Estudio.', { exact: true }).waitFor();
        await empty.getByRole('button', { name: 'Crear mi primera aula', exact: true }).waitFor();
        await empty.getByRole('button', { name: 'Unirse con código', exact: true }).click();
        await empty.getByRole('dialog', { name: 'Unirse a un aula', exact: true }).getByLabel('Código del aula').waitFor();
        await empty.getByRole('dialog', { name: 'Unirse a un aula', exact: true })
          .getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        assert.equal((await api(empty, 'GET', '/classrooms')).status, 200);
      });

      await check('actual plan scanning and explicit enrollment prepare opposite scoped roles and private drafts', async () => {
        roomA = await classroom(page, peer, 'P9 Teaching A');
        roomB = await classroom(peer, page, 'P9 Studying B');
        ownDraft = (await api(page, 'POST', '/classrooms/drafts', {})); assert.equal(ownDraft.status, 200);
        assert.equal((await api(page, 'PATCH', `/classrooms/drafts/${ownDraft.body.id}`, { revision: ownDraft.body.revision, payload: { name: 'Only my private draft' } })).status, 200);
        const foreign = await api(peer, 'POST', '/classrooms/drafts', {}); assert.equal(foreign.status, 200);
        assert.equal((await api(peer, 'PATCH', `/classrooms/drafts/${foreign.body.id}`, { revision: foreign.body.revision, payload: { name: 'Peer private draft' } })).status, 200);
        const invitation = await api(page, 'POST', `/classrooms/${roomA.id}/invitations`, { email: emptyEmail }); assert.equal(invitation.status, 200);
        await capturedInvitation(runtime.inbox, emptyEmail, invitation.body.id);
        const mine = await api(page, 'GET', '/classrooms'); assert.equal(mine.status, 200);
        assert.deepEqual(mine.body.teach.map(item => item.id), [roomA.id]);
        assert.deepEqual(mine.body.study.map(item => item.id), [roomB.id]);
        const drafts = await api(page, 'GET', '/classrooms/drafts'); assert.equal(drafts.status, 200);
        assert.deepEqual(drafts.body.map(item => item.id), [ownDraft.body.id]);
        assert.equal((await api(page, 'GET', '/classrooms/invitations')).body.length, 0);
        await rejectSame(runtime.db, () => api(page, 'GET', `/classrooms/drafts/${foreign.body.id}`), 403);
        await openHome(empty, runtime.origin);
        await empty.getByText('0 borradores privados · 1 invitación pendiente', { exact: true }).waitFor();
        assert.deepEqual((await api(empty, 'GET', '/classrooms')).body, { teach: [], study: [] });
      });

      await check('Inicio has exact Enseño/Estudio cards, preserves scoped permissions and global navigation', async () => {
        await openHome(page, runtime.origin);
        await page.getByText('1 aula en Enseño y 1 aula en Estudio.', { exact: true }).waitFor();
        const teach = page.getByRole('region', { name: 'Enseño', exact: true }), study = page.getByRole('region', { name: 'Estudio', exact: true });
        await teach.getByRole('heading', { name: 'P9 Teaching A', exact: true }).waitFor();
        await study.getByRole('heading', { name: 'P9 Studying B', exact: true }).waitFor();
        assert.equal(await teach.getByRole('heading', { name: 'P9 Studying B', exact: true }).count(), 0);
        assert.equal(await study.getByRole('heading', { name: 'P9 Teaching A', exact: true }).count(), 0);
        assert.equal(await page.getByRole('switch').count(), 0);
        const detail = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/${roomB.id}`);
        await study.getByRole('button', { name: 'Entrar al aula', exact: true }).click(); assert.equal((await detail).status(), 200);
        await page.getByRole('button', { name: 'Compañeros', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Configuración', exact: true }).count(), 0);
        const reload = waitLists(page); await page.getByRole('button', { name: 'Inicio', exact: true }).click();
        for (const response of await reload) assert.equal(response.status(), 200);
        const teachingDetail = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/${roomA.id}`);
        await page.getByRole('region', { name: 'Enseño', exact: true }).getByRole('button', { name: 'Entrar al aula', exact: true }).click();
        assert.equal((await teachingDetail).status(), 200);
        await page.getByRole('button', { name: 'Configuración', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Mis Aulas', exact: true }).click(); await page.waitForURL('**/mis-aulas');
        await page.getByRole('heading', { name: 'Mis Aulas', exact: true }).waitFor();
        await page.getByRole('link', { name: 'Mi perfil', exact: true }).click(); await page.waitForURL('**/profile');
        await page.getByRole('navigation', { name: 'Cuenta' }).getByRole('link', { name: 'Inicio', exact: true }).click();
        await page.waitForURL('**/inicio');
      });

      await check('real Home news opens only a freshly authorized POST target and focuses the correct Muro', async () => {
        const wall = await api(peer, 'GET', `/classrooms/${roomB.id}/wall`); assert.equal(wall.status, 200);
        assert.equal((await api(peer, 'POST', `/classrooms/${roomB.id}/wall`, { revision: wall.body.revision, operation: { action: 'publish', body: 'Actual Inicio news target' } })).status, 200);
        const items = await api(page, 'GET', '/classrooms/notifications'); assert.equal(items.status, 200);
        notification = items.body.find(item => item.eventType === 'WALL_NOTICE' && item.classroomId === roomB.id); assert.ok(notification);
        await openHome(page, runtime.origin);
        const news = page.getByRole('region', { name: 'Novedades', exact: true });
        await news.getByRole('heading', { name: 'Nuevo aviso del docente', exact: true }).waitFor();
        const opened = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/notifications/${notification.id}/open`);
        await news.getByRole('button', { name: 'Abrir novedad', exact: true }).click();
        const response = await opened; assert.equal(response.status(), 200); assert.equal(response.request().method(), 'POST');
        const target = await response.json(); assert.equal(target.classroomId, roomB.id); assert.equal(target.postId, notification.postId);
        await page.getByRole('region', { name: 'Muro del aula', exact: true }).waitFor();
        await page.getByText('Actual Inicio news target', { exact: true }).waitFor();
        await page.waitForFunction(id => document.activeElement?.dataset.wallId === id, target.postId);
        const flags = await api(page, 'GET', '/classrooms/notifications'); assert.equal(flags.status, 200);
        assert.ok(flags.body.find(item => item.id === notification.id).readAt);
      });

      await check('archive indicators and removal reflect current membership without restoring cached notification access', async () => {
        const detail = await api(page, 'GET', `/classrooms/${roomA.id}`); assert.equal(detail.status, 200);
        assert.equal((await api(page, 'POST', `/classrooms/${roomA.id}/archive`, { revision: detail.body.revision, archived: true })).status, 200);
        assert.equal((await api(peer, 'POST', `/classrooms/${roomB.id}/members/${teacher.id}/remove`, {})).status, 200);
        await openHome(page, runtime.origin);
        await page.getByRole('region', { name: 'Enseño', exact: true }).getByText('Archivada · Solo lectura', { exact: true }).waitFor();
        assert.equal(await page.getByRole('region', { name: 'Estudio', exact: true }).getByRole('article').count(), 0);
        await rejectSame(runtime.db, () => api(page, 'POST', `/classrooms/notifications/${notification.id}/open`, {}), 403);
        const invited = await api(peer, 'POST', `/classrooms/${roomB.id}/invitations`, { email: teacherEmail }); assert.equal(invited.status, 200);
        const link = await capturedInvitation(runtime.inbox, teacherEmail, invited.body.id);
        const pending = waitLists(page); await page.goto(link); for (const response of await pending) assert.equal(response.status(), 200);
        const selected = page.getByRole('article', { name: 'Invitación seleccionada del correo', exact: true }); await selected.waitFor();
        assert.equal((await api(page, 'GET', '/classrooms')).body.study.length, 0, 'Opening an invitation is not enrollment');
        const accepted = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/invitations/${invited.body.id}/accept`);
        await selected.getByRole('button', { name: 'Aceptar invitación', exact: true }).click(); assert.equal((await accepted).status(), 200);
        await openHome(page, runtime.origin);
        await page.getByRole('region', { name: 'Estudio', exact: true }).getByRole('heading', { name: 'P9 Studying B', exact: true }).waitFor();
      });

      await check('real offline failure conceals old cards and visible manual retry restores fresh successful lists', async () => {
        await drainHomeReads();
        await completedNewsRead(page, 'Actualizar novedades');
        await drainHomeReads();
        const news = page.getByRole('region', { name: 'Novedades', exact: true });
        const listsError = page.locator('.p5-main > [role="alert"]');
        await context.setOffline(true);
        await page.getByRole('button', { name: 'Inicio', exact: true }).click();
        await listsError.getByRole('button', { name: 'Volver a intentar', exact: true }).waitFor();
        assert.equal(await page.getByRole('region', { name: 'Enseño', exact: true }).count(), 0, 'Failed refresh must not present stale classroom cards as current');
        await news.getByRole('button', { name: 'Actualizar novedades', exact: true }).click();
        await news.getByRole('button', { name: 'Reintentar novedades', exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelector('.p9-home-news')?.getAttribute('aria-busy') === 'false');
        await drainHomeReads();
        const newsFailure = await news.getByRole('alert').innerText();
        assert.ok(newsFailure.length > 0, 'Observe the separately owned news error text');
        await context.setOffline(false);
        let pending = waitLists(page);
        await listsError.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
        let responses = await pending;
        const limited = responses.filter(response => response.status() === 429);
        if (limited.length) {
          const seconds = Math.max(...limited.map(response => Number(response.headers()['retry-after'])));
          assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'List recovery requires actual bounded Retry-After');
          await delay(seconds * 1000);
          pending = waitLists(page);
          await listsError.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
          responses = await pending;
        }
        await completedListBodies(responses);
        await page.waitForFunction(() => {
          const primary = document.querySelector('.p9-home-hero button.primary');
          return primary && !primary.disabled && document.querySelector('.p9-home [aria-label="Enseño"]')
            && !document.querySelector('.p5-main > [role="alert"]');
        });
        await drainHomeReads();
        assert.equal(await listsError.count(), 0, 'List owner clears after its own completed read/action');
        assert.equal(await news.getByRole('alert').innerText(), newsFailure, 'List recovery must not falsely clear a separate news error');
        await completedNewsRead(page, 'Reintentar novedades');
        await drainHomeReads();
        await assertHomeRecoveryOwners(page);
      });

      await check('320/375/1280 Home remains keyboard reachable, focused and overflow free with real data', async () => {
        for (const width of [320, 375, 1280]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Home overflow ${width}`);
          const homeButton = page.getByRole('button', { name: 'Inicio', exact: true });
          await page.keyboard.press('Tab');
          await homeButton.focus(); assert.equal(await homeButton.evaluate(element => document.activeElement === element), true);
          const focus = await homeButton.evaluate(element => getComputedStyle(element).outlineStyle); assert.notEqual(focus, 'none');
          await page.keyboard.press('Tab');
          assert.equal(await page.getByRole('button', { name: 'Mis Aulas', exact: true }).evaluate(element => document.activeElement === element), true);
          await page.screenshot({ path: join(artifacts, `inicio-${width}.png`), fullPage: true });
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.getByRole('button', { name: 'Inicio', exact: true }).evaluate(element => getComputedStyle(element).transitionDuration), '0s');
        assert.deepEqual(errors, []);
      });

      await check('private draft continuation keeps navigation hidden while the wizard owns saving', async () => {
        await page.getByRole('button', { name: 'Ver borradores e invitaciones', exact: true }).click();
        await page.waitForURL('**/mis-aulas');
        await page.getByRole('button', { name: /Only my private draft/ }).click();
        await page.getByText('Datos generales', { exact: true }).first().waitFor();
        assert.equal(await page.getByRole('button', { name: 'Inicio', exact: true }).count(), 0);
        assert.equal(await page.getByRole('link', { name: 'Mi perfil', exact: true }).count(), 0);
      });

      await check('ordinary login still lands on profile; explicit Inicio and revoked-session continuations remain safe', async () => {
        await anonymous.goto(`${runtime.origin}/sign-in`);
        await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(teacherEmail);
        await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
        await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/profile');
        assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
        await anonymous.goto(`${runtime.origin}/sign-in?next=%2Finicio`);
        await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(teacherEmail);
        await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
        await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/inicio');
        await anonymous.getByRole('region', { name: 'Enseño', exact: true }).waitFor();
        assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
        await anonymous.getByRole('button', { name: 'Inicio', exact: true }).click();
        await anonymous.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === '/inicio');
        assert.equal(await anonymous.getByRole('region', { name: 'Enseño', exact: true }).count(), 0);
      });

      await check('verified account navigation stays reachable without overflow at320/375/1280', async () => {
        const current = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/account');
        await peer.goto(`${runtime.origin}/profile`); assert.equal((await current).status(), 200);
        const nav = peer.getByRole('navigation', { name: 'Cuenta', exact: true });
        await nav.getByRole('link', { name: 'Inicio', exact: true }).waitFor();
        for (const width of [320, 375, 1280]) {
          await peer.setViewportSize({ width, height: 900 });
          await peer.screenshot({ path: join(artifacts, `profile-navigation-${width}.png`), fullPage: true });
          const metrics = await nav.evaluate(element => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            links: [...element.querySelectorAll('a')].map(link => {
              const bounds = link.getBoundingClientRect();
              return { label: link.textContent, left: bounds.left, right: bounds.right };
            }),
          }));
          assert.equal(metrics.overflow, false, `Account navigation overflow ${width}: ${JSON.stringify(metrics)}`);
          assert.ok(metrics.links.every(link => link.left >= 0 && link.right <= width), `Account navigation must remain reachable ${width}`);
        }
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
