import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('new event ends with observations while multi-day editing remains directly available', () => {
  const { EventFields } = loadTsModule('apps/agenda-ui/EventFields.tsx');
  const { eventDraft } = loadTsModule('apps/agenda-ui/event-draft.ts');
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

test('banner keeps a real create action and no view-zone controls', () => {
  const { AgendaHeader } = loadTsModule('apps/agenda-ui/AgendaHeader.tsx');
  const html = renderToStaticMarkup(createElement(AgendaHeader, { onCreate() {}, zone: 'UTC', onZone() {} }));
  assert.match(html, /<h1>Mi/);
  assert.match(html, /Nuevo evento/);
  assert.match(html, /<img[^>]*agenda-banner/);
  assert.doesNotMatch(html, /Cambiar|agenda-zone-control|<select/);
});
