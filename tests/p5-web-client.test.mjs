import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';
import { classroomDestination, classroomAuthHref, createWebClassroomClient } from '../apps/web/src/lib/classroom-client.ts';

test('production prefix applies independently to classroom requests, uploads and generated file links', async () => {
  const seen = [];
  let tokens = 0;
  const client = createClassroomClient({
    prefix: '/api/v1',
    csrfToken: async () => `binding-${++tokens}`,
    fetch: async (path, init) => {
      seen.push({ path, init });
      return Response.json(path === '/api/v1/files' ? { id: 'file' } : { ready: false, scan: 'ERROR' });
    },
  });
  await client.call('/drafts');
  await client.call('/drafts', 'POST', {});
  await client.upload('draft', new File(['pdf'], 'plan.pdf'));
  await client.fileStatus('file');
  assert.deepEqual(seen.map(x => x.path), ['/api/v1/classrooms/drafts', '/api/v1/classrooms/drafts', '/api/v1/files', '/api/v1/files/file/content', '/api/v1/files/file']);
  assert.equal(client.fileUrl('file', true), '/api/v1/files/file/content?mode=preview');
  assert.equal(client.fileUrl('file'), '/api/v1/files/file/content?mode=download');
  assert.deepEqual(seen.filter(x => x.init.method !== 'GET').map(x => x.init.headers['X-CSRF-Token']), ['binding-1', 'binding-2', 'binding-3']);
  assert.ok(seen.every(x => x.init.credentials === 'same-origin' && x.init.cache === 'no-store'));
});

test('standalone client retains its root routes and upload rejection contract', async () => {
  const seen = [];
  const client = createClassroomClient({ csrfToken: async () => 'csrf', fetch: async path => { seen.push(path); return Response.json({}); } });
  await client.call('');
  await client.fileStatus('original');
  assert.deepEqual(seen, ['/classrooms', '/files/original']);
  assert.equal(client.fileUrl('original', true), '/files/original/content?mode=preview');
  await assert.rejects(client.upload('draft', new File(['x'], 'not-a-plan.png')), e => e.code === 'FILE_TYPE_NOT_ALLOWED');
});

test('client rejects remote prefixes and does not fetch on invalid configuration', () => {
  for (const prefix of ['https://evil.test', '//evil.test', '/api/v1?x=1', '/api/../files', '/api/v1/']) {
    assert.throws(() => createClassroomClient({ prefix, csrfToken: async () => 'csrf' }));
  }
});

test('client maps transport and rate limit failures safely without hiding cancellation', async () => {
  const client = createClassroomClient({ csrfToken: async () => 'csrf', fetch: async () => Response.json({ error: { code: 'RATE_LIMITED', detail: 'private' } }, { status: 429, headers: { 'Retry-After': '45' } }) });
  await assert.rejects(client.call(''), e => e.code === 'RATE_LIMITED' && e.retryAfter === 45 && !e.message.includes('private'));
  const down = createClassroomClient({ csrfToken: async () => 'csrf', fetch: async () => { throw new Error('private socket'); } });
  await assert.rejects(down.call(''), e => e.code === 'SERVICE_UNAVAILABLE' && !e.message.includes('socket'));
});

test('web mutations acquire real CSRF every time and use accepted private-file routes', async () => {
  const seen = [];
  let issued = 0;
  const api = createWebClassroomClient(async (path, init) => {
    seen.push({ path, init });
    if (path === '/api/v1/auth/csrf') return Response.json({ csrfToken: `real-${++issued}` });
    return Response.json({ ok: true });
  });
  await api.call('/drafts');
  await api.call('/drafts', 'POST', {});
  await api.call('/codes/preview', 'POST', { code: 'code' });
  assert.deepEqual(seen.map(x => x.path), ['/api/v1/classrooms/drafts', '/api/v1/auth/csrf', '/api/v1/classrooms/drafts', '/api/v1/auth/csrf', '/api/v1/classrooms/codes/preview']);
  assert.deepEqual(seen.filter(x => x.init.method === 'POST').map(x => x.init.headers['X-CSRF-Token']), ['real-1', 'real-2']);
  assert.equal(api.fileUrl('id', true), '/api/v1/files/id/content?mode=preview');
});

