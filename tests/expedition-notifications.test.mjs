import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';

const sheet = () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-notifications.css'));
  assert.ok(path, 'expedition-notifications.css debe formar parte de la cascada real');
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
};
const selectorsOf = css => [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));

test('Notificaciones: la hoja Expedición está en la cascada y se ancla por encima de las reglas de la bandeja (#foxmind-product .parity-notifications)', () => {
  const selectors = selectorsOf(sheet());
  assert.ok(selectors.length >= 20);
  for (const selector of selectors) for (const part of selector.split(/,(?![^(]*\))/))
    assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme \.parity-notifications /, part.trim());
});

test('Notificaciones: lectura y tipo elegidos en lago, contadores centrados, avisos sin leer marcados y bandeja vacía con el zorro', () => {
  const css = sheet();
  assert.match(css, /\.nt-reading-filters button\[aria-pressed=true\] \{[^}]*background: var\(--xp-lake\)/);
  assert.match(css, /\.nt-kind-filters button\[aria-pressed=true\] \{[^}]*background: var\(--xp-lake\)/);
  const counter = css.match(/\.nt-reading-filters button span \{([^}]*)\}/)?.[1] ?? '';
  for (const declaration of [/display:\s*inline-grid/, /place-items:\s*center/]) assert.match(counter, declaration);
  assert.match(css, /\.nt-row\.unread \{[^}]*inset 4px 0 0 var\(--xp-lake\)/);
  assert.match(css, /\.nt-empty > span \{[^}]*\/foxmind-3d\/states\/empty-320\.webp/);
  // La ilustración del banner existe en el repositorio.
  assert.ok(readFileSync(new URL('../apps/web/public/foxmind-3d/hero/welcome-sky-1600.webp', import.meta.url)).length > 0);
});
