import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { classroomDestination, classroomAuthHref } from '../apps/web/src/lib/classroom-client.ts';

function component(path) {
  const filename = resolve(path);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2023 },
  }).outputText;
  const module = { exports: {} }, nativeRequire = createRequire(filename);
  const require = id => id.endsWith('.tsx') ? component(resolve(dirname(filename), id)) : nativeRequire(id);
  new Function('require', 'module', 'exports', code)(require, module, module.exports);
  return module.exports;
}

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

test('Home renders actual identity and separate scoped summaries without invented content or a global role switch', () => {
  const { Home } = component('apps/classrooms-ui/Home.tsx');
  const room = { id: 'room', name: 'Real classroom <script>', subject: 'Science', division: 'A', academicYear: 2026, timezone: 'UTC', coverKey: 'explore', archived: true, teacher: 'Actual Teacher', role: 'teacher', revision: '0' };
  const html = renderToStaticMarkup(React.createElement(Home, { displayName: 'Actual Learner', data: { teach: [room], study: [], drafts: [], invitations: [] }, busy: false,
    onCreate() {}, onJoin() {}, onClassrooms() {}, onEnter() {}, api: { call: async () => [] }, onOpenTarget() {} }));
  assert.match(html, /Hola, Actual Learner/);
  assert.match(html, /Enseño/); assert.match(html, /Estudio/);
  assert.match(html, /Real classroom &lt;script&gt;/);
  assert.match(html, /Archivada · Solo lectura/);
  assert.match(html, /Novedades/);
  assert.doesNotMatch(html, /Cambiar rol|role="switch"|lucia@example|Nota promedio/);
});
