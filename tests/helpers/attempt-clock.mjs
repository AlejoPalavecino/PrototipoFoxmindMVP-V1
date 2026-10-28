import { setTimeout as delay } from 'node:timers/promises';

// Direct service fixtures cross the Windows/Docker clocks without a user's network round trip.
// Wait for the real receipt clock; never rewrite a receipt, opening timestamp or DB invariant.
export async function waitForAttemptClock(openedAt, { now = Date.now, wait = delay } = {}) {
  const opening = new Date(openedAt).getTime();
  if (!Number.isFinite(opening)) throw new Error('Invalid fixture attempt opening');
  for (let poll = 0; poll < 40; poll++) {
    const remaining = opening - now();
    if (remaining <= 0) return;
    if (remaining > 1000) throw new Error('Fixture clocks differ by more than one second');
    await wait(Math.min(remaining, 25));
  }
  throw new Error('Fixture receipt clock did not reach the attempt opening');
}
