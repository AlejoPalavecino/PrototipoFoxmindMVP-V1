import { gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import { homeFixture } from './helpers/audit-home-data.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const component = path => loadTsModule(path);
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));

test('shared navbar exposes real public destinations and only the actual active route', () => {
  const { AppNavbar } = component('apps/shared-ui/AppNavbar.tsx');
  const html = render(AppNavbar, { logoHref: '/sign-in', links: [
    { href: '/sign-in', label: 'Iniciar sesión', current: false },
    { href: '/register', label: 'Crear cuenta', current: true },
  ] });
  assert.match(html, /href="\/register"[^>]*aria-current="page"/);
  assert.match(html, /href="\/sign-in"/);
  assert.doesNotMatch(html, /href="\/inicio"|aria-current="false"/);
  assert.doesNotMatch(html, /aria-expanded="false"/);
});

test('shared authenticated navbar keeps profile actions and actual notification slot', () => {
  const { AppNavbar } = component('apps/shared-ui/AppNavbar.tsx');
  const html = render(AppNavbar, { logoHref: '/inicio', displayName: 'Actual <Learner>',
    links: [{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas', current: true }],
    notifications: React.createElement('button', { 'aria-label': 'Notificaciones: 7 sin leer' }, '7'),
    accountActions: React.createElement('a', { href: '/profile' }, 'Mi perfil'),
  });
  assert.match(html, /Notificaciones: 7 sin leer/);
  assert.match(html, /Actual &lt;Learner&gt;/);
  assert.match(html, /href="\/mis-aulas"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /href="\/inicio"[^>]*aria-current/);
});

test('draft navbar hides account navigation while preserving classroom exit', () => {
  const { AppNavbar } = component('apps/shared-ui/AppNavbar.tsx');
  const props = { logoHref: '/mis-aulas', displayName: 'Draft owner',
    links: [{ href: '/mis-aulas', label: 'Mis aulas', current: true }],
    notifications: React.createElement('button', { 'aria-label': 'Notificaciones' }, 'Notificaciones'),
    accountActions: React.createElement('button', null, 'Cerrar sesión') };
  const regular = render(AppNavbar, props);
  assert.match(regular, /href="\/profile"[^>]*aria-label="Mi perfil de Draft owner"/);
  assert.match(regular, /Notificaciones/);
  const draft = render(AppNavbar, { ...props, restricted: true });
  assert.match(draft, /href="\/mis-aulas"/); assert.match(draft, /Mis aulas/);
  assert.doesNotMatch(draft, /href="\/profile"|href="\/settings"|fm3d-shell-avatar|Cerrar sesión|Notificaciones|Mi perfil|Mi cuenta/);
});

test('password visibility is an explicit non-submit control, with policy only for new passwords', () => {
  const { AccountField } = component('apps/web/src/features/identity/controls/account-field.tsx');
  const login = render(AccountField, { name: 'password', label: 'Contraseña', password: true, autoComplete: 'current-password' });
  assert.match(login, /data-password-field="true"/);
  assert.match(login, /type="button"[^>]*aria-label="Mostrar contraseña"/);
  assert.doesNotMatch(login, /Entre 16 y 128/);
  const registration = render(AccountField, { name: 'password', label: 'Contraseña', password: true, autoComplete: 'new-password' });
  assert.match(registration, /Entre 16 y 128/);
  assert.match(registration, /autocomplete="new-password"/i);
});

test('student home opens the applicable classroom activities and keeps feedback in Mi progreso', async () => {
  const room = { role:'student', archived:false, id: 'actual', name: 'Actual class', subject: 'Science', division: 'B', academicYear: 2026, coverKey: 'explore', teacher: 'Actual teacher' };
  const data = homeFixture([{...room,id:'archived',archived:true}, {...room,id:'teacher',role:'teacher'}, room]);
  data.participation = 'study';
  data.memberships = { study: 1, teach: 0, archived: 1 };
  data.modules.feedback.items = [{ id: 'grade', title: 'Actividad revisada', classroom: room, attemptNumber: 1, finalGrade: '8', target: { kind: 'grade' } }];
  data.modules.feedback.totalItems = 1;
  const { Home } = loadTsModule("apps/web/src/features/home/dashboard/Home.tsx", { stubs: {"./use-home.ts":{useHome: () => ({ loading:false, data, ordering:{}, orders:{review:'asc',queries:'desc'} })}} });
  const opened = [];
  const props = { accountRole: 'student', displayName: 'Student', busy: false, onAction() {}, onCreate() {}, onJoin() {},
    onClassrooms() { opened.push('catalog'); }, onOpenActivities(id) { opened.push(id); } };
  const html = render(Home, props);
  assert.match(html, /<h2>Tu próximo paso<\/h2>/);
  assert.match(html, /Ver actividades del aula/);
  assert.match(html, /<h3>Actual class<\/h3>/);
  assert.match(html, /href="\/mis-aulas\?aula=actual&amp;section=plan"/);
  assert.doesNotMatch(html, /aula=archived|Pendientes docentes|Crear actividad|Tus últimas devoluciones|Actividad revisada/);
  const home = hookView(Home, props);
  try {
    await home.flush();
    const priorities = descendants(home.tree, node => node.type?.name === 'HomePriorities')[0];
    const list = descendants(priorities.type(priorities.props), node => node.type === 'button' &&
      Array.isArray(node.props.children) && node.props.children.includes('Ver actividades del aula'))[0];
    assert.ok(list);
    list.props.onClick();
    assert.deepEqual(opened, ['actual']);
  } finally { home.close(); }

  const { Progress } = component('apps/web/src/features/grading/progress/Progress.tsx');
  const progress = hookView(Progress, gradingFixtureProps('Progress', { classroomId: room.id, expectedScope: 'self',
    api: { call: async path => {
      assert.equal(path, '/actual/progress');
      return { scope: 'self', completion: { percentage: '50', delivered: 1, expected: 2 },
        performance: { average: '8', graded: 1 }, plan: { units: [] }, activities: [
          { id: 'activity', type: 'ASSIGNMENT', title: 'Actividad revisada', grade: '8', publishedAttemptId: 'attempt' },
          { id: 'private', type: 'ASSIGNMENT', title: 'Actividad privada', grade: null },
        ] };
    } }, onOpenResult: (...args) => opened.push(args) }));
  try {
    await progress.flush();
    const markup = renderToStaticMarkup(progress.tree);
    assert.match(markup, /Tus devoluciones/);
    assert.match(markup, /Actividad revisada/);
    assert.doesNotMatch(markup, /Actividad privada/);
    const overview = descendants(progress.tree, node => node.type?.name === 'StudentOverview')[0];
    const button = descendants(overview.type(overview.props), node => node.type === 'button' &&
      Array.isArray(node.props.children) && node.props.children.includes('Ver devolución'))[0];
    assert.ok(button);
    button.props.onClick();
    assert.deepEqual(opened, ['actual', ['activity','attempt']]);
  } finally { progress.close(); }
});
