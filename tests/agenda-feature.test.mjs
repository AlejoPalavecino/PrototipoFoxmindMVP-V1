import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('agenda feature public entry preserves legacy identity and routes through an injected caller', async () => {
  const feature = loadTsModule('apps/web/src/features/agenda/index.ts');
  const legacy = loadTsModule('apps/agenda-ui/index.ts', { stubs: { '../web/src/features/agenda/index.ts': feature } });
  for (const name of ['Agenda', 'AgendaClientError', 'EventForm', 'eventDraft', 'validateDraft', 'zoneChoices']) {
    assert.equal(legacy[name], feature[name]);
  }
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

test('legacy composition entries reexport the same injected implementations', () => {
  for (const [legacy, target, name] of [
    ['apps/web/src/lib/agenda-client.ts', '../application/agenda-client.ts', 'createWebAgendaClient'],
    ['apps/web/src/lib/agenda-proxy.ts', '../application/server/agenda-proxy.ts', 'proxyAgendaRequest'],
    ['apps/web/src/lib/agenda-target.ts', '../application/navigation/agenda-target.ts', 'parseAgendaEventTarget'],
    ['apps/web/src/components/agenda-screen.tsx', '../screens/agenda-screen.tsx', 'AgendaScreen'],
  ]) {
    const implementation = () => {};
    const bridge = loadTsModule(legacy, { stubs: { [target]: { [name]: implementation } } });
    assert.equal(bridge[name], implementation);
    assert.deepEqual(Object.keys(bridge), [name]);
  }
});
