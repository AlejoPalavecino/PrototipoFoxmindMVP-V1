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

const practiceSheet = () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-practice.css'));
  assert.ok(path, 'expedition-practice.css debe formar parte de la cascada real');
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
};

test('Práctica y repaso: la hoja Expedición está en la cascada y se ancla con el id raíz duplicado', () => {
  const selectors = selectorsOf(practiceSheet());
  assert.ok(selectors.length >= 30);
  for (const selector of selectors) for (const part of selector.split(/,(?![^(]*\))/))
    assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme /, part.trim());
});

test('Práctica y repaso: el sendero distingue correcta, para repasar y actual, y el paso del repaso va en lago', () => {
  const css = practiceSheet();
  assert.match(css, /\.study-practice-trail > button\.is-correct \{[^}]*background: var\(--xp-pine\)/);
  assert.match(css, /\.study-practice-trail > button\.is-review \{[^}]*border-color: var\(--xp-trail\)/);
  assert.match(css, /\.study-practice-trail > button\[aria-current=step\] \{[^}]*outline: 3px solid var\(--xp-lake\)/);
  assert.match(css, /li\[aria-current=step\] \.study-plan-step \{[^}]*background: var\(--xp-lake\)/);
  assert.match(css, /\.study-plan-stage\[hidden\] \{ display: none; \}/, 'los pasos ocultos no se muestran aunque otra hoja fije display');
});

test('Colección y asistente: hoja anclada, banner con la escena de estudio y sendero de avance en pino', () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-collection.css'));
  assert.ok(path, 'expedition-collection.css debe formar parte de la cascada real');
  const css = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const selector of selectorsOf(css)) for (const part of selector.split(/,(?![^(]*\))/))
    assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme /, part.trim());
  assert.match(css, /\/foxmind-3d\/hero\/welcome-learn-960\.webp/);
  assert.ok(readFileSync(new URL('../apps/web/public/foxmind-3d/hero/welcome-learn-960.webp', import.meta.url)).length > 0);
  assert.match(css, /\.study-folder-trail-bar > i\.on \{[^}]*background: var\(--xp-pine\)/);
});

