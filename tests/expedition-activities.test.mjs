import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';

const sheet = () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-activities.css'));
  assert.ok(path, 'expedition-activities.css debe formar parte de la cascada real');
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
};
const selectorsOf = css => [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));

test('Actividades: la hoja está en la cascada y se ancla como el interior del aula', () => {
  const selectors = selectorsOf(sheet());
  assert.ok(selectors.length >= 12);
  for (const selector of selectors) assert.match(selector, /^#foxmind-product#foxmind-product\.fm3d-theme #classroom-main /, selector);
});

test('Actividades: el contador del filtro centra su número y los títulos de los recuadros quedan dentro de su tarjeta', () => {
  const css = sheet();
  const counter = css.match(/\.fm-desk-activity-filters > button > span \{([^}]*)\}/)?.[1] ?? '';
  for (const declaration of [/display:\s*inline-grid/, /place-items:\s*center/, /\/1 var/]) assert.match(counter, declaration);
  for (const legend of ['.parity-compose-type > legend', '.parity-compose-scope fieldset > legend'])
    assert.match(css, new RegExp(`${legend.replace(/[.>]/g, '\$&')} \{[^}]*float: left; width: 100%`), legend);
});
