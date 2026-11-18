import assert from 'node:assert/strict';
import test from 'node:test';
import { compareProviderTotals, parseStatement, parseReceipt } from '../scripts/reconcile-ai-cost.mjs';

const statement = { start: '2026-11-01T03:00:00Z', end: '2026-12-01T03:00:00Z',
  totals: [{ provider: 'gemini', model: 'flash', billedMicrousd: '42000' }] };

test('compares confirmed cost with the statement and isolates unconfirmed estimates', () => {
  const rows = compareProviderTotals(parseStatement(statement).totals, [
    { provider: 'gemini', model: 'flash', actor: '30000', platform: '2000', estimated: '8000', pending: '1000' },
    { provider: 'other', model: 'text', actor: '500', platform: '0', estimated: '0', pending: '0' },
  ]);
  assert.deepEqual(rows[0], { provider: 'gemini', model: 'flash', billedMicrousd: '42000',
    actorMicrousd: '30000', confirmedPlatformMicrousd: '2000', estimatedPlatformMicrousd: '8000',
    openReservationMicrousd: '1000', differenceFromConfirmedMicrousd: '10000' });
  assert.equal(rows[1].billedMicrousd, null);
  assert.equal(rows[1].differenceFromConfirmedMicrousd, null);
});

test('rejects ambiguous dates, repeated groups and fractional microdollars', () => {
  for (const invalid of [{ ...statement, end: statement.start }, { ...statement, start: '2026-11-01' },
    { ...statement, totals: [...statement.totals, ...statement.totals] },
    { ...statement, totals: [{ ...statement.totals[0], billedMicrousd: 0.1 }] }]) {
    assert.throws(() => parseStatement(invalid));
  }
});

test('an attributable receipt identifies exactly one provider line and one internal operation', () => {
  const receipt = { provider: 'gemini', model: 'flash', reference: 'invoice-42.line-17', namespace: 'foxy_turns',
    jobId: '47fc31c3-b64a-4c11-aee8-e167c1d050c6', actualMicrousd: '64001' };
  assert.deepEqual(parseReceipt(receipt), receipt);
  for (const patch of [{ jobId: '' }, { actualMicrousd: '-9' }, { actualMicrousd: '999999999999999999999' }, { ownerId: 'other' }]) {
    assert.throws(() => parseReceipt({ ...receipt, ...patch }));
  }
});
