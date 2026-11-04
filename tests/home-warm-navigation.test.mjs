import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';

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
  assert.match(html, /href="\/profile"/);
});

test('Home account name opens a closed disclosure containing profile and logout', () => {
  const { AppNavbar } = loadTsModule('apps/shared-ui/AppNavbar.tsx');
  const html = renderToStaticMarkup(createElement(AppNavbar, {
    homeNavigation: true, logoHref: '/inicio', displayName: 'Alex Prueba',
    links: [{ href: '/mis-aulas', label: 'Mis aulas' }],
    accountActions: createElement('button', null, 'Cerrar sesión'),
  }));
  assert.match(html, /<details[^>]*class="fm-home-account-menu"/);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:=|>)/);
  assert.match(html, /<summary[^>]*>[\s\S]*Alex Prueba[\s\S]*<\/summary>/);
  assert.match(html, /<details[\s\S]*href="\/profile"[\s\S]*Cerrar sesión[\s\S]*<\/details>/);
  assert.doesNotMatch(html, /fm3d-shell-name/);
});
