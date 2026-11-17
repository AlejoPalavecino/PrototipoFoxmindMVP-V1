import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const css = readFileSync('apps/web/src/features/agenda/calendar/agenda-ux.module.css', 'utf8');
const scope = '.scope.scope:global(#agenda-main)';
function declarations(selector) {
  const start = css.indexOf(`${scope} :global(${selector}) {`);
  assert.notEqual(start, -1, `Missing Agenda-local rule: ${selector}`);
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
}

// Structural CSS contracts only: these do not measure rendered layout or the full cascade.
test('monthly rows own desktop/mobile height and border-box cells fill that track', () => {
  assert.match(declarations('.agenda-grid'), /--agenda-month-row-height:\s*86px;/);
  assert.match(declarations('.agenda-grid'), /grid-auto-rows:\s*var\(--agenda-month-row-height\);/);
  const cell = declarations('.agenda-grid .agenda-day');
  for (const rule of [/box-sizing:\s*border-box;/, /height:\s*100%;/, /min-height:\s*0;/]) assert.match(cell, rule);
  const mobile = css.slice(css.indexOf('@media (max-width: 600px)'));
  assert.match(mobile, /:global\(\.agenda-grid\)\s*\{\s*--agenda-month-row-height:\s*64px;\s*\}/);
  assert.doesNotMatch(mobile, /height:\s*68px/);
});

test('compact monthly event indicators have an Agenda-local visible override', () => {
  const compact = css.slice(css.indexOf('@media (max-width: 800px)'));
  assert.ok(css.includes('@media (max-width: 800px)'));
  assert.ok(compact.includes(`${scope} :global(.agenda-grid .agenda-day-indicators)`));
  assert.match(compact, /:global\(\.agenda-grid \.agenda-day-indicators\)\s*\{[^}]*display:\s*flex;/);
});

test('month keeps populated/empty day semantics, exact counts and date selection', async () => {
  const { AgendaMonth } = loadTsModule('apps/web/src/features/agenda/calendar/AgendaMonth.tsx');
  const { expandAgendaEvent } = loadTsModule('src/core/domain/agenda/index.ts');
  const items = [1, 2, 3, 4].flatMap(id => expandAgendaEvent({
    id: `synthetic-${id}`, revision: '0', title: `Evento ${id}`, description: '', category: 'CLASS',
    schedule: { kind: 'ALL_DAY', startDate: '2026-11-12', endDateExclusive: '2026-11-13' }, repeat: { kind: 'NONE' },
  }, { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' }));
  const before = JSON.stringify(items), calls = [];
  const view = hookView(AgendaMonth, { month: '2026-11', selected: '2026-11-12', zone: 'UTC', items,
    loading: false, onSelect: date => calls.push(date), onMonth() {}, onToday() {} });
  try {
    await view.flush();
    const days = descendants(view.tree, n => n.type === 'button' && n.props['data-calendar-day']);
    assert.equal(days.length, 42);
    const populated = days.find(n => n.props['data-calendar-day'] === '2026-11-12');
    const empty = days.find(n => n.props['data-calendar-day'] === '2026-11-13');
    assert.equal(populated.props['aria-label'], `jueves, 12 de noviembre${populated.props['aria-current'] === 'date' ? ', hoy' : ''}, 4 eventos o entregas`);
    assert.equal(populated.props['aria-pressed'], true);
    assert.equal(empty.props['aria-pressed'], false);
    assert.doesNotMatch(empty.props['aria-label'], /eventos o entregas/);
    const indicators = node => descendants(node, n => n.props.className === 'agenda-day-indicators')[0];
    assert.equal(indicators(populated).props['aria-hidden'], 'true');
    assert.equal(descendants(indicators(populated), n => /agenda-color-indicator/.test(n.props.className ?? '')).length, 3);
    assert.equal(descendants(indicators(empty), n => /agenda-color-indicator/.test(n.props.className ?? '')).length, 0);
    assert.equal(descendants(populated, n => n.props.className === 'agenda-day-count')[0].props.children, 4);
    empty.props.onClick(); populated.props.onClick();
    assert.deepEqual(calls, ['2026-11-13', '2026-11-12']);
    assert.equal(JSON.stringify(items), before);
  } finally { view.close(); }
});
