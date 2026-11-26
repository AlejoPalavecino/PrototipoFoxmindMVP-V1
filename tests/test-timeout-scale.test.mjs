import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { scaledMs, testTimeoutScale } from '../scripts/test-timeout-scale.mjs';

test('timeout scale defaults to 1 so CI keeps its exact budgets', () => {
  assert.equal(testTimeoutScale({}), 1);
  assert.equal(testTimeoutScale({ FOXMIND_TEST_TIMEOUT_SCALE: '' }), 1);
  assert.equal(scaledMs(30000, {}), 30000);
  assert.equal(scaledMs(4000, {}), 4000);
});

test('timeout scale stretches budgets for slower local machines', () => {
  assert.equal(testTimeoutScale({ FOXMIND_TEST_TIMEOUT_SCALE: '2.5' }), 2.5);
  assert.equal(scaledMs(30000, { FOXMIND_TEST_TIMEOUT_SCALE: '3' }), 90000);
  assert.equal(scaledMs(4000, { FOXMIND_TEST_TIMEOUT_SCALE: '1.5' }), 6000);
});

test('timeout scale rejects values that would shrink or disable budgets', () => {
  for (const value of ['0', '0.5', '-1', '11', 'abc', 'Infinity', 'NaN']) {
    assert.throws(() => testTimeoutScale({ FOXMIND_TEST_TIMEOUT_SCALE: value }), /FOXMIND_TEST_TIMEOUT_SCALE/, value);
  }
});

test('the identity compile cap and the backend CLI startup wait use the scale', () => {
  const identity = readFileSync(new URL('../scripts/p33-identity-test-env.mjs', import.meta.url), 'utf8');
  assert.match(identity, /scaledMs\(30000\)/);
  assert.doesNotMatch(identity, /Math\.min\(30000,/);
  const backend = readFileSync(new URL('./backend.test.mjs', import.meta.url), 'utf8');
  assert.match(backend, /scaledMs\(4000\)/);
});
