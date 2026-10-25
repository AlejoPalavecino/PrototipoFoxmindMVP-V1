import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule as component } from './helpers/load-ts-module.mjs';
import { renderToStaticMarkup } from 'react-dom/server';
import { classroomDestination, classroomAuthHref } from '../apps/web/src/lib/classroom-client.ts';
import { hookView } from './agenda-ui-helpers.test.mjs';

test('Inicio continuation is additive, literal and does not widen the closed destination allowlist', () => {
  assert.equal(classroomDestination('/inicio'), '/inicio');
  for (const view of ['sign-in', 'register', 'verify-email']) assert.equal(classroomAuthHref(view, '/inicio'), `/${view}?next=%2Finicio`);
  const invitation = '/mis-aulas?invitacion=a1111111-1111-4111-8111-111111111111';
  assert.equal(classroomDestination('/mis-aulas'), '/mis-aulas');
  assert.equal(classroomDestination(invitation), invitation);
  assert.equal(classroomAuthHref('sign-in', invitation), `/sign-in?next=${encodeURIComponent(invitation)}`);
  for (const unsafe of [undefined, ['/inicio'], '/inicio/', '/inicio?x=1', '/inicio#token=x', '/%69nicio', '//inicio', 'https://example.test/inicio', '/profile', '/mis-aulas?invitacion=bad', `${invitation}&next=/inicio`]) {
    assert.equal(classroomDestination(unsafe), null, String(unsafe));
    assert.equal(classroomAuthHref('sign-in', unsafe), '/sign-in');
  }
});

test('Home renders authorized aggregate identity and archived history without invented content or a global role switch', async () => {
  const { Home } = component('apps/classrooms-ui/Home.tsx');
  const id = '11111111-1111-4111-8111-111111111111';
  const room = { id, name: 'Real classroom <script>', subject: 'Science', division: 'A', timeZone: 'UTC', coverKey: 'explore', archived: true, role: 'teacher' };
  const empty = () => ({ status: 'ready', items: [], totalItems: null, nextCursor: null });
  const aggregate = { version: 1, subjectId: id, generatedAt: '2026-10-25T12:00:00.000Z', timeZone: 'UTC', participation: 'none',
    memberships: { teach: 0, study: 0, archived: 1 }, setup: { drafts: 0, invitations: 0 }, modules: {
      pending: { status: 'not-applicable' }, review: { status: 'not-applicable' }, feedback: { status: 'not-applicable' },
      queries: { status: 'not-applicable' }, agenda: empty(), materials: empty(), classrooms: { ...empty(), totalItems: 1,
        items: [{ id, title: room.name, classroom: room, target: { kind: 'classroom', classroomId: id, section: 'plan' } }] },
    } };
  const previousWindow = globalThis.window; globalThis.window = new EventTarget();
  const view = hookView(Home, { displayName: 'Actual Learner', subjectId: id, homeClient: { read: async () => aggregate },
    onCreate() {}, onJoin() {}, onClassrooms() {}, onAction() {} });
  try {
    await view.flush(); const html = renderToStaticMarkup(view.tree);
    assert.match(html, /Hola, Actual Learner/);
    assert.match(html, /Real classroom &lt;script&gt;/); assert.match(html, /Archivada · Solo lectura/);
    assert.match(html, /Tus aulas/); assert.match(html, /Material reciente/);
    assert.doesNotMatch(html, /Cambiar rol|role="switch"|lucia@example|Nota promedio/);
    assert.doesNotMatch(html, /Para entregar|Para revisar/, 'Archived history alone must not invent active participation');
  } finally { view.close(); if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow; }
});
