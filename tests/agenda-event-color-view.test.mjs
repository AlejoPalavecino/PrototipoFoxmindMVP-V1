import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { day, zone, privateEvent, installWindow } from './agenda-event-form-helpers.test.mjs';

const tokens = ['AUTO', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PINK', 'PURPLE', 'GRAPHITE'];
test('AUTO sample follows only category independently of the currently explicit selection', () => {
  const api = loadTsModule('apps/web/src/features/agenda/index.ts');
  for (const category of ['CLASS', 'ACTIVITY', 'EVALUATION']) for (const color of ['BLUE', 'PURPLE']) {
    const draft = { ...api.eventDraft(undefined, day, zone), category, color:'AUTO' };
    const tree = api.EventColorFields({ draft, issues: [], onChange() {} });
    const autoLabel = descendants(tree, n => n.type === 'label'
      && descendants(n, child => child.type === 'input' && child.props.value === 'AUTO').length)[0];
    assert.ok(autoLabel);
    const sample = descendants(autoLabel, n => /\bagenda-color-swatch\b/.test(n.props.className ?? ''))[0];
    assert.ok(sample);
    assert.ok(sample.props.className.split(/\s+/).includes(api.eventColorClass({ category })),
      `AUTO sample for ${category} must keep category appearance while ${color} is selected`);
    assert.equal(sample.props.className.split(/\s+/).includes(`agenda-color-${color.toLowerCase()}`), false);
  }
});
test('invalid draft color renders its associated field issue without crashing the selector', () => {
  const api = loadTsModule('apps/web/src/features/agenda/index.ts');
  const draft = { ...api.eventDraft(undefined, day, zone), title: 'Plan válido', color: '#bad' };
  const result = api.validateDraft(draft);
  assert.equal(result.ok, false);
  const issue = result.issues.find(value => value.field === 'color'); assert.ok(issue?.message);
  let tree, html;
  assert.doesNotThrow(() => {
    tree = api.EventColorFields({ draft, issues: result.issues, onChange() {} });
    html = renderToStaticMarkup(tree);
  });
  assert.ok(html.includes(issue.message));
  const radios = descendants(tree, n => n.type === 'input' && n.props.type === 'radio');
  assert.equal(radios.length, 4);
  assert.ok(radios.some(n => n.props['aria-invalid'] && n.props['aria-describedby']));
  assert.equal(draft.color, '#bad');
});
test('public finite palette preserves category classes for legacy and readable labels', () => {
  const api = loadTsModule('apps/web/src/features/agenda/index.ts');
  assert.deepEqual(api.eventColorOptions.map(x => x.value), tokens);
  assert.deepEqual(api.eventColorOptions.map(x => x.label), ['Automático', 'Azul', 'Verde', 'Dorado', 'Naranja', 'Rosa', 'Violeta', 'Grafito']);
  assert.equal(api.eventColorLabel(undefined), 'Automático');
  for (const option of api.eventColorOptions) {
    assert.equal(option.className, `agenda-color-${option.value.toLowerCase()}`);
    if (option.value !== 'AUTO') {
      assert.equal(api.eventColorClass({ category: 'CLASS', color: option.value }), option.className);
      assert.equal(api.eventColorLabel(option.value), option.label);
    }
  }
  for (const category of ['CLASS', 'ACTIVITY', 'EVALUATION']) assert.equal(api.eventColorClass({ category }), category.toLowerCase());
});
test('native radio group exposes reference colors plus the selected retained color without altering saved values', () => {
  const api = loadTsModule('apps/web/src/features/agenda/index.ts'), draft = { ...api.eventDraft(undefined, day, zone), color: 'BLUE' };
  const changes = [];
  assert.equal(typeof api.EventColorFields, 'function');
  const tree = api.EventColorFields({ draft, onChange: value => changes.push(value), issues: [{ field: 'color', message: 'Elige un color válido' }] });
  const radios = descendants(tree, n => n.type === 'input' && n.props.type === 'radio');
  assert.deepEqual(radios.map(x => x.props.value), ['GREEN','ORANGE','YELLOW','GRAPHITE','BLUE']);
  assert.ok(radios.every(x => x.props.name === 'color'));
  assert.deepEqual(radios.filter(x => x.props.checked).map(x => x.props.value), ['BLUE']);
  const html = renderToStaticMarkup(tree);
  for (const label of ['Color del evento', 'Elige un color válido', 'Grafito','Azul']) assert.ok(html.includes(label));
  assert.ok(radios.some(x => x.props['aria-invalid'] && x.props['aria-describedby']));
  radios.find(x => x.props.value === 'GRAPHITE').props.onChange({ target: { value: 'GRAPHITE' } });
  assert.equal(changes.length, 1); assert.equal(changes[0].color, 'GRAPHITE'); assert.equal(draft.color, 'BLUE');
});
test('month previews, independent decorative mobile indicators and day articles use explicit color', async () => {
  const { Agenda } = loadTsModule('apps/web/src/features/agenda/index.ts');
  const { expandAgendaEvent } = loadTsModule('src/core/domain/index.ts');
  const items = ['BLUE', 'GREEN', 'PINK', 'PURPLE'].flatMap(color => expandAgendaEvent(privateEvent({ color }),
    { startDate: '2026-10-01', endDateExclusive: '2026-11-01', timeZone: zone }));
  const prior = globalThis.sessionStorage, restore = installWindow();
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ month: '2026-10', day, zone }) };
  const page = { serverTime: '2026-10-27T12:00:00.000Z', items, nextCursor: null };
  const view = hookView(Agenda, { api: { async list() { return page; }, async upcoming() { return { ...page, items: [] }; } }, onOpen() {} });
  try {
    await view.flush();
    const component = name => descendants(view.tree, n => n.type.name === name)[0];
    const month = component('AgendaMonth'), monthView = hookView(month.type, month.props);
    await monthView.flush();
    const monthTree = monthView.tree;
    monthView.close();
    const html = renderToStaticMarkup(monthTree);
    assert.match(html, /agenda-color-blue/); assert.match(html, /agenda-color-pink/);
    const indicators = descendants(monthTree, n => n.props['aria-hidden']
      && !/agenda-day-preview/.test(n.props.className ?? '')
      && descendants(n, child => /agenda-color-blue/.test(child.props.className ?? '')).length);
    assert.ok(indicators.length, 'Mobile needs a decorative independent indicator, not only hidden preview text');
    const dayNode = component('AgendaDay'), dayView = hookView(dayNode.type, dayNode.props);
    try {
      await dayView.flush();
      const articles = descendants(dayView.tree, n => n.type === 'article');
      assert.ok(articles.some(n => /agenda-color-blue/.test(n.props.className ?? '')));
      assert.match(renderToStaticMarkup(dayView.tree), /Clase de Historia/);
    } finally { dayView.close(); }
  } finally { view.close(); restore(); if (prior === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = prior; }
});
