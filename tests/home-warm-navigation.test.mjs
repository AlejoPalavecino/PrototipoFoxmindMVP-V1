import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

for (const path of ['/inicio', '/mis-aulas', '/agenda', '/foxy', '/profile', '/settings', '/futura']) {
  test(`Private navigation uses the account menu and sidebar notifications by default on ${path}`, () => {
    const { AppNavbar } = loadTsModule('apps/shared-ui/AppNavbar.tsx');
    const html = renderToStaticMarkup(createElement(AppNavbar, {
      logoHref: '/inicio', currentPath: path, displayName: 'Alex Prueba',
      links: [{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas' }, { href: '/agenda', label: 'Agenda' }],
      notifications: createElement('button', { 'aria-label': 'Notificaciones' }, 'Notificaciones'),
      accountActions: createElement('button', null, 'Cerrar sesión'),
    }));
    assert.doesNotMatch(html, /fm3d-shell-location|fm3d-shell-avatar/);
    assert.match(html, /fm3d-shell-notifications/);
    assert.match(html, /aria-haspopup="dialog"[^>]*aria-expanded="false"[^>]*aria-label="Mi cuenta/);
    assert.equal((html.match(/aria-label="Notificaciones"/g) ?? []).length, 1);
  });
}

test('Home navigation keeps notifications with account actions and omits the top location and avatar', () => {
  const { AppNavbar } = loadTsModule('apps/shared-ui/AppNavbar.tsx');
  const html = renderToStaticMarkup(createElement(AppNavbar, {
    homeNavigation: true, logoHref: '/inicio', displayName: 'Alex',
    links: [{ href: '/inicio', label: 'Inicio', current: true }, { href: '/mis-aulas', label: 'Mis aulas' }],
    notifications: createElement('button', { 'aria-label': 'Notificaciones' }, 'Notificaciones'),
  }));
  assert.doesNotMatch(html, /fm3d-shell-location|fm3d-shell-avatar/);
  assert.match(html, /fm3d-shell-notifications/);
  assert.equal((html.match(/aria-label="Notificaciones"/g) ?? []).length, 1);
  assert.match(html, /aria-label="Mi cuenta de Alex"/);
});

test('Home account name opens Mi cuenta with profile/logout and closes through Escape without navigation', async () => {
  const { ShellAccount } = loadTsModule('apps/shared-ui/NavbarParts.tsx');
  const calls = [], shell = ShellAccount({ privateShell: true, homeNavigation: true, displayName: 'Alex Prueba', follow: (...args) => calls.push(args), accountActions: createElement('button', null, 'Cerrar sesión') });
  const menu = descendants(shell, node => node.type?.name === 'HomeAccountMenu')[0];
  const view = hookView(menu.type, menu.props);
  const previousDocument = globalThis.document;
  globalThis.document = { addEventListener() {}, removeEventListener() {} };
  try {
    await view.flush();
    const trigger = descendants(view.tree, node => node.type === 'button' && node.props['aria-haspopup'] === 'dialog')[0];
    assert.equal(trigger.props['aria-expanded'], false);
    assert.equal(descendants(view.tree, node => node.type === 'dialog').length, 0);
    trigger.props.onClick(); await view.flush();
    const dialog = descendants(view.tree, node => node.type === 'dialog')[0];
    assert.equal(dialog.props['aria-label'], 'Mi cuenta');
    const html = renderToStaticMarkup(dialog);
    assert.match(html, /href="\/profile"/); assert.match(html, /Cerrar sesión/); assert.match(html, /Alex Prueba/);
    dialog.props.onCancel({ preventDefault() {}, stopPropagation() {} }); await view.flush();
    assert.equal(descendants(view.tree, node => node.type === 'dialog').length, 0);
    assert.deepEqual(calls, []);
  } finally { view.close(); globalThis.document = previousDocument; }
});
