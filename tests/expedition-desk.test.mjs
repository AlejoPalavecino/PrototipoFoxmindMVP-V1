import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';

const sheet = () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-desk.css'));
  assert.ok(path, 'expedition-desk.css debe formar parte de la cascada real');
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
};
const selectorsOf = css => [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));

test('Mesa de trabajo: la hoja Expedición está en la cascada y se ancla por encima de las hojas parity-ai', () => {
  const selectors = selectorsOf(sheet());
  assert.ok(selectors.length >= 40);
  for (const selector of selectors) for (const part of selector.split(/,(?![^(]*\))/))
    assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme /, part.trim());
});

test('Mesa de trabajo: Herramientas en pino, Nuevo chat en el naranja de botón y elecciones en lago', () => {
  const css = sheet();
  assert.match(css, /\.parity-ai-toolsTrigger \{[^}]*border-color: var\(--xp-pine\)/);
  assert.match(css, /\.parity-ai-newChat \{[^}]*background: var\(--xp-orange-button\)/);
  assert.match(css, /\.study-tool-segments > button\[aria-pressed=true\] \{[^}]*background: var\(--xp-lake\)/);
  assert.match(css, /\.parity-ai-composer \.parity-ai-primary \{[^}]*background: var\(--xp-orange-button\)/);
  // El aviso y el formulario miden lo mismo que el composer (parity-ai-fidelity: min(100% - 60px, 1000px)).
  assert.match(css, /\.study-composer-dock \{[^}]*width: min\(calc\(100% - 60px\), 1000px\)/);
});

