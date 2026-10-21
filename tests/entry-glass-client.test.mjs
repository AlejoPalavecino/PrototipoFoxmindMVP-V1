import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function component(path) {
  const filename = resolve(path), nativeRequire = createRequire(filename);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  const module = { exports: {} };
  const require = id => {
    if (id.startsWith('.')) {
      const base = resolve(dirname(filename), id);
      const file = [base, `${base}.tsx`, `${base}.ts`].find(name => existsSync(name));
      if (file && /\.tsx?$/.test(file)) return component(file);
    }
    return nativeRequire(id);
  };
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}
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
  assert.match(html, /aria-expanded="false"/);
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

test('home prioritizes populated study context and keeps both classroom perspectives', () => {
  const { Home } = component('apps/classrooms-ui/Home.tsx');
  const room = { id: 'actual', name: 'Actual class', subject: 'Science', division: 'B', academicYear: 2026, coverKey: 'explore', teacher: 'Actual teacher' };
  const html = render(Home, { displayName: 'Student', data: { teach: [], study: [room], drafts: [], invitations: [] }, busy: false,
    onCreate() {}, onJoin() {}, onClassrooms() {}, onEnter() {}, api: { call: async () => [] }, onOpenTarget() {} });
  assert.match(html, /aria-pressed="true"[^>]*>Estudio/);
  assert.match(html, /aria-pressed="false"[^>]*>Enseño/);
  assert.match(html, /Actual class/);
  assert.match(html, /Docente:.*Actual teacher/);
  assert.match(html, /Novedades/);
});
