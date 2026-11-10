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
const waitLists = page => Promise.all(listPaths.map(path => page.waitForResponse(response => new URL(response.url()).pathname === path)));

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

async function completedListBodies(responses) {
  const bodies = await Promise.all(responses.map(async response => {
    assert.equal(response.status(), 200, 'List owner requires actual admittedHTTP200');
    assert.equal(await response.finished(), null, 'List response body must finish');
    return response.json();
  }));
  assert.ok(Array.isArray(bodies[0].teach) && Array.isArray(bodies[0].study));
  assert.ok(Array.isArray(bodies[1]) && Array.isArray(bodies[2]));
}

/** A displayed Home snapshot counts only after the real aggregate returns successfully. */
async function openHome(page, origin) {
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/home' && response.request().method() === 'GET');
  await page.goto(`${origin}/inicio`);
  let response = await pending;
  if (response.status() === 429) {
    const seconds = Number(response.headers()['retry-after']);
    assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'Home requires actual bounded Retry-After');
    await delay(seconds * 1000);
    const retry = page.waitForResponse(value => new URL(value.url()).pathname === '/api/v1/home' && value.request().method() === 'GET');
    await page.getByRole('button', { name: 'Reintentar Inicio', exact: true }).click();
    response = await retry;
  }
  assert.equal(response.status(), 200, 'Fresh actual Home response required');
  assert.equal(await response.finished(), null);
  const data = await response.json();
  assert.ok(data.subjectId && data.memberships && data.modules);
  await page.getByRole('region', { name: 'Inicio', exact: true }).waitFor();
  await page.getByRole('heading', { name: '¡Buen día, Files!', exact: true }).waitFor();
  return data;
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

