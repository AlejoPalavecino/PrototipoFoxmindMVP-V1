import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { appStylesheets } from './helpers/global-style-fixture.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const textOf = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children);
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const sheet = name => { const path = appStylesheets().find(item => item.endsWith(name)); assert.ok(path, `${name} debe formar parte de la cascada real`); return readFileSync(path, 'utf8'); };
const token = (css, name) => css.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1];

test('barra: la hoja Expedición está en la cascada y cada regla se ancla con el id raíz duplicado', () => {
  // Older sheets reach (1,6,0) on this header; a duplicated root id (2,x,y) wins without !important.
  const css = sheet('expedition-navigation.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = [...css.matchAll(/(?:^|[}\n])\s*([^@{}\n][^{}]*?)\s*\{/g)].map(match => match[1].trim()).filter(selector => selector && !selector.startsWith('@'));
  assert.ok(selectors.length > 20);
  for (const selector of selectors) {
    let depth = 0, part = '';
    for (const char of `${selector},`) {
      if (char === '(') depth++; if (char === ')') depth--;
      if (char === ',' && depth === 0) { assert.match(part.trim(), /^#foxmind-product#foxmind-product\.fm3d-theme /, part.trim()); part = ''; } else part += char;
    }
  }
});

test('barra: los colores sobre el lago son legibles y el foco se ve', () => {
  const tokens = sheet('expedition-tokens.css');
  const lake = token(tokens, '--xp-lake');
  assert.ok(contrast(token(tokens, '--xp-lake-soft'), lake) >= 4.5, 'texto de navegación');
  assert.ok(contrast(token(tokens, '--xp-lake-muted'), lake) >= 4.5, 'etiquetas de sección');
  assert.ok(contrast(token(tokens, '--xp-sun'), lake) >= 3, 'anillo de foco sobre el lago');
  assert.ok(contrast(token(tokens, '--xp-lake'), '#ffffff') >= 4.5, 'sección actual: lago sobre blanco');
});

test('ayuda: una sola fila «Ayuda» que abre el mismo diálogo', async () => {
  const { ShellHelp } = loadTsModule('apps/shared-ui/NavbarParts.tsx');
  const view = hookView(ShellHelp, { accountRole: 'teacher' });
  try {
    await view.flush();
    const text = textOf(view.tree);
    assert.doesNotMatch(text, /Un paso a la vez|Necesitás una mano/);
    const trigger = descendants(view.tree, node => node.type === 'button' && node.props?.onClick)[0];
    assert.equal(textOf(trigger).trim(), 'Ayuda');
    trigger.props.onClick(); await view.flush();
    assert.match(textOf(view.tree), /Estamos para acompañarte/);
  } finally { view.close(); }
});

test('saldo de IA: una fila con porcentaje y barra, conservando el nombre accesible', async () => {
  const snapshot = { remainingMicrousd: 820_000, limitMicrousd: 1_000_000, consumedMicrousd: 180_000, reservedMicrousd: 0, renewsAt: '2026-12-01T03:00:00.000Z', tools: [] };
  const { AiQuotaIndicator } = loadTsModule('apps/web/src/application/navigation/ai-quota-indicator.tsx', {
    stubs: { './ai-quota-client.ts': { subscribeAiQuota: (_subject, set) => { set({ snapshot, connected: true }); return () => {}; } } },
  });
  const view = hookView(AiQuotaIndicator, { subjectId: 'synthetic' });
  try {
    await view.flush();
    const trigger = descendants(view.tree, node => node.type === 'button')[0];
    assert.equal(trigger.props['aria-label'], 'IA · 82 % disponible');
    assert.match(textOf(trigger), /Saldo de IA/);
    assert.match(textOf(trigger), /82 %/);
    const meter = descendants(trigger, node => node.props?.['data-quota-meter'] !== undefined)[0];
    assert.ok(meter, 'la barra existe');
    assert.equal(meter.props['aria-hidden'], 'true');
    assert.equal(descendants(meter, node => node.props?.style?.width === '82%').length, 1);
  } finally { view.close(); }
});
