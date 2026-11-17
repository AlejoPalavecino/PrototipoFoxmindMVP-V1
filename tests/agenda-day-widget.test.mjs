import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { privateEvent, day, zone } from './agenda-event-form-helpers.test.mjs';

const { expandAgendaEvent } = loadTsModule('src/core/domain/agenda/index.ts');
const { AgendaDay } = loadTsModule('apps/web/src/features/agenda/calendar/AgendaDay.tsx');
const range = { startDate: day, endDateExclusive: '2026-10-29', timeZone: zone };
const occurrence = overrides => expandAgendaEvent(privateEvent(overrides), range)[0];
async function widget(items, busy = false) {
  const calls = [];
  const view = hookView(AgendaDay, { day, zone, items, busy,
    onEdit: (...args) => calls.push(['edit', ...args]), onOpen: target => calls.push(['open', target]),
    onCreate: () => calls.push(['create']) });
  await view.flush();
  return { view, calls };
}
const byClass = (tree, name) => descendants(tree, node => (node.props.className ?? '').split(/\s+/).includes(name));

test('approved day widget exposes date hierarchy, count, time column and whole-row personal actions without mutating order', async () => {
  const title = 'Preparación sintética con un título largo que debe permanecer completo '.repeat(4);
  const items = [occurrence({ title, color: 'PURPLE' }), occurrence({ title: 'Segundo', color: 'GREEN' })];
  const before = JSON.stringify(items);
  const { view, calls } = await widget(items);
  try {
    const tree = view.tree, html = renderToStaticMarkup(tree);
    assert.equal(byClass(tree, 'agenda-widget-date-number')[0]?.props.children, 27);
    assert.match(html, /Martes 27/); assert.match(html, /Octubre de 2026/); assert.match(html, /2 eventos/);
    const rows = byClass(tree, 'agenda-widget-row');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].props.id, `agenda-event-${items[0].occurrenceId}`);
    assert.equal(rows[0].props['data-event-id'], items[0].event.id);
    assert.equal(rows[0].props.tabIndex, -1, 'Existing saved-event focus anchor remains available');
    assert.match(rows[0].props.className, /agenda-color-purple/);
    assert.match(rows[1].props.className, /agenda-color-green/);
    assert.deepEqual(byClass(tree, 'agenda-widget-time').map(n => renderToStaticMarkup(n)),
      ['<span class="agenda-widget-time"><span>18:00</span><span>19:00</span></span>', '<span class="agenda-widget-time"><span>18:00</span><span>19:00</span></span>']);
    assert.ok(html.includes(title)); assert.match(html, /Clase personal/);
    const buttons = byClass(tree, 'agenda-widget-open');
    assert.equal(buttons[0].props['aria-label'], `Ver evento: ${title}`);
    buttons[0].props.onClick();
    descendants(tree, n => n.type === 'button' && n.props['aria-label'] === 'Crear evento para este día')[0].props.onClick();
    assert.deepEqual(calls, [['edit', items[0].event, items[0].occurrenceDate], ['create']]);
    assert.equal(JSON.stringify(items), before);
  } finally { view.close(); }
});

test('day widget retains deadline zone, role, context, status and real destination in a full-row action', async () => {
  const item = { id: 'synthetic-deadline', kind: 'ACADEMIC_DEADLINE', title: 'Entrega sintética', classroomName: 'Aula sintética',
    deadlineAt: '2026-10-28T01:05:00Z', timeZone: zone, role: 'student', pending: false, resubmission: true,
    target: { classroomId: 'room', activityId: 'activity' } };
  for (const busy of [false, true]) {
    const { view, calls } = await widget([item], busy);
    try {
      const html = renderToStaticMarkup(view.tree);
      for (const text of ['1 evento', '27 oct', '22:05', zone, item.title, item.classroomName, 'Estudio', 'Reentrega', 'Sin entrega pendiente']) assert.ok(html.includes(text), text);
      const button = byClass(view.tree, 'agenda-widget-open')[0];
      assert.ok(button); assert.equal(button.props.disabled, busy);
      assert.equal(button.props['aria-label'], `Abrir actividad: ${item.title}`);
      if (!busy) button.props.onClick();
      assert.deepEqual(calls, busy ? [] : [['open', item.target]]);
      assert.ok(descendants(view.tree, n => n.type === 'button').every(n => n.props.disabled === busy));
    } finally { view.close(); }
  }
});

test('day widget preserves empty filtering, all-day and cross-midnight labels, arbitrary counts and busy personal controls', async () => {
  const allDay = occurrence({ schedule: { kind: 'ALL_DAY', startDate: day, endDateExclusive: '2026-10-28' } });
  const overnight = occurrence({ schedule: { kind: 'TIMED', timeZone: zone, startLocal: `${day}T23:30`, endLocal: '2026-10-28T01:00' } });
  const outside = { ...allDay, startDate: '2026-10-28', endDateExclusive: '2026-10-29' };
  for (const items of [[outside], [allDay, overnight], Array.from({ length: 30 }, (_, i) => ({ ...allDay, occurrenceId: `synthetic-${i}` }))]) {
    const { view } = await widget(items, true);
    try {
      const html = renderToStaticMarkup(view.tree);
      assert.match(html, new RegExp(`${items.length === 1 ? 0 : items.length} eventos`));
      if (items.length === 1) assert.match(html, /Un día libre en tu agenda/);
      else assert.match(html, /Día completo/);
      if (items.length === 2) assert.match(html, /27 oct, 23:30/);
      assert.equal(byClass(view.tree, 'agenda-widget-row').length, items.length === 1 ? 0 : items.length);
      assert.ok(descendants(view.tree, n => n.type === 'button').every(n => n.props.disabled === true));
    } finally { view.close(); }
  }
});

