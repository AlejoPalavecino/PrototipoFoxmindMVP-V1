import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const id = '11111111-1111-4111-8111-111111111111';
test('D8 private-event continuation accepts only its literal event/date pair and real calendar dates', () => {
  const { parseAgendaEventTarget } = loadTsModule('apps/web/src/lib/agenda-target.ts');
  assert.deepEqual(parseAgendaEventTarget({ event: id, date: '2028-02-29' }), { eventId: id, date: '2028-02-29' });
  for (const input of [{}, null, [], { event: id }, { date: '2026-10-25' },
    { event: [id], date: '2026-10-25' }, { event: id, date: ['2026-10-25'] },
    { event: 'foreign', date: '2026-10-25' }, { event: id, date: '2026-02-29' },
    { event: id, date: '2026-02-30' }, { event: id, date: '2026-10-25T00:00:00Z' },
    { event: id, date: '2026-10-25', owner: id }, { event: id, date: '2026-10-25', next: '/settings' }])
    assert.equal(parseAgendaEventTarget(input), null, JSON.stringify(input));
  const { classroomDestination } = loadTsModule('apps/web/src/lib/classroom-client.ts');
  assert.equal(classroomDestination('/agenda'), '/agenda');
  assert.equal(classroomDestination(`/agenda?event=${id}&date=2026-10-25`), null);
});
