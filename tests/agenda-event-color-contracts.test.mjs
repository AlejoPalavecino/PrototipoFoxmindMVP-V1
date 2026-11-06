import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { privateEvent } from './agenda-event-form-helpers.test.mjs';
import { randomUUID } from 'node:crypto';

export const colors = ['BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PINK', 'PURPLE', 'GRAPHITE'];
export function payload(color) {
  const { id, revision, ...event } = privateEvent();
  return { ...event, ...(color === undefined ? {} : { color }) };
}
test('finite reference and retained colors survive timed and all-day weekly parsing', () => {
  const api = loadTsModule('src/core/domain/index.ts');
  assert.deepEqual(api.EVENT_COLORS, colors);
  for (const color of colors) for (const allDay of [false, true]) {
    const input = payload(color);
    if (allDay) input.schedule = { kind: 'ALL_DAY', startDate: '2026-10-27', endDateExclusive: '2026-10-28' };
    input.repeat = { kind: 'WEEKLY', untilDate: '2026-11-24' };
    assert.deepEqual(api.parseAgendaEvent(input), input);
    assert.ok(api.expandAgendaEvent({ ...input, id: 'event', revision: '0' },
      { startDate: '2026-10-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' }).every(x => x.event.color === color));
  }
});
test('legacy omission and undefined preserve the historical own properties and JSON', () => {
  const { parseAgendaEvent } = loadTsModule('src/core/domain/index.ts'), input = payload();
  for (const candidate of [input, { ...input, color: undefined }]) {
    const parsed = parseAgendaEvent(candidate);
    assert.equal(Object.hasOwn(parsed, 'color'), false);
    assert.equal(JSON.stringify(parsed), JSON.stringify(input));
  }
});
test('color rejects null, pseudo defaults and arbitrary CSS without coercion', () => {
  const { parseAgendaEvent } = loadTsModule('src/core/domain/index.ts');
  for (const color of [null, 'AUTO', 'AUTOMATIC', '', 'blue', 1, {}, '#DBEAFE', 'red'])
    assert.throws(() => parseAgendaEvent({ ...payload(), color }), { code: 'INVALID_INPUT' });
  assert.throws(() => parseAgendaEvent({ ...payload('BLUE'), extra: true }), { code: 'INVALID_INPUT' });
});

function memoryService() {
  const rows = new Map(), owner = { userId: randomUUID() }, now = '2026-10-24T12:00:00.000Z';
  const { createAgendaService } = loadTsModule('apps/api/src/agenda/index.ts');
  const uow = { async run(request, write, operation) {
    const key = id => `${request.userId}/${id}`;
    const events = {
      async get(id) { return structuredClone(rows.get(key(id)) ?? null); },
      async create(id, input) {
        const event = { ...input, id, revision: '0', createdAt: now, updatedAt: now };
        rows.set(key(id), event); return structuredClone(event);
      },
      async replace(id, revision, input) {
        const previous = rows.get(key(id));
        if (!previous) throw Object.assign(new Error(), { code: 'FORBIDDEN' });
        if (previous.revision !== revision) throw Object.assign(new Error(), { code: 'CONFLICT' });
        const event = { ...input, id, revision: String(Number(revision) + 1), createdAt: now, updatedAt: now };
        rows.set(key(id), event); return structuredClone(event);
      },
    };
    return operation({ actor: { ...request, now }, events, academic: {} });
  } };
  return { service: createAgendaService(uow), rows, owner };
}
test('in-memory public service retries compare explicit choices without changing identity or timestamps', async () => {
  const { service, owner } = memoryService();
  for (const color of [undefined, ...colors]) {
    const id = randomUUID(), first = await service.put(owner, id, payload(color));
    assert.deepEqual(await service.put(owner, id, payload(color)), { created: false, event: first.event });
    for (const changed of [color === undefined ? 'BLUE' : undefined, color === 'BLUE' ? 'GREEN' : 'BLUE'])
      await assert.rejects(service.put(owner, id, payload(changed)), { code: 'CONFLICT' });
    assert.deepEqual(await service.get(owner, id), first.event);
  }
});
test('in-memory color-only replace increments revision, omission clears and stale CAS cannot mutate', async () => {
  const { service, owner } = memoryService(), id = randomUUID();
  await service.put(owner, id, payload('BLUE'));
  const changed = await service.replace(owner, id, { revision: '0', event: payload('PURPLE') });
  assert.equal(changed.color, 'PURPLE'); assert.equal(changed.revision, '1');
  await assert.rejects(service.replace(owner, id, { revision: '0', event: payload('GREEN') }), { code: 'CONFLICT' });
  assert.deepEqual(await service.get(owner, id), changed);
  const cleared = await service.replace(owner, id, { revision: '1', event: payload() });
  assert.equal(cleared.revision, '2'); assert.equal(Object.hasOwn(cleared, 'color'), false);
});
