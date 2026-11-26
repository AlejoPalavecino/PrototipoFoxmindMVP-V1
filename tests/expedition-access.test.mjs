import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { appStylesheets } from './helpers/global-style-fixture.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
const screen = () => loadTsModule('apps/web/src/screens/identity-screen.tsx', {
  stubs: { 'next/router': { useRouter: () => ({ isReady: true, query: {}, push: async () => true }) } },
});
const textOf = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children);
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

test('tokens: Expedición forma parte de la cascada real, conserva Nunito y su botón es legible', () => {
  const sheet = appStylesheets().find(path => path.endsWith('expedition-tokens.css'));
  assert.ok(sheet, 'la hoja de tokens debe importarse desde la entrada real de la app');
  const css = readFileSync(sheet, 'utf8');
  for (const token of ['--xp-lake', '--xp-pine', '--xp-sky', '--xp-mist', '--xp-sun', '--xp-trail', '--xp-orange', '--xp-orange-button'])
    assert.match(css, new RegExp(`${token}:\\s*#[0-9a-f]{6}`, 'i'), token);
  assert.doesNotMatch(css, /@font-face|@import/, 'Expedición no agrega tipografías');
  assert.match(css, /--xp-font:\s*Nunito/);
  const button = css.match(/--xp-orange-button:\s*(#[0-9a-f]{6})/i)[1];
  assert.ok(contrast(button, '#ffffff') >= 4.5, `blanco sobre ${button} debe dar al menos 4,5:1`);
  assert.ok(appStylesheets().some(path => path.endsWith('expedition-auth.css')), 'los estilos de acceso forman parte de la cascada');
});

test('acceso: cada regla se ancla en la raíz de la app para no perder contra las reglas globales del tema', () => {
  // `.fm3d-theme :is(.button-primary, .p5-app button.primary)` reaches (0,3,1); in the real app it painted
  // dark text on the orange button until these selectors were anchored on #foxmind-product.
  const css = readFileSync(appStylesheets().find(path => path.endsWith('expedition-auth.css')), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));
  assert.ok(selectors.length > 50);
  for (const selector of selectors) {
    let depth = 0, part = '';
    for (const char of `${selector},`) {
      if (char === '(') depth++; if (char === ')') depth--;
      if (char === ',' && depth === 0) { assert.match(part.trim(), /^#foxmind-product /, part.trim()); part = ''; } else part += char;
    }
  }
});

for (const [view, scene, other] of [['sign-in', 'sunset', 'register'], ['register', 'river', 'sign-in']]) {
  test(`acceso ${view}: escena pintada, guía decorativo y cambio a ${other}`, () => {
    const { AccountScreen } = screen();
    const html = render(AccountScreen, { view });
    assert.match(html, new RegExp(`class="xp-auth[^"]*" data-scene="${scene}"`));
    assert.match(html, /<a class="xp-auth-brand" href="\/sign-in"/);
    assert.match(html, new RegExp(`class="xp-auth-switch"[\\s\\S]*?href="/${other}"`));
    assert.match(html, /class="xp-auth-guide" aria-hidden="true"/);
    assert.match(html, /\/brujula\/foxy-bienvenida\.webp/);
    assert.match(html, /href="#main"/);
    assert.match(html, /Cargando tu cuenta/);
    assert.doesNotMatch(html, /br-auth|brujula-auth|Acceso a FoxMind/);
  });
}

function registerView(overrides = {}) {
  const { RegisterSteps } = loadTsModule('apps/web/src/features/identity/authentication/register-steps.tsx');
  const calls = [];
  const props = { locked: false, busy: false, message: undefined, nextAccountHref: target => `/${target}`,
    submit: (path, success) => event => { calls.push({ path, success, event }); }, ...overrides };
  return { view: hookView(RegisterSteps, props), props, calls };
}
const step = (tree, name) => descendants(tree, node => node.props?.['data-step'] === name)[0];
const buttonNamed = (tree, label) => descendants(tree, node => (node.type === 'button' || typeof node.type === 'function') && node.props?.onClick && textOf(node).includes(label))[0];

test('registro: no avanza sin rol, avanza con rol y volver conserva los campos montados', async () => {
  const { view } = registerView();
  try {
    await view.flush();
    assert.equal(step(view.tree, 'role').props.hidden, false);
    assert.equal(step(view.tree, 'details').props.hidden, true);
    buttonNamed(view.tree, 'Continuar').props.onClick(); await view.flush();
    const alert = descendants(view.tree, node => node.props?.role === 'alert')[0];
    assert.match(textOf(alert), /Elegí si tu cuenta es docente o estudiante/);
    assert.equal(step(view.tree, 'details').props.hidden, true, 'sin rol no se avanza');

    descendants(view.tree, node => node.props?.name === 'accountRole' && node.props.value === 'student')[0].props.onChange(); await view.flush();
    buttonNamed(view.tree, 'Continuar').props.onClick(); await view.flush();
    assert.equal(step(view.tree, 'role').props.hidden, true);
    assert.equal(step(view.tree, 'details').props.hidden, false);
    assert.match(textOf(descendants(view.tree, node => node.props?.['aria-current'] === 'step')[0]), /Tus datos/);
    assert.match(textOf(step(view.tree, 'details')), /Cuenta de estudiante/);

    buttonNamed(view.tree, 'Volver').props.onClick(); await view.flush();
    assert.equal(step(view.tree, 'role').props.hidden, false);
    const names = descendants(view.tree, node => typeof node.props?.name === 'string').map(node => node.props.name).sort();
    assert.deepEqual(names, ['accountRole', 'accountRole', 'email', 'firstName', 'lastName', 'password'], 'los datos siguen montados al volver');
  } finally { view.close(); }
});

test('registro: el envío usa el flujo existente y un envío aceptado muestra «Revisá tu correo»', async () => {
  const { view, props, calls } = registerView();
  const previous = globalThis.FormData;
  globalThis.FormData = class { constructor(form) { return Object.entries(form.fields); } };
  try {
    await view.flush();
    descendants(view.tree, node => node.props?.name === 'accountRole' && node.props.value === 'teacher')[0].props.onChange(); await view.flush();
    buttonNamed(view.tree, 'Continuar').props.onClick(); await view.flush();
    const form = descendants(view.tree, node => node.type === 'form')[0];
    const fields = { accountRole: 'teacher', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test', password: 'una contraseña larga de prueba' };
    props.message = { error: false, text: 'Si los datos son válidos para crear una cuenta, recibirás un correo de verificación.' };
    form.props.onSubmit({ preventDefault() {}, currentTarget: { fields, querySelectorAll: () => [] } }); await view.flush();
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/auth/register');
    const text = textOf(view.tree);
    assert.match(text, /Revisá tu correo/);
    assert.match(text, /ada@example\.test/);
    assert.equal(descendants(view.tree, node => node.type === 'form').length, 0, 'el formulario se reemplaza por el aviso');
  } finally { globalThis.FormData = previous; view.close(); }
});

test('acceso en voseo y con «Estudiante»', () => {
  const { VerificationGuidance } = loadTsModule('apps/shared-ui/VerificationGuidance.tsx');
  const pending = render(VerificationGuidance, { confirmed: false }), done = render(VerificationGuidance, { confirmed: true });
  assert.match(pending, /Abrí el enlace original/); assert.match(done, /Iniciá sesión/);
  assert.doesNotMatch(pending + done, /\b(Abre|Inicia|necesitas|solicita)\b/);
  const { validateAccountFields } = loadTsModule('apps/web/src/features/identity/api/account-client.ts');
  assert.match(validateAccountFields({ firstName: '' }), /^Completá/);
  assert.match(validateAccountFields({ email: '' }), /^Escribí/);
  const { AccountFlowForms } = loadTsModule('apps/web/src/features/identity/authentication/account-flow-forms.tsx');
  const base = { session: { authenticated: false }, verified: false, classroomNext: null, nextAccountHref: target => `/${target}`,
    locked: false, busy: false, hasToken: false, submit: () => () => {}, signOut: null, load: async () => {}, action: async () => {} };
  const register = render(AccountFlowForms, { ...base, view: 'register' });
  assert.match(register, /Estudiante/); assert.doesNotMatch(register, /Alumno/);
  const user = { id: 'u', firstName: 'Ada', lastName: 'L', email: 'ada@example.test', emailVerified: false, accountRole: 'student' };
  const verify = render(AccountFlowForms, { ...base, view: 'verify-email', session: { authenticated: true, user }, user });
  assert.match(verify, /Revisá tu correo/); assert.doesNotMatch(verify, /Revisa tu correo|Abre el mensaje/);
  const signedIn = render(AccountFlowForms, { ...base, view: 'sign-in', session: { authenticated: true, user }, user });
  assert.match(signedIn, /Ya tenés una sesión abierta/);
});
