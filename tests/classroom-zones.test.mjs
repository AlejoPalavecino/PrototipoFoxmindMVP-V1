import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

test('classroom city picker keeps worldwide options and inherited zones without duplicate canonical choices', () => {
  const { classroomZones } = loadTsModule('apps/classrooms-ui/classroom-zones.ts');
  const choices = classroomZones('Etc/GMT+2');
  const canonical = value => new Intl.DateTimeFormat('es', { timeZone: value }).resolvedOptions().timeZone;
  const values = choices.map(x => canonical(x.value));
  for (const zone of ['Europe/Paris', 'Asia/Shanghai', 'Pacific/Auckland', 'Etc/GMT+2', 'UTC']) assert.ok(values.includes(canonical(zone)), zone);
  assert.equal(new Set(values).size, values.length);
  assert.ok(choices.some(x => x.label === 'Buenos Aires, Argentina'));
  assert.doesNotThrow(() => classroomZones(''), 'an unfinished draft must remain recoverable');
});
