import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const count = readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).length;
for (const [path, pattern] of [
  ['scripts/p4-integration-runtime.mjs', /migrations\.length !== (\d+)/],
  ['tests/p4-integration.test.mjs', /runtime\.migrations\.length,\s*(\d+)/],
  ['tests/p5-integration.test.mjs', /runtime\.migrations\.length,\s*(\d+)/],
]) {
  test(`${path} retains an explicit current migration inventory guard`, () => {
    const expected = readFileSync(path, 'utf8').match(pattern);
    assert.ok(expected, 'Explicit inventory guard must remain present');
    assert.equal(Number(expected[1]), count);
  });
}
