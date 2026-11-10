import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('agenda public entry exposes canonical capabilities and routes through an injected caller', async () => {
  const feature = loadTsModule('apps/web/src/features/agenda/index.ts');
  for (const name of ['Agenda', 'AgendaClientError', 'EventForm', 'eventDraft', 'validateDraft', 'zoneChoices']) assert.equal(typeof feature[name], 'function');
  const calls = [];
  const api = feature.createAgendaClient(async (...args) => { calls.push(args); return { items: [] }; });
  const signal = new AbortController().signal;
  await api.list({ startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' }, 'cursor', signal);
  await api.upcoming(7, signal);
  await api.open({ classroomId: 'room', activityId: null }, signal);
  assert.deepEqual(calls, [
    ['?startDate=2026-11-01&endDateExclusive=2026-12-01&timeZone=UTC&cursor=cursor', 'GET', undefined, signal],
    ['/upcoming?limit=7', 'GET', undefined, signal],
    ['/open', 'POST', { classroomId: 'room', activityId: null }, signal],
  ]);
});

test('agenda canonical composition and client remain available after compatibility retirement', () => {
 const canonical=loadTsModule('apps/web/src/features/agenda/api/client.ts');
 const feature=loadTsModule('apps/web/src/features/agenda/index.ts',{stubs:{"./api/client.ts":canonical}});
 assert.equal(feature.createAgendaClient,canonical.createAgendaClient);
 for(const [file,name] of [['apps/web/src/application/agenda-client.ts','createWebAgendaClient'],['apps/web/src/application/server/agenda-proxy.ts','proxyAgendaRequest'],['apps/web/src/application/navigation/agenda-target.ts','parseAgendaEventTarget'],['apps/web/src/screens/agenda-screen.tsx','AgendaScreen']])assert.equal(typeof loadTsModule(file)[name],'function');
 for(const removed of ['apps/agenda-ui','apps/web/src/lib/agenda-client.ts','apps/web/src/lib/agenda-proxy.ts','apps/web/src/lib/agenda-target.ts','apps/web/src/components/agenda-screen.tsx'])assert.equal(existsSync(removed),false);
});