test('P9 actual Inicio, exclusive account roles, safe news and additive account navigation', { timeout: 330000 }, async t => {
  const artifacts = await mkdtemp(join(tmpdir(), 'foxmind-p9-home-'));
  console.log(`P9 Home screenshot scratch: ${artifacts}`);
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const peerContext = await browser.newContext();
      const peer = await peerContext.newPage();
      const otherTeacher = await (await browser.newContext()).newPage();
      const empty = await (await browser.newContext()).newPage();
      const anonymous = await (await browser.newContext()).newPage();
      const suffix = Date.now(), teacherEmail = `p9-home-a-${suffix}@example.test`, peerEmail = `p9-home-b-${suffix}@example.test`, emptyEmail = `p9-home-empty-${suffix}@example.test`;
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const admissionStarted = Date.now(), admissionCounts = new Map(), admissionLimited = [], admissionPending = new Set();
      for (const [label, current] of [['main', page], ['peer', peer], ['other-teacher', otherTeacher], ['empty', empty], ['anonymous', anonymous]]) {
        current.on('request', request => {
          const path = new URL(request.url()).pathname;
          if (!path.startsWith('/api/v1/')) return;
          const key = `${label} ${request.method()} ${path}`;
          admissionCounts.set(key, (admissionCounts.get(key) ?? 0) + 1);
        });
        current.on('response', response => {
          const path = new URL(response.url()).pathname;
          if (!path.startsWith('/api/v1/') || response.status() !== 429) return;
          const limited = { label, method: response.request().method(), path, status: 429,
            retryAfter: response.headers()['retry-after'] ?? null, elapsedMs: Date.now() - admissionStarted };
          admissionLimited.push(limited);
          const pending = response.json().then(body => { limited.code = body.error?.code ?? body.code ?? null; })
            .catch(() => { limited.code = 'UNREADABLE_ERROR_BODY'; });
          admissionPending.add(pending); void pending.finally(() => admissionPending.delete(pending));
        });
      }
      const admissionSnapshot = () => ({ limited: admissionLimited,
        counts: [...admissionCounts].sort(([left], [right]) => left.localeCompare(right)).map(([request, count]) => ({ request, count })) });
      const pendingHomeReads = new Set();
      let documentGeneration = 0;
      const readEvidence = new Map();
      const watched = request => request.method() === 'GET' && [...listPaths, '/api/v1/classrooms/notifications/page', '/api/v1/home'].includes(new URL(request.url()).pathname);
      peer.on('request', request => {
        if (request.isNavigationRequest() && request.frame() === peer.mainFrame()) documentGeneration += 1;
        if (watched(request)) { pendingHomeReads.add(request); readEvidence.set(request, { generation: documentGeneration }); }
      });
      peer.on('domcontentloaded', () => {
        // A new document cannot receive the prior document's fetch state updates.
        // Keep every current-document read, including reads across Next client navigation.
        for (const request of pendingHomeReads) {
          if (readEvidence.get(request)?.generation < documentGeneration) pendingHomeReads.delete(request);
        }
      });
      peer.on('response', response => { const value = readEvidence.get(response.request()); if (value) value.status = response.status(); });
      peer.on('requestfinished', request => pendingHomeReads.delete(request));
      peer.on('requestfailed', request => pendingHomeReads.delete(request));
      const drainHomeReads = async () => {
        const deadline = Date.now() + 30000;
        while (pendingHomeReads.size && Date.now() < deadline) await delay(20);
        assert.equal(pendingHomeReads.size, 0, `Observe current-document reads completing before offline within the existing30s UI wait: ${JSON.stringify({ documentGeneration,
          pending: [...pendingHomeReads].map(request => ({ path: new URL(request.url()).pathname, ...readEvidence.get(request), failure: request.failure()?.errorText })) })}`);
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
          await Promise.all([...admissionPending]);
          const admission = admissionSnapshot();
          console.error('P9 Home alert ownership', JSON.stringify({ name, diagnostics, admission }));
          await writeFile(join(artifacts, 'failure-alert-ownership.json'), JSON.stringify({ name, diagnostics, admission }, null, 2))
            .catch(failure => console.error('P9 Home diagnostic artifact unavailable', failure.message));
          throw error;
        }
      });
      let student, roomA, roomB, notification, ownDraft;

      await check('signed-out and unverified Home gates keep the exact explicit destination', async () => {
        await anonymous.goto(`${runtime.origin}/inicio`);
        await anonymous.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === '/inicio');
        assert.equal(await anonymous.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).count(), 0);
        await account(page, runtime.origin, runtime.inbox, teacherEmail, async () => {
          await page.goto(`${runtime.origin}/inicio`);
          await page.waitForURL(url => url.pathname === '/verify-email' && url.searchParams.get('next') === '/inicio');
          assert.equal(await page.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).count(), 0);
        }, 'teacher');
        await page.getByRole('link', { name: 'Ir a Inicio', exact: true }).click();
        await page.waitForURL('**/inicio');
      });

      await check('new verified accounts have honest empty groups and usable create/join actions', async () => {
        student = await account(peer, runtime.origin, runtime.inbox, peerEmail, undefined, 'student');
        await account(empty, runtime.origin, runtime.inbox, emptyEmail, undefined, 'student');
        await page.getByRole('button', { name: 'Crear mi primera aula' }).waitFor();
        // Delay forwarding the real aggregate response, never replace its data.
        let release;
        const barrier = new Promise(resolve => { release = resolve; });
        const hold = async route => { await barrier; await route.continue(); };
        await empty.route('**/api/v1/home?*', hold);
        const pending = empty.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/home');
        try {
          await empty.goto(`${runtime.origin}/inicio`);
          await empty.getByText('Cargando tus actividades y próximos pasos…', { exact: true }).waitFor();
          assert.equal(await empty.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).count(), 0);
        } finally { release(); }
        const response = await pending; assert.equal(response.status(), 200);
        const data = await response.json(); assert.equal(data.memberships.study, 0); assert.equal(data.memberships.teach, 0);
        await empty.unroute('**/api/v1/home?*', hold);
        assert.equal(await empty.getByRole('button', { name: /Crear.*aula/ }).count(), 0);
        await empty.getByRole('button', { name: 'Unirme con código', exact: true }).click();
        await empty.getByRole('dialog', { name: 'Unirse a un aula', exact: true }).getByLabel('Código del aula').waitFor();
        await empty.getByRole('dialog', { name: 'Unirse a un aula', exact: true })
          .getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        assert.equal((await api(empty, 'GET', '/classrooms')).status, 200);
      });

      await check('actual plan scanning and explicit enrollment prepare opposite scoped roles and private drafts', async () => {
        roomA = await classroom(page, peer, 'P9 Teaching A');
        await account(otherTeacher, runtime.origin, runtime.inbox, `p9-home-other-${suffix}@example.test`, undefined, 'teacher');
        roomB = await classroom(otherTeacher, peer, 'P9 Studying B');
        ownDraft = (await api(page, 'POST', '/classrooms/drafts', {})); assert.equal(ownDraft.status, 200);
        assert.equal((await api(page, 'PATCH', `/classrooms/drafts/${ownDraft.body.id}`, { revision: ownDraft.body.revision, payload: { name: 'Only my private draft' } })).status, 200);
        const foreign = await api(otherTeacher, 'POST', '/classrooms/drafts', {}); assert.equal(foreign.status, 200);
        assert.equal((await api(otherTeacher, 'PATCH', `/classrooms/drafts/${foreign.body.id}`, { revision: foreign.body.revision, payload: { name: 'Peer private draft' } })).status, 200);
        const invitation = await api(page, 'POST', `/classrooms/${roomA.id}/invitations`, { email: emptyEmail }); assert.equal(invitation.status, 200);
        await capturedInvitation(runtime.inbox, emptyEmail, invitation.body.id);
        const mine = await api(page, 'GET', '/classrooms'); assert.equal(mine.status, 200);
        assert.deepEqual(mine.body.teach.map(item => item.id), [roomA.id]);
        assert.deepEqual(mine.body.study, []);
        const drafts = await api(page, 'GET', '/classrooms/drafts'); assert.equal(drafts.status, 200);
        assert.deepEqual(drafts.body.map(item => item.id), [ownDraft.body.id]);
        assert.equal((await api(page, 'GET', '/classrooms/invitations')).body.length, 0);
        await rejectSame(runtime.db, () => api(page, 'GET', `/classrooms/drafts/${foreign.body.id}`), 403);
        const emptyHome = await openHome(empty, runtime.origin);
        assert.equal(emptyHome.setup.drafts, 0); assert.equal(emptyHome.setup.invitations, 1);
        assert.deepEqual((await api(empty, 'GET', '/classrooms')).body, { teach: [], study: [] });
      });

      await check('Inicio preserves role-scoped classroom context, permitted entry and global navigation', async () => {
        const home = await openHome(page, runtime.origin);
        assert.equal(home.memberships.teach, 1); assert.equal(home.memberships.study, 0);
        const studentHome = await openHome(peer, runtime.origin);
        assert.equal(studentHome.memberships.teach, 0);
        assert.equal(studentHome.memberships.study, 2);
        assert.equal(studentHome.modules.classrooms.status, 'ready');
        assert.equal(home.modules.classrooms.status, 'ready');
        const classrooms = home.modules.classrooms.items;
        assert.ok(classrooms.some(item => item.classroom.id === roomA.id && item.classroom.role === 'teacher'));
        assert.ok(studentHome.modules.classrooms.items.some(item => item.classroom.id === roomB.id && item.classroom.role === 'student'));
        const region = page.getByRole('region', { name: 'Aula en foco', exact: true });
        const teach = region.getByRole('listitem').filter({ has: page.getByRole('heading', { name: 'P9 Teaching A', exact: true }) });
        const study = peer.getByRole('region', { name: 'Accesos de mi aula', exact: true });
        const changeClassroom = study.getByRole('button', { name: 'Cambiar aula', exact: true });
        if (await changeClassroom.isVisible()) {
          await changeClassroom.click();
          await peer.getByRole('dialog', { name: 'Elegí un aula', exact: true }).getByRole('button')
            .filter({ has: peer.getByText('P9 Studying B', { exact: true }) }).click();
        }
        assert.ok(classrooms.every(item => item.classroom.role === 'teacher'), 'Teacher aggregate never includes a foreign student scope');
        assert.ok(studentHome.modules.classrooms.items.every(item => item.classroom.role === 'student'), 'Student aggregate never includes teacher scope');
        const activeTeacher = classrooms.filter(item => !item.classroom.archived);
        assert.deepEqual(activeTeacher.map(item => item.classroom.id), [roomA.id], 'Only the owned active classroom is eligible for teacher focus');
        await teach.getByRole('heading', { name: 'P9 Teaching A', exact: true }).waitFor();
        assert.equal(await region.getByRole('listitem').count(), 1, 'The approved teacher rail exposes one focused classroom');
        assert.equal(await region.getByRole('heading', { name: 'P9 Studying B', exact: true }).count(), 0, 'Foreign classroom is absent from teacher focus');
        assert.equal(await region.getByText(/Archivada/).count(), 0, 'Archived history is outside the active focus');
        await study.getByText('P9 Studying B · A', { exact: true }).waitFor();
        assert.equal(await page.getByRole('switch').count(), 0);
        const detail = peer.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/${roomB.id}`);
        await study.getByRole('button', { name: 'Plan de estudio', exact: true }).click(); assert.equal((await detail).status(), 200);
        await peer.getByRole('button', { name: 'Compañeros', exact: true }).waitFor();
        assert.equal(await peer.getByRole('button', { name: 'Configuración', exact: true }).count(), 0);
        const freshTeaching = await openHome(page, runtime.origin);
        const focused = freshTeaching.modules.classrooms.items.find(item => item.classroom.id === roomA.id);
        assert.ok(focused?.nextTopic?.topicId, 'The active fixture classroom has an authorized next topic');
        const nextTopic = focused.nextTopic;
        const teachingDetail = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/${roomA.id}`);
        await region.getByRole('button', { name: 'Abrir tema: P9 Teaching A', exact: true }).click();
        const teachingResponse = await teachingDetail; assert.equal(teachingResponse.status(), 200);
        const teachingRoom = await teachingResponse.json();
        assert.equal(teachingRoom.id, roomA.id);
        assert.ok(teachingRoom.units.some(unit => unit.id === nextTopic.unitId && unit.topics.some(topic => topic.id === nextTopic.topicId)), 'Next topic belongs to the freshly authorized classroom detail');
        await page.getByRole('region', { name: 'Tema seleccionado', exact: true }).getByRole('heading', { name: nextTopic.topicName, exact: true }).waitFor();
        assert.equal(await page.locator('select[aria-label="Tema del plan"]').inputValue(), nextTopic.topicId, 'Navigation preserves the exact topic identifier');
        await page.getByRole('button', { name: 'Configuración', exact: true }).waitFor();
        await (await navigationLink(page, 'Mis aulas')).click(); await page.waitForURL('**/mis-aulas');
        await page.getByRole('heading', { name: 'Mis aulas', exact: true }).waitFor();
        await (await profileAction(page)).click(); await page.waitForURL('**/profile');
        await (await navigationLink(page, 'Inicio')).click();
        await page.waitForURL('**/inicio');
      });

      await check('real Home news opens only a freshly authorized POST target and focuses the correct Muro', async () => {
        const wall = await api(otherTeacher, 'GET', `/classrooms/${roomB.id}/wall`); assert.equal(wall.status, 200);
        assert.equal((await api(otherTeacher, 'POST', `/classrooms/${roomB.id}/wall`, { revision: wall.body.revision, operation: { action: 'publish', body: 'Actual Inicio news target' } })).status, 200);
        const items = await api(peer, 'GET', '/classrooms/notifications'); assert.equal(items.status, 200);
        notification = items.body.find(item => item.eventType === 'WALL_NOTICE' && item.classroomId === roomB.id); assert.ok(notification);
        await openHome(peer, runtime.origin);
        await peer.getByRole('button', { name: /^Notificaciones/ }).click();
        const dialog = peer.getByRole('dialog', { name: 'Notificaciones', exact: true });
        const notice = dialog.getByRole('listitem').filter({ has: peer.getByText('P9 Studying B · A', { exact: true }) })
          .filter({ has: peer.getByText('Nuevo aviso del docente', { exact: true }) });
        const opened = peer.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/notifications/${notification.id}/open`);
        await notice.getByRole('button', { name: 'Abrir conversación', exact: true }).click();
        const response = await opened; assert.equal(response.status(), 200); assert.equal(response.request().method(), 'POST');
        const target = await response.json(); assert.equal(target.classroomId, roomB.id); assert.equal(target.postId, notification.postId);
        await peer.getByRole('region', { name: 'Muro del aula', exact: true }).waitFor();
        await peer.getByText('Actual Inicio news target', { exact: true }).waitFor();
        await peer.waitForFunction(id => document.activeElement?.dataset.wallId === id, target.postId);
        const flags = await api(peer, 'GET', '/classrooms/notifications'); assert.equal(flags.status, 200);
        assert.ok(flags.body.find(item => item.id === notification.id).readAt);
      });

      await check('PostgreSQL exposes public curriculum progress while unanswered queries remain teacher-only', async () => {
        const path = `/classrooms/${roomA.id}`;
        const detail = await api(page, 'GET', path);
        assert.equal(detail.status, 200);
        const topic = detail.body.units[0].topics[0];
        assert.equal((await api(page, 'POST', `${path}/plan`, {
          revision: detail.body.revision, operation: { action: 'setTopicState', id: topic.id, status: 'TAUGHT' },
        })).status, 200);
        const wall = async actor => {
          const result = await api(actor, 'GET', `${path}/wall`);
          assert.equal(result.status, 200);
          return result.body;
        };
        const change = async (actor, operation) => {
          const { revision } = await wall(actor);
          assert.equal((await api(actor, 'POST', `${path}/wall`, { revision, operation })).status, 200);
        };
        const question = '¿Cómo repasamos el primer tema?';
        await change(peer, { action: 'publish', body: question });
        const post = (await wall(page)).posts.find(item => item.body === question);
        assert.ok(post);
        await change(peer, { action: 'reply', postId: post.id, body: 'Aclaro mi consulta' });
        const teacherHome = await openHome(page, runtime.origin);
        assert.deepEqual(teacherHome.modules.classrooms.items.find(item => item.id === roomA.id).planProgress, { taught: 1, total: 2 });
        assert.ok(teacherHome.modules.queries.items.some(item => item.id === post.id));
        assert.equal(teacherHome.modules.queries.totalItems, 1, 'Unanswered query counter is the actual authorized total');
        assert.equal(teacherHome.modules.materials.totalItems, null, 'Recent materials keep their unknown total contract');
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode()));
        });
        const populatedQueries = page.getByRole('group', { name: 'Filtrar pendientes', exact: true }).getByRole('button', { name: /^Consultas/ });
        assert.match(await populatedQueries.innerText(), /Consultas\s*1$/, 'The populated screenshot must include the actual query counter');
        await page.screenshot({ path: join(artifacts, 'inicio-teacher-populated-1280.png'), fullPage: true });
        await page.getByRole('progressbar', { name: 'Avance del plan de P9 Teaching A' }).waitFor();
        const queryWidget = page.getByRole('region', { name: 'Consultas sin responder' });
        await page.getByRole('button', { name: /^Consultas(?:\s+\d+)?$/ }).click();
        await queryWidget.getByText(question, { exact: true }).waitFor();
        await queryWidget.getByRole('button', { name: `Abrir consulta: ${question}` }).click();
        await page.getByText(question, { exact: true }).waitFor();
        const learnerHome = await openHome(peer, runtime.origin);
        const learnerRooms = learnerHome.modules.classrooms.items;
        assert.deepEqual(learnerRooms.find(item => item.classroom.id === roomA.id).planProgress, { taught: 1, total: 2 }, 'Plan progress is public curriculum metadata for current students');
        assert.deepEqual(learnerRooms.find(item => item.classroom.id === roomB.id).planProgress, { taught: 0, total: 2 });
        for (const item of learnerRooms) for (const privateField of ['finalGrade', 'grade', 'overallFeedback', 'rubricMarks', 'aiGradingRubric']) {
          assert.equal(Object.hasOwn(item, privateField), false, `Classroom metadata must not contain private grading field ${privateField}`);
        }
        assert.equal(learnerHome.modules.queries.status, 'not-applicable');
        assert.equal(await peer.getByRole('progressbar').count(), 0);
        await change(page, { action: 'reply', postId: post.id, body: 'Repasemos con el plan.' });
        const answered = await openHome(page, runtime.origin);
        assert.equal(answered.modules.queries.status, 'ready');
        assert.ok(!answered.modules.queries.items.some(item => item.id === post.id));
        assert.equal(answered.modules.queries.totalItems, 0);
        await page.getByRole('button', { name: /^Consultas(?:\s+\d+)?$/ }).click();
        await queryWidget.getByText('No hay consultas por responder en tus aulas activas.').waitFor();
        const reply = (await wall(page)).posts.find(item => item.id === post.id).replies.find(item => item.body === 'Repasemos con el plan.');
        await change(page, { action: 'removeReply', id: reply.id, confirm: true });
        const reopened = await openHome(page, runtime.origin);
        assert.ok(reopened.modules.queries.items.some(item => item.id === post.id));
        assert.equal(reopened.modules.queries.totalItems, 1);
      });

      await check('archive indicators and removal reflect current membership without restoring cached notification access', async () => {
        // Four real accounts share one IP budget. Do not compress their prior block
        // and the archive/re-admission block into the same real 60-second window.
        await drainHomeReads();
        const pacingStarted = Date.now();
        console.log(`P9 fixture archive boundary: prior elapsed=${pacingStarted - admissionStarted}ms; waiting one real60_001ms admission window`);
        await delay(60_001);
        console.log(`P9 fixture archive boundary resumed after ${Date.now() - pacingStarted}ms; ${JSON.stringify(admissionSnapshot())}`);
        const detail = await api(page, 'GET', `/classrooms/${roomA.id}`); assert.equal(detail.status, 200);
        assert.equal((await api(page, 'POST', `/classrooms/${roomA.id}/archive`, { revision: detail.body.revision, archived: true })).status, 200);
        const archivedTeacher = await openHome(page, runtime.origin);
        const archivedRoom = archivedTeacher.modules.classrooms.items.find(item => item.id === roomA.id);
        assert.ok(archivedRoom?.classroom.archived && !('planProgress' in archivedRoom));
        assert.equal(archivedTeacher.modules.queries.status, 'not-applicable');
        assert.equal((await api(otherTeacher, 'POST', `/classrooms/${roomB.id}/members/${student.id}/remove`, {})).status, 200);
        const archivedHome = await openHome(peer, runtime.origin);
        assert.equal(archivedHome.memberships.study, 0);
        assert.equal(archivedHome.modules.classrooms.status, 'ready');
        assert.ok(!archivedHome.modules.classrooms.items.some(item => item.classroom.id === roomB.id));
        const collectionSession = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/session' && response.request().method() === 'GET');
        await (await navigationLink(peer, 'Mis aulas')).click(); await peer.waitForURL('**/mis-aulas');
        let admittedSession = await collectionSession;
        if (admittedSession.status() === 429) {
          assert.equal((await admittedSession.json()).error.code, 'RATE_LIMITED');
          const retryAfter = admittedSession.headers()['retry-after'];
          assert.match(retryAfter ?? '', /^\d+$/, 'Session admission requires the actual integer Retry-After');
          const seconds = Number(retryAfter);
          assert.ok(Number.isSafeInteger(seconds) && seconds >= 1 && seconds <= 60, 'Session admission cooldown must be bounded to1..60seconds');
          console.log(`P9 archive navigation respects actual session Retry-After=${seconds}s; one visible retry`);
          await delay(seconds * 1000);
          const retriedSession = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/session' && response.request().method() === 'GET');
          await peer.getByRole('alert').filter({ hasText: 'Se alcanzó el límite de intentos.' })
            .getByRole('button', { name: 'Volver a intentar', exact: true }).click();
          admittedSession = await retriedSession;
        }
        assert.equal(admittedSession.status(), 200, `Archive collection requires an admitted session before its controls can mount: ${JSON.stringify({ path: new URL(admittedSession.url()).pathname, retryAfter: admittedSession.headers()['retry-after'] ?? null, admission: admissionSnapshot() })}`);
        await peer.getByRole('heading', { name: 'Mis aulas', exact: true }).waitFor();
        await peer.getByRole('button', { name: /^Archivadas/ }).click();
        const archived = peer.getByRole('article')
          .filter({ has: peer.getByRole('heading', { name: 'P9 Teaching A', exact: true }) });
        await archived.getByText(/Archivada/).waitFor();
        await rejectSame(runtime.db, () => api(peer, 'POST', `/classrooms/notifications/${notification.id}/open`, {}), 403);
        const invited = await api(otherTeacher, 'POST', `/classrooms/${roomB.id}/invitations`, { email: peerEmail }); assert.equal(invited.status, 200);
        const link = await capturedInvitation(runtime.inbox, peerEmail, invited.body.id);
        const pending = waitLists(peer); await peer.goto(link); for (const response of await pending) assert.equal(response.status(), 200);
        const selected = peer.getByRole('article', { name: 'Invitación seleccionada del correo', exact: true }); await selected.waitFor();
        assert.ok(!(await api(peer, 'GET', '/classrooms')).body.study.some(item => item.id === roomB.id),
          'Opening an invitation is not enrollment');
        const accepted = peer.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/invitations/${invited.body.id}/accept`);
        await selected.getByRole('button', { name: 'Aceptar invitación', exact: true }).click(); assert.equal((await accepted).status(), 200);
        await openHome(peer, runtime.origin);
        await peer.getByRole('region', { name: 'Accesos de mi aula', exact: true }).getByText('P9 Studying B · A', { exact: true }).waitFor();
      });

      await check('real offline failure conceals old cards and visible manual retry restores fresh successful lists', async () => {
        await drainHomeReads();
        await peerContext.setOffline(true);
        await refreshHomeByFocus(peer);
        await peer.getByRole('button', { name: 'Reintentar Inicio', exact: true }).waitFor();
        assert.equal(await peer.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).count(), 0, 'Failed refresh must not present stale classroom cards as current');
        await peer.getByRole('button', { name: /^Notificaciones/ }).click();
        const dialog = peer.getByRole('dialog', { name: 'Notificaciones', exact: true });
        await dialog.locator('p[role="alert"]').waitFor();
        const notificationFailure = await dialog.locator('p[role="alert"]').innerText();
        assert.ok(notificationFailure.length > 0, 'Observe independently owned notification error');
        await dialog.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        await peerContext.setOffline(false);
        const notificationRequests = [];
        const captureNotification = request => {
          if (request.method() === 'GET' && new URL(request.url()).pathname === '/api/v1/classrooms/notifications/page') notificationRequests.push(request);
        };
        peer.on('request', captureNotification);
        try {
          const homeResponse = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/home' && response.request().method() === 'GET');
          await peer.getByRole('button', { name: 'Reintentar Inicio', exact: true }).click();
          assert.equal((await homeResponse).status(), 200);
          await peer.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).waitFor();
          assert.equal(notificationRequests.length, 0, 'Home retry does not fetch independently owned notifications');
        } finally { peer.off('request', captureNotification); }
        const reopened = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/classrooms/notifications/page' && response.request().method() === 'GET');
        await peer.getByRole('button', { name: /^Notificaciones/ }).click();
        const reopenedResponse = await reopened; assert.equal(reopenedResponse.status(), 200);
        assert.ok((await reopenedResponse.json()).items.some(item => item.classroomId === roomB.id && item.eventType === 'WALL_NOTICE'));
        const notificationResponse = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/classrooms/notifications/page' && response.request().method() === 'GET');
        await dialog.getByRole('button', { name: 'Actualizar notificaciones', exact: true }).click();
        let recovered = await notificationResponse;
        if (recovered.status() === 429) {
          const seconds = Number(recovered.headers()['retry-after']);
          assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
          console.log(`P9 notification recovery respects actual Retry-After=${seconds}s`);
          await delay(seconds * 1000);
          const retry = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/classrooms/notifications/page' && response.request().method() === 'GET');
          await dialog.getByRole('button', { name: 'Actualizar notificaciones', exact: true }).click();
          recovered = await retry;
        }
        assert.equal(recovered.status(), 200);
        await peer.waitForFunction(() => !document.querySelector('dialog[open][aria-labelledby="p5-dialog-title"] [role="alert"]'));
        await dialog.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        await drainHomeReads();
        await assertHomeRecoveryOwners(peer);

      });

      await check('320/375/1280 Home remains keyboard reachable, focused and overflow free with real data', async () => {
        for (const [role, current] of [['teacher', page], ['student', peer]]) for (const width of [320, 375, 1280]) {
          await current.setViewportSize({ width, height: 900 });
          await current.locator('.fm-home-panorama').evaluate(image => image.decode());
          if (role === 'teacher') await current.locator('.fm-home-module--classrooms > .fm-home-empty').waitFor();
          const geometry = await current.evaluate(async () => {
            await document.fonts.ready;
            const hero = document.querySelector('.fm-home-greeting').getBoundingClientRect();
            const image = document.querySelector('.fm-brujula-foxy').getBoundingClientRect();
            const panel = document.querySelector('.fm-home-glass'), glass = panel.getBoundingClientRect();
            const focused = document.querySelector('.fm-home-module--classrooms'), focusedHeader = focused?.querySelector(':scope > header'), focusedEmpty = focused?.querySelector(':scope > .fm-home-empty');
            const headerBox = focusedHeader?.getBoundingClientRect(), emptyBox = focusedEmpty?.getBoundingClientRect();
            const rect = value => ({ left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height });
            const textRects = [];
            for (const element of panel.querySelectorAll('time,h1,p')) {
              const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
              let node;
              while ((node = walker.nextNode())) {
                const value = node.textContent ?? '', start = value.search(/\S/);
                if (start < 0) continue;
                const style = getComputedStyle(node.parentElement);
                if (style.display === 'none' || style.visibility !== 'visible') continue;
                const range = document.createRange();
                range.setStart(node, start); range.setEnd(node, value.search(/\s*$/));
                for (const box of range.getClientRects()) if (box.width > 0 && box.height > 0) {
                  textRects.push({ element: element.tagName, ...rect(box) });
                }
              }
            }
            return { overflow: document.documentElement.scrollWidth > innerWidth,
              foxInside: image.left >= hero.left && image.right <= hero.right,
              textClear: textRects.length > 0 && textRects.every(box => box.right <= image.left || box.left >= image.right || box.bottom <= image.top || box.top >= image.bottom),
              glassInside: glass.top >= hero.top && glass.bottom <= hero.bottom,
              emptyFocusClear: !emptyBox || !!headerBox && (headerBox.right <= emptyBox.left || headerBox.left >= emptyBox.right || headerBox.bottom <= emptyBox.top || headerBox.top >= emptyBox.bottom),
              rects: { hero: rect(hero), image: rect(image), glass: rect(glass), text: textRects,
                focusedHeader: headerBox ? rect(headerBox) : null, focusedEmpty: emptyBox ? rect(emptyBox) : null } };
          });
          const { rects, ...geometryChecks } = geometry;
          if (geometryChecks.overflow || !geometryChecks.foxInside || !geometryChecks.textClear || !geometryChecks.glassInside || !geometryChecks.emptyFocusClear) {
            console.error('P9 Home geometry failure', JSON.stringify({ role, width, ...geometry }));
            await current.screenshot({ path: join(artifacts, `inicio-geometry-failure-${role}-${width}.png`), fullPage: true })
              .catch(error => console.error('P9 Home geometry screenshot unavailable', error.message));
          }
          assert.deepEqual(geometryChecks, { overflow: false, foxInside: true, textClear: true, glassInside: true, emptyFocusClear: true }, `${role}/${width}: ${JSON.stringify(rects)}`);
          assert.equal(await current.getByRole('button', { name: 'Actualizar Inicio', exact: true }).count(), 0);
          assert.equal(await current.locator('.fm-home-resources,.fm3d-shell-location,.fm3d-shell-avatar').count(), 0);
          const homeButton = await navigationLink(current, 'Inicio');
          await homeButton.focus(); assert.equal(await homeButton.evaluate(element => document.activeElement === element), true);
          assert.notEqual(await homeButton.evaluate(element => getComputedStyle(element).outlineStyle), 'none');
          await current.keyboard.press('Tab');
          assert.equal(await (await navigationLink(current, 'Mis aulas')).evaluate(element => document.activeElement === element), true);
          if (width === 320) {
            const drawer = current.getByRole('dialog', { name: 'Menú de navegación', exact: true });
            await drawer.getByRole('button', { name: /^Notificaciones/ }).click();
            const notifications = current.getByRole('dialog', { name: 'Notificaciones', exact: true });
            await notifications.waitFor();
            await current.waitForFunction(() => !document.querySelector('.entry-notifications button:disabled'));
            await current.keyboard.press('Escape');
            await notifications.waitFor({ state: 'hidden' });
            assert.equal(await drawer.isVisible(), true, 'Escape closes only the top notification dialog');
            await drawer.getByRole('button', { name: 'Cerrar menú de navegación', exact: true }).click();
          }
          await current.screenshot({ path: join(artifacts, `inicio-${role}-${width}.png`), fullPage: true });
        }
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await (await navigationLink(page, 'Inicio')).evaluate(element => getComputedStyle(element).transitionDuration), '0s');
        assert.deepEqual(errors, []);
      });

      await check('private draft continuation keeps navigation hidden while the wizard owns saving', async () => {
        const received = new Map();
        const capture = response => {
          const path = new URL(response.url()).pathname;
          if (listPaths.includes(path)) received.set(path, response);
        };
        page.on('response', capture);
        let responses;
        try {
          const pendingSession = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/session');
          await (await navigationLink(page, 'Mis aulas')).click();
          await page.waitForURL('**/mis-aulas');
          let session = await pendingSession;
          if (session.status() === 429) {
            const seconds = Number(session.headers()['retry-after']);
            assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
            console.log(`P9 collection session respects actual Retry-After=${seconds}s`);
            await delay(seconds * 1000);
            const retry = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/auth/session');
            await page.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
            session = await retry;
          }
          assert.equal(session.status(), 200);
          const deadline = Date.now() + 30000;
          while (received.size < listPaths.length && Date.now() < deadline) await delay(20);
          assert.equal(received.size, listPaths.length, 'All collection reads require real completed responses');
          responses = listPaths.map(path => received.get(path));
        } finally { page.off('response', capture); }
        const limited = responses.filter(response => response.status() === 429);
        if (limited.length) {
          const waits = limited.map(response => Number(response.headers()['retry-after']));
          assert.ok(waits.every(seconds => Number.isInteger(seconds) && seconds > 0 && seconds <= 60));
          console.log(`P9 draft navigation respects actual Retry-After=${Math.max(...waits)}s`);
          await delay(Math.max(...waits) * 1000);
          const settled = [...responses];
          for (const [index, response] of responses.entries()) {
            if (response.status() !== 429) continue;
            const retry = page.waitForResponse(value => new URL(value.url()).pathname === listPaths[index]);
            const label = ['tus aulas', 'tus borradores', 'tus invitaciones'][index];
            const alert = page.getByRole('alert').filter({ hasText: `No pudimos cargar ${label}.` });
            await alert.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
            settled[index] = await retry;
            assert.equal(settled[index].status(), 200, `Retry for ${label}`);
            await alert.waitFor({ state: 'hidden' });
          }
          await completedListBodies(settled);
        } else await completedListBodies(responses);
        await page.getByRole('button', { name: /^Pendientes/ }).click();
        await page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Only my private draft', exact: true }) }).getByRole('button', { name: 'Continuar creación', exact: true }).click();
        const draftWizard = page.getByRole('dialog', { name: 'Crear aula', exact: true });
        await draftWizard.getByRole('textbox', { name: 'Nombre del aula', exact: true }).waitFor();
        assert.equal(await draftWizard.getByRole('textbox', { name: 'Nombre del aula', exact: true }).inputValue(), 'Only my private draft');
        for (const name of ['Inicio', 'Mi perfil']) {
          for (const link of await page.getByRole('link', { name, exact: true }).all()) {
            await link.evaluate(element => element.focus());
            assert.equal(await draftWizard.evaluate(element => element.contains(document.activeElement)), true);
          }
        }
      });

      await check('ordinary login lands on Inicio; explicit Inicio and revoked-session continuations remain safe', async () => {
        await anonymous.goto(`${runtime.origin}/sign-in`);
        await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(teacherEmail);
        await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
        await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/inicio');
        assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
        await anonymous.goto(`${runtime.origin}/sign-in?next=%2Finicio`);
        await anonymous.getByLabel('Correo electrónico', { exact: true }).fill(teacherEmail);
        await anonymous.getByLabel('Contraseña', { exact: true }).fill(password);
        await anonymous.getByRole('button', { name: 'Iniciar sesión', exact: true }).click(); await anonymous.waitForURL('**/inicio');
        await anonymous.getByRole('region', { name: 'Aula en foco', exact: true }).waitFor();
        assert.equal((await api(anonymous, 'POST', '/auth/logout')).status, 204, 'Logout clears the real session and returns the accepted no-content contract');
        const rejectedHome = anonymous.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/home' && response.request().method() === 'GET');
        await refreshHomeByFocus(anonymous);
        const rejectedResponse = await rejectedHome;
        assert.equal(rejectedResponse.status(), 401); assert.equal((await rejectedResponse.json()).error.code, 'AUTH_REQUIRED');
        await anonymous.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === '/inicio');
        assert.equal(await anonymous.getByRole('region', { name: /^(Aula en foco|Accesos de mi aula|Acciones del aula)$/ }).count(), 0);
      });

      await check('verified account navigation stays reachable without overflow at320/375/1280', async () => {
        const current = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/account');
        await peer.goto(`${runtime.origin}/profile`);
        let accountResponse = await current;
        if (accountResponse.status() === 429) {
          const seconds = Number(accountResponse.headers()['retry-after']);
          assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'Account navigation respects the actual bounded Retry-After');
          console.log(`P9 account navigation respects actual Retry-After=${seconds}s; one visible manual retry`);
          await delay(seconds * 1000);
          const retry = peer.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/account');
          await peer.getByRole('button', { name: 'Volver a intentar', exact: true }).click();
          accountResponse = await retry;
        }
        assert.equal(accountResponse.status(), 200);
        // Responsive navigation is resolved anew after each viewport change.
        await (await navigationLink(peer, 'Inicio')).waitFor();
        for (const width of [320, 375, 1280]) {
          await peer.setViewportSize({ width, height: 900 });
          await peer.screenshot({ path: join(artifacts, `profile-navigation-${width}.png`), fullPage: true });
          const metrics = await (await visibleNavigation(peer)).evaluate(element => ({
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
