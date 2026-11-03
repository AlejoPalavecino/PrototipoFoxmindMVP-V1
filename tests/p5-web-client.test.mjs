import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';
import { classroomDestination, classroomAuthHref, classroomHomeDestination, classroomHomeHref, createWebClassroomClient } from '../apps/web/src/lib/classroom-client.ts';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

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

test('closing the caller during CSRF acquisition prevents stale mutation and auth redirect', async () => {
  for (const status of [200, 401]) {
    const paths = [], redirects = [];
    let finish;
    const api = createWebClassroomClient(async path => {
      paths.push(path);
      if (path.endsWith('/auth/csrf')) return new Promise(resolve => { finish = resolve; });
      return Response.json({ ok: true });
    }, code => redirects.push(code));
    const lifetime = new AbortController();
    const pending = api.call('/drafts', 'POST', {}, lifetime.signal);
    lifetime.abort();
    finish(Response.json(status === 200 ? { csrfToken: 'old' } : { error: { code: 'AUTH_REQUIRED' } }, { status }));
    await assert.rejects(pending, { name: 'AbortError' });
    assert.deepEqual(paths, ['/api/v1/auth/csrf']);
    assert.deepEqual(redirects, []);
  }
});

test('a late session response cannot restore a private classroom screen after account invalidation', async () => {
  let finish, sessionSignal, requireAccount;
  const redirects = [], ClassroomApp = () => null;
  const router = { isReady: true, asPath: '/mis-aulas', query: {}, replace: value => redirects.push(value) };
  const { ClassroomsScreen } = loadTsModule('apps/web/src/components/classrooms-screen.tsx', { stubs: {
    'next/router': { useRouter: () => router }, 'next/head': () => null, 'next/link': () => null,
    '../../../classrooms-ui/Classrooms': { ClassroomsApp: ClassroomApp },
    '../../../classrooms-ui/useAgendaTarget': { useAgendaTarget: () => ({ requested: false }) },
    '../lib/account-client': { createAccountClient: () => ({ session: signal => {
      sessionSignal = signal;
      return new Promise(resolve => { finish = resolve; });
    } }) },
    '../lib/classroom-client': { classroomDestination, classroomAuthHref, classroomHomeDestination, classroomHomeHref, createWebClassroomClient: (_fetch, onFailure) => {
      requireAccount = onFailure;
      return {};
    } },
  } });
  const view = hookView(ClassroomsScreen, {});
  try {
    await view.flush();
    requireAccount('AUTH_REQUIRED');
    finish({ authenticated: true, user: { id: 'former-user', accountRole: 'teacher', emailVerified: true } });
    await view.flush();
    assert.deepEqual(redirects, ['/sign-in?next=%2Fmis-aulas']);
    assert.deepEqual(descendants(view.tree, element => element.type === ClassroomApp), []);
    assert.equal(sessionSignal?.aborted, true);
  } finally { view.close(); }
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

test('classroom history destinations round-trip Home resources and notification ids through the account gate', () => {
  const room = 'a1111111-1111-4111-8111-111111111111', resource = 'b1111111-1111-4111-8111-111111111111';
  const targets = [
    { kind: 'classroom', classroomId: room, section: 'plan' },
    { kind: 'material', classroomId: room, materialId: resource },
    { kind: 'wall', classroomId: room, postId: resource },
    { kind: 'grade', classroomId: room, activityId: resource, attemptId: resource, gradeId: resource },
    { kind: 'submissions', classroomId: room, activityId: resource, filter: 'unpublished' },
    { kind: 'publish-notice', classroomId: room },
  ];
  for (const target of targets) {
    const href = classroomHomeHref(target);
    assert.deepEqual(classroomHomeDestination(href), target);
    assert.equal(classroomDestination(href), href);
    assert.equal(new URL(classroomAuthHref('sign-in', href), 'https://fixture.test').searchParams.get('next'), href);
    assert.equal(classroomDestination(href + '&destino=wall'), null);
    assert.equal(classroomDestination(href.replace(room, 'forged')), null);
  }
  const notification = '/mis-aulas?notificacion=' + resource;
  assert.equal(classroomDestination(notification), notification);
  assert.equal(classroomDestination(notification + '&next=https://evil.test'), null);
});
