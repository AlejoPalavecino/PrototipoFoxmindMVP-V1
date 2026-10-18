import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

for (const args of [['--help'], ['--invalid'], ['--help', '--invalid']]) {
  test(`P6 integration CLI ${args.join(' ')} does not start a build or fixture`, () => {
    const result = spawnSync(process.execPath, ['scripts/test-p6-integration.mjs', ...args],
      { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(result.error, undefined);
    assert.equal(result.status, args.length === 1 && args[0] === '--help' ? 0 : 2);
    assert.match(result.stdout + result.stderr, /Usage: node scripts\/test-p6-integration\.mjs/);
    assert.doesNotMatch(result.stdout + result.stderr, /Prisma generation|database\/storage\/scanner ready|P4 isolated/);
  });
}
