import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { descendants } from './agenda-ui-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('new event ends with observations while multi-day editing remains directly available', () => {
  const { EventFields } = loadTsModule('apps/web/src/features/agenda/ui/EventFields.tsx');
  const { eventDraft } = loadTsModule('apps/web/src/features/agenda/model/event-draft.ts');
  const draft = eventDraft(undefined, '2026-11-04', 'America/Argentina/Buenos_Aires');
  const html = renderToStaticMarkup(createElement(EventFields, { draft, onChange() {}, issues: [] }));
  assert.doesNotMatch(html, /Más opciones|agenda-form-summary|Sin título/);
  assert.ok(html.indexOf('Ocupa varios días') < html.indexOf('Observaciones'));
  assert.ok(html.indexOf('Ciudad del evento') < html.indexOf('Observaciones') || html.indexOf('Cambiar') < html.indexOf('Observaciones'));
  assert.doesNotMatch(html.slice(html.indexOf('</textarea>')), /<(?:input|select|textarea|summary)\b/);
  const edited = renderToStaticMarkup(createElement(EventFields, {
    draft: { ...draft, endDate: '2026-11-06' }, onChange() {}, issues: [],
  }));
  assert.match(edited, /name="endDate"[^>]*value="2026-11-06"/);
});

test('approved agenda heading keeps a real create action and no view-zone controls', () => {
  const { AgendaHeader } = loadTsModule('apps/web/src/features/agenda/ui/AgendaHeader.tsx');
  let created = 0;
  const props = { onCreate: () => created++ };
  const html = renderToStaticMarkup(createElement(AgendaHeader, props));
  assert.match(html, /<h1>Mi agenda<\/h1>/);
  assert.match(html, /Crear evento/);
  assert.doesNotMatch(html, /agenda-banner/);
  descendants(AgendaHeader(props), node => node.type === 'button')[0].props.onClick();
  assert.equal(created, 1, 'The approved heading preserves real event creation');
  assert.doesNotMatch(html, /Cambiar|agenda-zone-control|<select/);
});
