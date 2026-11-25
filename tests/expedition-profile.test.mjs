import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';

const sheet = () => {
  const path = appStylesheets().find(item => item.endsWith('expedition-account.css'));
  assert.ok(path, 'expedition-account.css debe formar parte de la cascada real');
  return readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
};
const selectorsOf = css => [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));
const luminance = hex => hex.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16) / 255)
  .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };

test('Perfil y Configuración: la hoja Expedición está en la cascada y se ancla por encima de las hojas de cuenta (.fm3d-theme:has(...) .entry-profile)', () => {
  const selectors = selectorsOf(sheet());
  assert.ok(selectors.length >= 20);
  for (const selector of selectors) for (const part of selector.split(/,(?![^(]*\))/))
    assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme \.entry-profile[ :]/, part.trim());
});

test('Perfil y Configuración: campos con borde 3:1, vista previa en cielo, avatar elegido en lago y escenas del repositorio', () => {
  const css = sheet();
  const border = css.match(/:is\(\.pf-fields, \.password-section\) input \{[^}]*border: 1\.5px solid (#[0-9a-f]{6})/i)?.[1];
  assert.ok(border, 'los campos de cuenta declaran su borde');
  assert.ok(contrast(border, '#ffffff') >= 3, `contraste del borde ${border} con blanco`);
  assert.match(css, /\.pf-identity \{[^}]*var\(--xp-sky\)/);
  assert.match(css, /fieldset label:has\(input:checked\) \{[^}]*border-color: var\(--xp-lake\)/);
  for (const scene of ['profile-640', 'security-640']) {
    assert.match(css, new RegExp(`/foxmind-3d/scenes/${scene}\\.webp`));
    assert.ok(readFileSync(new URL(`../apps/web/public/foxmind-3d/scenes/${scene}.webp`, import.meta.url)).length > 0);
  }
});
