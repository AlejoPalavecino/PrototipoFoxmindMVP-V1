import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

for (const args of [['--help'], ['--invalid'], ['--help', '--invalid']]) {
  test(`P7 integration CLI ${args.join(' ')} does not start builds or fixtures`, () => {
    const result = spawnSync(process.execPath, ['scripts/test-p7-integration.mjs', ...args], {
      encoding: 'utf8', timeout: 5000, windowsHide: true,
    });
    assert.equal(result.status, args.length === 1 && args[0] === '--help' ? 0 : 2);
    assert.match(result.stdout + result.stderr, /Usage: node scripts\/test-p7-integration\.mjs/);
    assert.doesNotMatch(result.stdout + result.stderr, /Prisma|isolated database|migrate: exit/);
  });
}

test('P7 default plan names all implemented actual journeys, including targeted preservation probes', () => {
  const source = readFileSync('scripts/test-p7-integration.mjs', 'utf8');
  for (const unit of ['authoring', 'participation', 'practical', 'practical-timing', 'questionnaire',
    'questionnaire-overview', 'questionnaire-recovery', 'history', 'notifications']) {
    assert.ok(source.includes(`'${unit}'`), `Missing ${unit} journey`);
    assert.ok(existsSync(`tests/p7-${unit}-integration.test.mjs`));
  }
  assert.doesNotMatch(source, /'taking'|'reopening'/);
});