test('authentication continuation accepts only the classroom destination and one exact invitation', () => {
  const id = 'a1111111-1111-4111-8111-111111111111';
  const destination = `/mis-aulas?invitacion=${id}`;
  assert.equal(classroomDestination(destination), destination);
  assert.equal(classroomDestination('/mis-aulas'), '/mis-aulas');
  assert.equal(classroomAuthHref('sign-in', destination), `/sign-in?next=${encodeURIComponent(destination)}`);
  for (const value of [undefined, ['multiple'], '//evil.test', 'https://evil.test', '/mis-aulas#token=hidden', '/mis-aulas?invitacion=bad', `/mis-aulas?invitacion=${id}&invitacion=${id}`, '/profile', '/mis-aulas?next=https://evil.test']) assert.equal(classroomDestination(value), null);
});

test('expired-session responses and denied CSRF re-enter the appropriate account gate', async () => {
  for (const code of ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED']) {
    const seen = [];
    const api = createWebClassroomClient(async () => Response.json({ error: { code } }, { status: 403 }), value => seen.push(value));
    await assert.rejects(api.call(''), error => error.code === code);
    await assert.rejects(api.call('/drafts', 'POST', {}), error => error.code === code);
    assert.deepEqual(seen, [code, code]);
  }
});

test('caller cancellation is propagated rather than reported as a service outage', async () => {
  const controller = new AbortController();
  const api = createClassroomClient({ csrfToken: async () => 'csrf', fetch: async (_path, init) => {
    controller.abort();
    throw init.signal.reason;
  } });
  await assert.rejects(api.call('', 'GET', undefined, controller.signal), error => error.name === 'AbortError');
});

test('actual production route gates sessions and selects an invitation without automatic enrollment', { skip: !process.env.FOXMIND_WEB_TEST_ORIGIN }, async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const id = 'a1111111-1111-4111-8111-111111111111';
  const target = `/mis-aulas?invitacion=${id}`;
  try {
    const page = await browser.newPage();
    let session = { authenticated: false };
    let accepts = 0;
    let tokens = 0;
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/v1/auth/session') return route.fulfill({ json: session });
      if (path === '/api/v1/auth/csrf') { tokens++; return route.fulfill({ json: { csrfToken: 'actual-csrf' } }); }
      if (path === `/api/v1/classrooms/invitations/${id}/accept`) {
        assert.equal(route.request().headers()['x-csrf-token'], 'actual-csrf');
        accepts++;
        return route.fulfill({ json: { id } });
      }
      if (path === '/api/v1/classrooms/invitations') return route.fulfill({ json: accepts ? [] : [{ id, name: 'Aula invitada', teacher: 'Docente de prueba', expiresAt: '2026-12-31T00:00:00Z' }] });
      if (path === '/api/v1/classrooms/drafts') return route.fulfill({ json: [] });
      if (path === '/api/v1/classrooms') return route.fulfill({ json: { teach: [], study: [] } });
      return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
    });
    await page.goto(`${process.env.FOXMIND_WEB_TEST_ORIGIN}${target}`);
    await page.waitForURL(url => url.pathname === '/sign-in' && url.searchParams.get('next') === target);
    assert.equal(accepts, 0);
    session = { authenticated: true, user: { id: 'real-user', firstName: 'Persona', lastName: 'Actual', email: 'persona@example.test', emailVerified: false } };
    await page.goto(`${process.env.FOXMIND_WEB_TEST_ORIGIN}${target}`);
    await page.waitForURL(url => url.pathname === '/verify-email' && url.searchParams.get('next') === target);
    session.user.emailVerified = true;
    await page.goto(`${process.env.FOXMIND_WEB_TEST_ORIGIN}${target}`);
    const selected = page.getByRole('article', { name: 'Invitación seleccionada del correo' });
    await selected.getByRole('heading', { name: 'Aula invitada' }).waitFor();
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).waitFor();
    assert.equal(accepts, 0);
    assert.equal(tokens, 0);
    assert.equal(await page.getByText('Cambiar cuenta de prueba:').count(), 0);
    await selected.getByRole('button', { name: 'Aceptar invitación', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Ya formás parte' }).waitFor();
    assert.equal(accepts, 1);
    assert.equal(tokens, 1);
    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    }
  } finally { await browser.close(); }
});

