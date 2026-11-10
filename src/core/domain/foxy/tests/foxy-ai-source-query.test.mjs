import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const domain = () => import('../../index.ts');
const invalid = fn => assert.throws(fn, { code: 'INVALID_INPUT', message: 'INVALID_INPUT' });
const request = (changes = {}) => ({ kind: 'PLAN', limit: 20, after: null, ...changes });
const cursor = (changes = {}) => ({ createdAt: '2026-10-31T12:34:56.789Z', id: randomUUID(), ...changes });

test('source query retains valid kind, limits and canonical cursor without coercion', async () => {
  const { parseFoxySourceQuery: parse } = await domain();
  assert.equal(typeof parse, 'function');
  for (const kind of ['PLAN', 'MATERIAL', 'ACTIVITY']) for (const limit of [1, 50]) {
    for (const after of [null, cursor()]) {
      const value = request({ kind, limit, after });
      assert.deepEqual(parse(value), value);
    }
  }
});

test('source query requires exact object, supported kind and integer bounded limit', async () => {
  const { parseFoxySourceQuery: parse } = await domain();
  const value = request();
  for (const bad of [null, [], 'value', { ...value, extra: true }, { ...value, kind: 'OTHER' },
    { ...value, kind: 'plan' }, { ...value, limit: 0 }, { ...value, limit: 51 },
    { ...value, limit: 1.5 }, { ...value, limit: '20' }, { ...value, limit: null }]) invalid(() => parse(bad));
  for (const key of Object.keys(value)) { const changed = { ...value }; delete changed[key]; invalid(() => parse(changed)); }
});

test('cursor requires UUID and exact canonical ISO UTC timestamp including valid calendar date', async () => {
  const { parseFoxySourceQuery: parse } = await domain();
  const valid = cursor();
  for (const after of [[], 'cursor', 0, { ...valid, extra: true }, { createdAt: valid.createdAt },
    { id: valid.id }, { ...valid, id: 'not-a-uuid' }, { ...valid, id: null },
    ...['', 'not-a-date', '2026-02-30T12:34:56.789Z', '2025-02-29T12:34:56.789Z',
      '2026-13-01T12:34:56.789Z', '2026-10-31T24:00:00.000Z',
      '2026-10-31T12:34:56Z', '2026-10-31T12:34:56.789+00:00', '2026-10-31',
      '2026-10-31T12:34:56.789z', '2026-10-31T12:34:56.789Z\n'].map(createdAt => ({ ...valid, createdAt }))]) {
    invalid(() => parse(request({ after })));
  }
  const leap = request({ after: cursor({ createdAt: '2024-02-29T00:00:00.000Z' }) });
  assert.deepEqual(parse(leap), leap);
});
