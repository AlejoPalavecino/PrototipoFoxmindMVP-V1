import test from 'node:test';
import assert from 'node:assert/strict';

test('activity deadlines resolve classroom minute precision and explicit DST occurrences', async () => {
  const { deadlineChoices, resolveDeadline } = await import("../apps/api/src/modules/activities/domain/activity-time.ts");
  assert.equal(resolveDeadline('America/Argentina/Buenos_Aires', { local: '2026-10-18T18:00' }).toISOString(), '2026-10-18T21:00:00.000Z');
  assert.equal(resolveDeadline('UTC', null), null);
  const gap = deadlineChoices('America/New_York', '2026-03-08T02:30');
  assert.equal(gap.reason, 'NONEXISTENT');
  assert.deepEqual(gap.choices, []);
  const overlap = deadlineChoices('America/New_York', '2026-11-01T01:30');
  assert.equal(overlap.reason, 'AMBIGUOUS');
  assert.deepEqual(overlap.choices.map(x => x.offsetMinutes), [-240, -300]);
  assert.throws(() => resolveDeadline('America/New_York', { local: overlap.local }), { code: 'INVALID_INPUT' });
  for (const choice of overlap.choices) assert.equal(resolveDeadline('America/New_York', { local: overlap.local, offsetMinutes: choice.offsetMinutes }).toISOString(), choice.instant);
  for (const local of ['2026-02-30T10:00', '2026-10-18T18:00:01', '2026-10-18', 'not-a-date'])
    assert.throws(() => deadlineChoices('UTC', local), { code: 'INVALID_INPUT' });
  assert.throws(() => deadlineChoices('+03:00', '2026-10-18T10:00'), { code: 'INVALID_INPUT' });
  assert.throws(() => resolveDeadline('UTC', { local: '2026-10-18T10:00', offsetMinutes: 60 }), { code: 'INVALID_INPUT' });
  assert.throws(() => resolveDeadline('UTC', { local: '2026-10-18T10:00', extra: true }), { code: 'INVALID_INPUT' });
});
