import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { migrationInventory } from './helpers/migration-inventory.mjs';

test('complete migration inventory exactly matches the committed ordered baseline', () => {
  const actual = readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).sort();
  assert.deepEqual(actual, migrationInventory);
  assert.notDeepEqual(actual.slice(1), migrationInventory, 'missing migration must fail');
  assert.notDeepEqual([...actual, '999999999999_unexpected'], migrationInventory, 'extra migration must fail');
  assert.notDeepEqual([...actual].reverse(), migrationInventory, 'reordered migration must fail');
});
test('integration runtime retains deploy, drift and exact applied-history checks', () => {
  const source = readFileSync('scripts/p4-integration-runtime.mjs', 'utf8');
  assert.match(source, /prisma\(\['migrate', 'deploy'\]\)/);
  assert.match(source, /prisma\(\['migrate', 'diff',[^\n]*'--exit-code'\]\)/);
  assert.match(source, /_prisma_migrations/);
  assert.match(source, /JSON\.stringify\(applied\.rows\.map\(row => row\.migration_name\)\) !== JSON\.stringify\(migrations\)/);
});
for (const path of ['tests/p4-integration.test.mjs', 'tests/p5-integration.test.mjs']) {
  test(`${path} checks the full ordered runtime migration inventory`, () => {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /assert\.deepEqual\(runtime\.migrations,\s*readdirSync\('prisma\/migrations'\)/);
    for (const name of ['202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color', '202610250001_activity_topics', '202610250002_activity_ai']) assert.ok(source.includes(name), name);
  });
}
