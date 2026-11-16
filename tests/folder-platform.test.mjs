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
  assert.match(html, /<img\b[^>]*src="\/foxmind\/logo\.webp"/);
  assert.match(html, /href="\/inicio"[^>]*aria-label="FoxMind"/);
  assert.match(html, /href="\/mis-aulas"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /href="\/inicio"[^>]*aria-current/);
  assert.match(html, /Notificaciones: 7 sin leer/);
  assert.match(html, /aria-label="Abrir menú de navegación"[^>]*aria-expanded="false"/);
  assert.match(html, /href="\/profile"[^>]*aria-label="Mi perfil de Actual &lt;Learner&gt;"/);
  assert.match(html, /Actual &lt;Learner&gt;/);
});

test('account SSR preserves loading, Brújula visual and entry navigation after session readiness', () => {
  const { AccountScreen } = component('apps/web/src/screens/identity-screen.tsx');
  const html = render(AccountScreen, { view: 'sign-in' });
  assert.match(html, /<aside[^>]*class="br-auth-visual"[^>]*aria-label="Foxy te da la bienvenida al aula"/);
  assert.match(html, /class="br-auth-land" aria-hidden="true"/);
  assert.match(html, /href="#main"/);
  assert.match(html, /id="main"/);
  assert.match(html, /Cargando tu cuenta/);
  assert.match(html, /class="br-auth-brand" href="\/sign-in"/);
  const { AccountFlowForms } = component('apps/web/src/features/identity/ui/account-flow-forms.tsx');
  const ready = render(AccountFlowForms, { view: 'sign-in', session: { authenticated: false }, verified: false, classroomNext: null,
    nextAccountHref: target => `/${target}`, locked: false, busy: false, hasToken: false, submit: () => () => {}, signOut: null, load: async () => {}, action: async () => {} });
  assert.match(ready, /href="\/register"/); assert.match(ready, /href="\/forgot-password"/);
  assert.match(ready, /Iniciar sesión/);
});

test('password controls remain labelled non-submit buttons with explicit field association', () => {
  const { AccountField } = component('apps/web/src/features/identity/ui/account-field.tsx');
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
  const { createAccountClient } = component("apps/web/src/features/identity/api.ts");
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
  const { Home } = loadTsModule("apps/web/src/features/home/ui/Home.tsx", { stubs: {"../model/use-home.ts":{useHome: () => ({ loading:false, data, ordering:{}, orders:{review:'desc',queries:'desc'} })}} });
  const html = render(Home, { accountRole, displayName: 'Learner', busy: false, onAction() {},
    onCreate() {}, onJoin() {}, onClassrooms() {}, onEnter() {}, api: { call: async () => [] }, onOpenTarget() {},
  });
  assert.match(html, /<h3>Current classroom<\/h3>/);
  assert.equal([...html.matchAll(/<a\b[^>]*href="\/mis-aulas\?aula=room&amp;section=plan"/g)].length, 1);
  assert.ok(buttons(html).some(action => action.text.includes('Ver mis aulas')));
  if (accountRole === 'student') {
    assert.match(html, /<h2>Tu próximo paso<\/h2>/);
    assert.match(html, /href="\/carpetas-de-estudio"/);
    assert.doesNotMatch(html, /Pendientes docentes|Crear actividad|Crear aula|Preparar con Foxy/);
  } else {
    assert.match(html, /<h2>Por acompañar<\/h2>/);
    assert.match(html, /aria-label="Pendientes docentes"/);
    assert.ok(buttons(html).some(action => action.text === 'Crear actividad'));
    assert.match(html, /href="\/foxy-ai"/);
    assert.doesNotMatch(html, /Unirme con código|carpetas-de-estudio/);
  }
  assert.ok(buttons(html).every(action => !action.text.includes('Actualizar')));
  assert.doesNotMatch(html, /Lo próximo/);
});

test('ClassroomView SSR retains exit/loading state without inventing server classroom data', () => {
  const { ClassroomView } = component("apps/web/src/application/academic-ClassroomView.tsx");
  let calls = 0;
  const html = render(ClassroomView, { id: 'not-loaded', initialCode: null, onExit() {}, api: { call: async () => { calls++; throw new Error('SSR must not fetch'); } } });
  assert.equal(calls, 0);
  assert.match(html, /role="status"/);
  assert.match(html, /Estamos abriendo tu aula/);
  assert.ok(buttons(html).some(button => /Mis aulas/.test(button.text)));
  assert.doesNotMatch(html, /Invitar estudiante|Configuración|Historial/);
});

test('ClassroomView retains the complete navigation definition and teacher-only tab guards', () => {
  const {classroomSections}=loadTsModule("apps/web/src/features/classrooms/ui/ClassroomNavigation.tsx");
  assert.deepEqual(classroomSections(true).map(item=>item.key),['plan','wall','library','activities','progress','members','history','settings']);
  const student=classroomSections(false);
  assert.equal(student.length,6);
  assert.ok(!student.some(item=>item.key==='history'||item.key==='settings'));
  assert.equal(student.find(item=>item.key==='members').label,'Compañeros');
  assert.equal(student.find(item=>item.key==='progress').label,'Mi progreso');
  assert.match(read("apps/web/src/application/academic-ClassroomView.tsx"),/tab === 'settings' && teacher/);
});