// Source contracts, not a browser cascade emulator or proof of rendered pseudo color.
const widgetCss = () => readFileSync('apps/web/src/features/agenda/calendar/agenda-ux.module.css', 'utf8');
const localRule = selector => {
  const start = widgetCss().indexOf(`.scope.scope:global(#agenda-main) :global(${selector}) {`);
  assert.notEqual(start, -1, `Missing widget-local color rule: ${selector}`);
  return widgetCss().slice(widgetCss().indexOf('{', start) + 1, widgetCss().indexOf('}', start)).trim();
};
for (const [category, token] of [['CLASS', 'mint'], ['ACTIVITY', 'yellow'], ['EVALUATION', 'coral']]) {
  test(`AUTO ${category} widget row supplies the same accent and halo tokens as its existing category indicator`, async () => {
    const item = occurrence({ category });
    const before = JSON.stringify(item), { view } = await widget([item]);
    try {
      const row = byClass(view.tree, 'agenda-widget-row')[0];
      const legacyClass = category.toLowerCase();
      assert.ok(row.props.className.split(/\s+/).includes(legacyClass));
      assert.doesNotMatch(row.props.className, /agenda-color-/);
      const expected = `--agenda-color-bg: var(--fm-${token}); --agenda-color-accent: var(--fm-outline);`;
      const source = readFileSync('apps/web/src/features/agenda/calendar/agenda-surface.module.css', 'utf8');
      const indicator = source.indexOf(`:global(.agenda-color-indicator.${legacyClass}):where(.scope, .scope *)`);
      assert.notEqual(indicator, -1);
      assert.equal(source.slice(source.indexOf('{', indicator) + 1, source.indexOf('}', indicator)).trim(), expected);
      assert.equal(localRule(`.agenda-day-widget .agenda-widget-row.${legacyClass}`), expected);
      assert.match(localRule('.agenda-widget-copy::before'), /background: var\(--agenda-color-accent\); box-shadow: 0 0 0 3px var\(--agenda-color-bg\);/);
      assert.equal(JSON.stringify(item), before);
    } finally { view.close(); }
  });
}

test('explicit widget palette keeps existing color classes and exact shared pairs without local overrides', async () => {
  const pairs = { BLUE: ['#dbeafe', '#1d4ed8'], GREEN: ['#dcfce7', '#166534'], YELLOW: ['#fef3c7', '#854d0e'],
    ORANGE: ['#ffedd5', '#9a3412'], PINK: ['#fce7f3', '#9d174d'], PURPLE: ['#f3e8ff', '#6b21a8'], GRAPHITE: ['#edf0f5', '#64748b'] };
  const source = readFileSync('apps/web/src/features/agenda/calendar/agenda-surface.module.css', 'utf8');
  const parity = readFileSync('apps/web/src/application/shell/styles/brujula-parity.css', 'utf8');
  for (const [color, [bg, accent]] of Object.entries(pairs)) {
    for (const category of ['CLASS', 'ACTIVITY', 'EVALUATION']) {
      const { view } = await widget([occurrence({ category, color })]);
      try {
        const classes = byClass(view.tree, 'agenda-widget-row')[0].props.className.split(/\s+/);
        assert.ok(classes.includes(`agenda-color-${color.toLowerCase()}`));
        assert.ok(!classes.includes(category.toLowerCase()), 'Explicit rows never match AUTO category rules');
      } finally { view.close(); }
    }
    const declaration = color === 'GRAPHITE'
      ? `.agenda-color-graphite { --agenda-color-bg:${bg}; --agenda-color-accent:${accent}; }`
      : `:global(.agenda-color-${color.toLowerCase()}):where(.scope, .scope *) { --agenda-color-bg: ${bg}; --agenda-color-accent: ${accent}; }`;
    assert.ok((color === 'GRAPHITE' ? parity : source).includes(declaration), color);
  }
  const definitions = [...widgetCss().matchAll(/([^{}]+)\{([^{}]*--agenda-color-(?:bg|accent):[^{}]*)\}/g)];
  assert.ok(definitions.every(([, selector]) => /:global\(\.agenda-(?:widget-deadline|day-widget \.agenda-widget-row\.(?:class|activity|evaluation))\)\s*$/.test(selector)),
    'Widget color definitions must target only AUTO category classes or deadlines, never explicit rows');
});

test('widget CSS contract keeps natural height, shrinking text tracks and scoped reduced-motion feedback', () => {
  const css = readFileSync('apps/web/src/features/agenda/calendar/agenda-ux.module.css', 'utf8');
  assert.match(css, /\.agenda-widget-open\)\s*\{[^}]*grid-template-columns:\s*52px minmax\(0, 1fr\)/);
  assert.match(css, /\.agenda-widget-copy\)\s*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*agenda-widget-open/);
  assert.doesNotMatch(css.match(/\/\* Approved05[\s\S]*?\/\* End approved05 \*\//)?.[0] ?? '', /(?:max-height|height):\s*380px|line-clamp|!important/);
});
