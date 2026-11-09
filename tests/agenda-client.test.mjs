import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import React from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';

test('the same academic link is reauthorized after identity changes and ignores the earlier response', async () => {
  const { useAgendaTarget } = loadTsModule('apps/classrooms-ui/useAgendaTarget.ts');
  const classroomId = randomUUID(), activityId = randomUUID(), calls = [];
  const destination = `/mis-aulas?aula=${classroomId}&actividad=${activityId}`;
  const api = { open: (target, signal) => new Promise(resolve => calls.push({ target, signal, resolve })) };
  const Host = () => {
    const [subjectId, setSubject] = React.useState('teacher');
    return React.createElement('output', { state: useAgendaTarget(api, destination, subjectId), setSubject });
  };
  const view = hookView(Host, {});
  try {
    await view.flush();
    view.tree.props.setSubject('another-account');
    await view.flush();
    assert.equal(calls.length, 2);
    assert.equal(calls[0].signal.aborted, true);
    calls[0].resolve({ ...calls[0].target, label: 'old private target' });
    await view.flush();
    assert.equal(view.tree.props.state.target, undefined);
    calls[1].resolve(calls[1].target);
    await view.flush();
    assert.deepEqual(view.tree.props.state.target, { classroomId, activityId });
  } finally { view.close(); }
});

const range = { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'America/Argentina/Buenos_Aires' };
const payload = { title: 'Clase', description: '', category: 'CLASS',
  schedule: { kind: 'ALL_DAY', startDate: '2026-11-02', endDateExclusive: '2026-11-03' }, repeat: { kind: 'NONE' } };
test('web agenda client sends exact methods, bodies, fresh CSRF and private fetch policy', async () => {
  const { createWebAgendaClient } = loadTsModule('apps/web/src/lib/agenda-client.ts');
  const calls = [], id = randomUUID(), target = { classroomId: randomUUID(), activityId: randomUUID() };
  const api = createWebAgendaClient(async (path, init) => {
    calls.push({ path, ...init });
    if (String(path).includes('/auth/csrf')) return Response.json({ csrfToken: 'fresh-token' });
    return init?.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ ok: true });
  });
  await api.list(range); await api.upcoming(5); await api.get(id);
  await api.put(id, payload); await api.replace(id, '7', payload); await api.remove(id, '8'); await api.open(target);
  const business = calls.filter(x => !String(x.path).includes('/auth/csrf'));
  assert.equal(business.length, 7);
  const query = new URL(business[0].path, 'http://test.local');
  assert.equal(query.pathname, '/api/v1/agenda');
  for (const [key, value] of Object.entries(range)) assert.equal(query.searchParams.get(key), value);
  assert.equal(new URL(business[1].path, 'http://test.local').searchParams.get('limit'), '5');
  assert.equal(business[2].path, `/api/v1/agenda/events/${id}`);
  for (const [index, method, body] of [[3, 'PUT', payload], [4, 'PATCH', { revision: '7', event: payload }],
    [5, 'DELETE', { revision: '8' }], [6, 'POST', target]]) {
    const call = business[index]; assert.equal(call.method, method);
    assert.deepEqual(JSON.parse(call.body), body); assert.equal(new Headers(call.headers).get('x-csrf-token'), 'fresh-token');
  }
  assert.ok(business.every(x => x.cache === 'no-store'));
});

test('client preserves server error codes, signals identity requirements and never retries uncertain writes', async () => {
  const { createWebAgendaClient } = loadTsModule('apps/web/src/lib/agenda-client.ts');
  const notices = [], calls = [];
  const api = createWebAgendaClient(async (path, init) => {
    calls.push([path, init?.method]);
    if (String(path).includes('/auth/csrf')) return Response.json({ csrfToken: 'fresh-token' });
    return Response.json({ error: { code: 'CONFLICT' } }, { status: 409 });
  }, code => notices.push(code));
  await assert.rejects(api.replace(randomUUID(), '0', payload), { code: 'CONFLICT' });
  assert.equal(calls.filter(([, method]) => method === 'PATCH').length, 1);
  const unauthenticated = createWebAgendaClient(async () => Response.json({ error: { code: 'AUTH_REQUIRED' } }, { status: 401 }), code => notices.push(code));
  await assert.rejects(unauthenticated.list(range), { code: 'AUTH_REQUIRED' });
  assert.deepEqual(notices, ['AUTH_REQUIRED']);
});

test('account return navigation accepts agenda and exact safe academic destinations', () => {
  const { classroomDestination, classroomAuthHref } = loadTsModule('apps/web/src/lib/classroom-client.ts');
  const room = randomUUID(), activity = randomUUID();
  for (const destination of ['/agenda', '/carpetas-de-estudio', `/carpetas-de-estudio/${room}`, `/mis-aulas?aula=${room}`, `/mis-aulas?aula=${room}&actividad=${activity}`]) {
    assert.equal(classroomDestination(destination), destination);
    assert.equal(new URL(classroomAuthHref('sign-in', destination), 'http://test.local').searchParams.get('next'), destination);
  }
  for (const destination of [`/mis-aulas?actividad=${activity}`, `/mis-aulas?aula=${room}&actividad=${activity}&owner=x`,
    `/mis-aulas?aula=${room}#fragment`, '/agenda?owner=x', '//evil.test/agenda', '/agenda/../sign-in',
    `/mis-aulas?aula=forged&actividad=${activity}`, `/carpetas-de-estudio/${room}?owner=x`, '/carpetas-de-estudio/forged', '/carpetas-de-estudio/../agenda', `//evil.test/carpetas-de-estudio/${room}`, ['/agenda']]) assert.equal(classroomDestination(destination), null);
});
