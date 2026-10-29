import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const names = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'];
const page = (totalItems = null, extra = {}) => ({ status: 'ready', items: [], totalItems, nextCursor: null, ...extra });
const data = (modules = {}, extra = {}) => ({ version: 1, subjectId: 'subject', generatedAt: '2026-10-28T12:00:00Z',
  timeZone: 'UTC', participation: 'mixed', memberships: { study: 7, teach: 4, archived: 2 },
  setup: { drafts: 0, invitations: 0 }, modules: { ...Object.fromEntries(names.map(name => [name, page()])), ...modules }, ...extra });
const stats = value => loadTsModule('apps/classrooms-ui/home-presentation.ts').homeActivityStats(value);
const error = { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true };

test('Activity summary uses aggregate counts, separating review deliveries from activity rows', () => {
  const result = stats(data({ pending: page(27, { items: [{ id: 'one' }] }), feedback: page(12),
    review: page(3, { totals: { attempts: 31, needsReview: 19, readyToPublish: 8 } }) }));
  assert.deepEqual(result, [
    { key: 'study', label: 'Aulas donde estudias', value: 7 },
    { key: 'teach', label: 'Aulas donde enseñas', value: 4 },
    { key: 'pending', label: 'Actividades por entregar', value: 27 },
    { key: 'feedback', label: 'Devoluciones disponibles', value: 12 },
    { key: 'review', label: 'Entregas por revisar', value: 19 },
  ]);
});

test('Unknown, failed and inapplicable totals never turn into zero; confirmed zero remains valid', () => {
  for (const unavailable of [page(), error, { status: 'not-applicable' }]) {
    assert.deepEqual(stats(data({ pending: unavailable, feedback: unavailable, review: unavailable },
      { memberships: { study: 0, teach: 0, archived: 3 } })), []);
  }
  const result = stats(data({ pending: page(0), feedback: page(0),
    review: page(8, { totals: { attempts: 15, needsReview: 0, readyToPublish: 15 } }) }));
  assert.deepEqual(result.slice(2).map(item => [item.key, item.value]), [['pending', 0], ['feedback', 0], ['review', 0]]);
});

test('Summary renders honest counts or unavailable context without fabricated progress or achievements', () => {
  const { HomeActivitySummary } = loadTsModule('apps/classrooms-ui/HomeActivitySummary.tsx');
  const html = renderToStaticMarkup(HomeActivitySummary({ data: data({ pending: page(27), feedback: error }) }));
  assert.match(html, /27/); assert.match(html, /Actividades por entregar/);
  assert.doesNotMatch(html, /\d+\s*%|role="progressbar"|logros|actividades completadas|entregas realizadas/i);
  const unknown = renderToStaticMarkup(HomeActivitySummary({ data: data({ pending: error, feedback: error, review: error },
    { memberships: { study: 0, teach: 0, archived: 0 } }) }));
  assert.match(unknown, /no disponible|no pudimos|aparecerá aquí|sin datos/i);
  assert.doesNotMatch(unknown, />0<|\d+\s*%/);
});
