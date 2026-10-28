import test from 'node:test';
import assert from 'node:assert/strict';
import { waitForAttemptClock } from './helpers/attempt-clock.mjs';

test('fixture waits for opening using elapsed time and never changes the supplied timestamp', async () => {
  const opening = new Date(50), waits = []; let clock = 0;
  await waitForAttemptClock(opening, { now: () => clock, wait: async ms => { waits.push(ms); clock += ms; } });
  assert.equal(opening.getTime(), 50); assert.equal(clock, 50); assert.deepEqual(waits, [25, 25]);
  await waitForAttemptClock(opening, { now: () => 51, wait: async () => assert.fail('No delay needed') });
});

test('fixture fails rather than hiding large drift, invalid dates or a stopped clock', async () => {
  await assert.rejects(waitForAttemptClock('invalid'), /Invalid/);
  await assert.rejects(waitForAttemptClock(new Date(1001), { now: () => 0 }), /more than one second/);
  let polls = 0;
  await assert.rejects(waitForAttemptClock(new Date(1), { now: () => 0, wait: async () => { polls++; } }), /did not reach/);
  assert.equal(polls, 40);
});
