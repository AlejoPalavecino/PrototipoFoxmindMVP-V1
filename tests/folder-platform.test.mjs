import { homeFixture } from './helpers/audit-home-data.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const read = path => readFileSync(path, 'utf8');
// Transpile the actual composition, stubbing only Next's routing context for SSR.
const component = path => loadTsModule(path, { stubs: { 'next/router': { useRouter: () => ({ isReady: true, query: {}, push: async () => true }) } } });
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const buttons = html => [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)]
  .map(([, attributes, body]) => ({ attributes, text: body.replace(/<[^>]+>/g, '') }));

test('Next loads folder presentation with no competing glass stylesheet', () => {
  const app = read('apps/web/pages/_app.tsx');
  const imports = [...app.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map(match => match[1]);
  assert.ok(imports.some(path => /folders[^/]*\.css$/.test(path)), 'Folder stylesheet must be part of the real app cascade');
  assert.ok(imports.every(path => !/glass/i.test(path)), 'Glass must not override the selected folder presentation');
  for (const path of imports) assert.ok(existsSync(resolve('apps/web/pages', path)), `Unresolved stylesheet ${path}`);
});

test('folder navbar carries the raster identity and preserves destinations/current route', () => {
  const { AppNavbar } = component('apps/shared-ui/AppNavbar.tsx');
  const html = render(AppNavbar, { logoHref: '/inicio', displayName: 'Actual <Learner>',
    links: [{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas', current: true }],
    notifications: React.createElement('button', { 'aria-label': 'Notificaciones: 7 sin leer' }, '7'),
  });
  assert.match(html, /<img\b[^>]*src="\/foxmind-3d\/brand\/logo-horizontal\.svg"/);
  assert.match(html, /href="\/mis-aulas"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /href="\/inicio"[^>]*aria-current/);
  assert.match(html, /Notificaciones: 7 sin leer/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Actual &lt;Learner&gt;/);
});

test('account SSR shows folder welcome illustration and real loading/entry navigation', () => {
  const { AccountScreen } = component('apps/web/src/components/account-screen.tsx');
  const html = render(AccountScreen, { view: 'sign-in' });
  assert.match(html, /<img\b[^>]*src="\/foxmind-3d\/auth-reference\/login-960\.webp"/);
  assert.match(html, /href="#main"/);
  assert.match(html, /id="main"/);
  assert.match(html, /Cargando tu cuenta/);
  assert.match(html, /aria-label="FoxMind" href="\/sign-in"/);
  assert.match(html, /href="\/register"/);
});

test('password controls remain labelled non-submit buttons with explicit field association', () => {
  const { AccountField } = component('apps/web/src/components/account-screen.tsx');
  const html = render(AccountField, { name: 'password', label: 'Contraseña', password: true, autoComplete: 'current-password' });
  assert.match(html, /<label\b[^>]*for="password"/);
  assert.match(html, /<input\b[^>]*type="password"/);
  assert.match(html, /autocomplete="current-password"/i);
  const toggle = buttons(html).find(button => /aria-label="Mostrar contraseña"/.test(button.attributes));
  assert.ok(toggle);
  assert.match(toggle.attributes, /type="button"/);
  assert.match(toggle.attributes, /aria-controls="password"/);
  assert.match(toggle.attributes, /aria-pressed="false"/);
  assert.doesNotMatch(html, /Entre 16 y 128/);
});

test('login client preserves raw credentials and fresh CSRF binding through session rotation', async () => {
  const { createAccountClient } = component('apps/web/src/lib/account-client.ts');
  const seen = [];
  const client = createAccountClient(async (url, init) => {
    seen.push({ url, init });
    if (url.endsWith('/auth/session')) return Response.json({ authenticated: true });
    if (url.endsWith('/auth/csrf')) return Response.json({ csrfToken: 'in-memory-binding' });
    return Response.json({ ok: true });
  });
  const fields = { email: '"Alumno ejemplo"@mañana.test', password: ' contraseña sin recortar ' };
  await client.mutate('/auth/login', fields);
  assert.deepEqual(seen.map(item => item.url), ['/api/v1/auth/session', '/api/v1/auth/csrf', '/api/v1/auth/login', '/api/v1/auth/session', '/api/v1/auth/csrf']);
  assert.equal(seen[2].init.method, 'POST');
  assert.equal(seen[2].init.credentials, 'same-origin');
  assert.equal(seen[2].init.headers['X-CSRF-Token'], 'in-memory-binding');
  assert.deepEqual(JSON.parse(seen[2].init.body), fields);
});

for (const accountRole of ['teacher', 'student']) test(`Home presents the ${accountRole} classroom and its permitted entry actions`, () => {
  const room = { subject: 'Science', division: 'B', academicYear: 2026, coverKey: 'explore', teacher: 'Actual teacher' };
  const data = homeFixture([{ ...room, role:accountRole, archived:false, id:'room', name:'Current classroom' }]);
  data.participation = accountRole === 'teacher' ? 'teach' : 'study';
  data.memberships = { study: Number(accountRole === 'student'), teach: Number(accountRole === 'teacher'), archived: 0 };
  for (const module of accountRole === 'teacher' ? ['pending', 'feedback'] : ['review', 'queries']) data.modules[module] = { status: 'not-applicable' };
  const { Home } = loadTsModule('apps/classrooms-ui/Home.tsx', { stubs: { './use-home.ts': { useHome: () => ({ loading:false, data }) } } });
  const html = render(Home, { accountRole, displayName: 'Learner', busy: false, onAction() {},
    onCreate() {}, onJoin() {}, onClassrooms() {}, onEnter() {}, api: { call: async () => [] }, onOpenTarget() {},
  });
  for (const name of [accountRole === 'teacher' ? 'Mi actividad docente' : 'Mi aprendizaje']) {
    const group = [...html.matchAll(/<section\b([^>]*)>/g)].find(([, attributes]) => attributes.includes(`aria-label="${name}"`));
    assert.ok(group, `Missing ${name} group`);
    assert.doesNotMatch(group[1], /\bhidden(?:=""|="hidden"|\s|$)|aria-hidden="true"/, `${name} must remain visible`);
  }
  assert.match(html, /Current classroom/);
  assert.doesNotMatch(html, accountRole === 'teacher' ? /aria-label="Mi aprendizaje"/ : /aria-label="Mi actividad docente"/);
  const ownAction = accountRole === 'teacher' ? 'Crear aula' : 'Unirme con código';
  const forbiddenAction = accountRole === 'teacher' ? 'Unirme con código' : 'Crear aula';
  for (const label of [ownAction, 'Actualizar']) assert.ok(buttons(html).some(button => button.text.includes(label)), label);
  assert.ok(buttons(html).every(button => !button.text.includes(forbiddenAction)), forbiddenAction);
  assert.equal(buttons(html).filter(button => button.text.includes('Entrar al aula')).length, 1);
  assert.doesNotMatch(html, /Lo próximo/);
});

test('ClassroomView SSR retains exit/loading state without inventing server classroom data', () => {
  const { ClassroomView } = component('apps/classrooms-ui/ClassroomView.tsx');
  let calls = 0;
  const html = render(ClassroomView, { id: 'not-loaded', initialCode: null, onExit() {}, api: { call: async () => { calls++; throw new Error('SSR must not fetch'); } } });
  assert.equal(calls, 0);
  assert.match(html, /Cargando aula/);
  assert.ok(buttons(html).some(button => /Volver a mis aulas/.test(button.text)));
  assert.doesNotMatch(html, /Invitar estudiante|Configuración|Historial/);
});

test('ClassroomView retains the complete navigation definition and teacher-only tab guards', () => {
  const source = read('apps/classrooms-ui/ClassroomView.tsx');
  const nav = source.slice(source.indexOf('aria-label="Secciones del aula"'), source.indexOf('</nav>', source.indexOf('aria-label="Secciones del aula"')));
  for (const key of ['members', 'history', 'plan', 'library', 'activities', 'progress', 'wall', 'settings']) assert.match(nav, new RegExp(`key:\\s*['"]${key}['"]`));
  for (const key of ['history', 'settings']) assert.match(nav, new RegExp(`teacher\\s*\\?\\s*\\[\\{\\s*key:\\s*['"]${key}['"]`));
  assert.match(nav, /teacher\s*\?\s*'Alumnos'\s*:\s*'Compañeros'/);
  assert.match(nav, /teacher\s*\?\s*'Progreso'\s*:\s*'Mi progreso'/);
  assert.match(nav, /aria-current=\{tab === item.key \? 'page' : undefined\}/);
});
