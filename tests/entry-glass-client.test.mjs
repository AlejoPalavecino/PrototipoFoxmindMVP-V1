import { homeFixture } from './helpers/audit-home-data.mjs';
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
  assert.match(regular, /href="\/profile"/); assert.match(regular, /href="\/settings"/); assert.match(regular, /Cerrar sesión/); assert.match(regular, /Notificaciones/);
  const draft = render(AppNavbar, { ...props, restricted: true });
  assert.match(draft, /href="\/mis-aulas"/); assert.match(draft, /Mis aulas/);
  assert.doesNotMatch(draft, /href="\/profile"|href="\/settings"|fm3d-shell-avatar|Cerrar sesión|Notificaciones/);
});

test('password visibility is an explicit non-submit control, with policy only for new passwords', () => {
  const { AccountField } = component('apps/web/src/components/account-screen.tsx');
  const login = render(AccountField, { name: 'password', label: 'Contraseña', password: true, autoComplete: 'current-password' });
  assert.match(login, /data-password-field="true"/);
  assert.match(login, /type="button"[^>]*aria-label="Mostrar contraseña"/);
  assert.doesNotMatch(login, /Entre 16 y 128/);
  const registration = render(AccountField, { name: 'password', label: 'Contraseña', password: true, autoComplete: 'new-password' });
  assert.match(registration, /Entre 16 y 128/);
  assert.match(registration, /autocomplete="new-password"/i);
});

test('home retains populated study context with both classroom perspectives visible', () => {
  const room = { role:'student', archived:false, id: 'actual', name: 'Actual class', subject: 'Science', division: 'B', academicYear: 2026, coverKey: 'explore', teacher: 'Actual teacher' };
  const data = homeFixture([room]);
  const { Home } = loadTsModule('apps/classrooms-ui/Home.tsx', { stubs: { './use-home.ts': { useHome: () => ({ loading:false, data }) } } });
  const html = render(Home, { displayName: 'Student', busy: false, onAction() {},
    onCreate() {}, onJoin() {}, onClassrooms() {}, onEnter() {}, api: { call: async () => [] }, onOpenTarget() {} });
  for (const label of ['Mi aprendizaje', 'Mi actividad docente']) {
    const group = [...html.matchAll(/<section\b([^>]*)>/g)].find(([, attributes]) => attributes.includes(`aria-label="${label}"`));
    assert.ok(group, `Missing ${label} section`);
    assert.doesNotMatch(group[1], /\bhidden(?:=|\s|$)|aria-hidden="true"/);
  }
  assert.match(html, /Actual class/);
  assert.match(html, /Science|Actual class/);
  assert.match(html, /Estudio/);
});
