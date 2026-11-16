import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { descendants } from './agenda-ui-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

for (const path of ['/inicio', '/mis-aulas', '/agenda', '/foxy', '/profile', '/settings', '/futura']) {
  test(`Private navigation opens the profile and sidebar notifications by default on ${path}`, () => {
    const { AppNavbar } = loadTsModule('apps/shared-ui/AppNavbar.tsx');
    const html = renderToStaticMarkup(createElement(AppNavbar, {
      logoHref: '/inicio', currentPath: path, displayName: 'Alex Prueba',
      links: [{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas' }, { href: '/agenda', label: 'Agenda' }],
      notifications: createElement('button', { 'aria-label': 'Notificaciones' }, 'Notificaciones'),
      accountActions: createElement('button', null, 'Cerrar sesión'),
    }));
    assert.doesNotMatch(html, /fm3d-shell-location|fm3d-shell-avatar/);
    assert.match(html, /fm3d-shell-notifications/);
    assert.match(html, /href="\/profile"[^>]*class="fm-home-account-trigger"/);
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
  assert.match(html, /aria-label="Mi perfil de Alex"/);
});

test('Home account opens the profile directly and delegates navigation to its real caller', () => {
  const { ShellAccount } = loadTsModule('apps/shared-ui/NavbarParts.tsx');
  const calls = [], shell = ShellAccount({ privateShell: true, homeNavigation: true, displayName: 'Alex Prueba', follow: (...args) => calls.push(args) });
  const link = descendants(shell, node => node.type === 'a' && node.props.href === '/profile')[0];
  assert.ok(link);const event={button:0};link.props.onClick(event);assert.deepEqual(calls,[[event,'/profile']]);
  assert.equal(descendants(shell,node=>node.type==='dialog').length,0);
});
