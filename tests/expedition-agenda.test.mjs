import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';

const sheet = () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-agenda.css'));
  assert.ok(path, 'expedition-agenda.css debe formar parte de la cascada real');
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
};
const selectorsOf = css => [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));

test('Agenda: la hoja Expedición está en la cascada y se ancla por encima de las hojas de la agenda (#agenda-main#agenda-main)', () => {
  const selectors = selectorsOf(sheet());
  assert.ok(selectors.length >= 20);
  for (const selector of selectors) for (const part of selector.split(/,(?![^(]*\))/))
    assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme #agenda-main#agenda-main /, part.trim());
});

test('Agenda: contador del día centrado, título del día sin mayúscula en cada palabra y «Todo el día» sin cortarse letra por letra', () => {
  const css = sheet();
  const counter = css.match(/\.agenda-week-strip > button > small \{([^}]*)\}/)?.[1] ?? '';
  for (const declaration of [/display:\s*inline-grid/, /place-items:\s*center/, /\/1 var/]) assert.match(counter, declaration);
  assert.match(css, /h2\[tabindex="-1"\] \{ text-transform: none; \}/);
  assert.match(css, /\.agenda-widget-all-day \{[^}]*word-break: normal/);
});
