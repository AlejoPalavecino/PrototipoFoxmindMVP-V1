import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

for (const args of [['--help'], ['--invalid'], ['--help', '--invalid']]) {
  test(`P8 integration CLI ${args.join(' ')} starts no builds or fixtures`, () => {
    const result = spawnSync(process.execPath, ['scripts/test-p8-integration.mjs', ...args], {
      encoding: 'utf8', timeout: 5000, windowsHide: true,
    });
    assert.equal(result.status, args.length === 1 && args[0] === '--help' ? 0 : 2);
    assert.match(result.stdout + result.stderr, /Usage: node scripts\/test-p8-integration\.mjs/);
    assert.doesNotMatch(result.stdout + result.stderr, /Prisma|isolated database|migrate: exit/);
  });
}

test('P8 runner retains publication persistence and final corrected-result access proof', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile('scripts/test-p8-integration.mjs', 'utf8');
  assert.match(source, /'publication-tp'/);
  assert.match(source, /'corrections-e-final'/);
  assert.match(source, /180000/);
  assert.match(source, /360000/);
});