test('mobile classroom history reserves readable text width and places actions below it', { skip: !process.env.FOXMIND_WEB_TEST_ORIGIN }, async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ headless: true, channel: 'chromium' });
  const id = 'a1111111-1111-4111-8111-111111111111';
  const room = { id, name: 'Aula de lectura', subject: 'Materia', division: 'Grupo A', academicYear: 2026, timezone: 'America/Argentina/Buenos_Aires', coverKey: 'explore', archived: false, teacher: 'Docente de prueba', role: 'teacher', revision: '0' };
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 1000 } });
    await page.route('**/api/v1/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/v1/auth/session') return route.fulfill({ json: { authenticated: true, user: { id: 'teacher', firstName: 'Docente', lastName: 'Actual', email: 'teacher@example.test', emailVerified: true } } });
      if (path === '/api/v1/classrooms') return route.fulfill({ json: { teach: [room], study: [] } });
      if (path === `/api/v1/classrooms/${id}`) return route.fulfill({ json: { ...room, units: [], plans: [] } });
      if (path === `/api/v1/classrooms/${id}/history`) return route.fulfill({ json: [{ studentId: 'student', enrollmentId: 'enrollment', firstName: 'Files', lastName: 'Fixture', periods: [{ joinedAt: '2026-10-17T12:00:00Z', endedAt: '2026-10-18T12:00:00Z', endReason: 'REMOVED' }] }] });
      if ([`/api/v1/classrooms/${id}/members`, `/api/v1/classrooms/${id}/invitations`, '/api/v1/classrooms/drafts', '/api/v1/classrooms/invitations'].includes(path)) return route.fulfill({ json: [] });
      return route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
    });
    await page.goto(`${process.env.FOXMIND_WEB_TEST_ORIGIN}/mis-aulas`);
    await page.getByRole('button', { name: 'Entrar al aula', exact: true }).click();
    await page.getByRole('button', { name: 'Historial', exact: true }).click();
    await page.getByRole('heading', { name: 'Historial de estudiantes', exact: true }).waitFor();
    const row = page.locator('.p5-roster li').filter({ hasText: 'Files Fixture' });
    for (const width of [320, 375, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      await row.getByRole('button', { name: 'Ver resumen', exact: true }).waitFor();
      const metrics = await row.evaluate(element => {
        const text = element.querySelector(':scope > div:not(.p5-actions)');
        const name = text.querySelector('strong');
        const actions = element.querySelector(':scope > .p5-actions');
        const textBox = text.getBoundingClientRect();
        const nameBox = name.getBoundingClientRect();
        const actionBox = actions.getBoundingClientRect();
        return { textWidth: textBox.width, textBottom: textBox.bottom, nameHeight: nameBox.height, lineHeight: parseFloat(getComputedStyle(name).lineHeight), actionTop: actionBox.top, actionLeft: actionBox.left, textRight: textBox.right, overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(metrics.overflow, false, `page overflow at ${width}px`);
      assert.ok(metrics.textWidth >= 160, `history text is only ${metrics.textWidth}px at ${width}px`);
      assert.ok(metrics.nameHeight <= metrics.lineHeight * 2, `student name wraps excessively at ${width}px`);
      if (width <= 375) assert.ok(metrics.actionTop >= metrics.textBottom - 1, `history actions squeeze the text line at ${width}px`);
      else assert.ok(metrics.actionLeft >= metrics.textRight - 1, 'desktop history actions should remain beside the text');
    }
  } finally { await browser.close(); }
});
