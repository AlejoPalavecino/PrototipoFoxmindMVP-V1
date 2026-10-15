import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// Invalid operations must stop before Docker or any environment file is read.
test('mail CLI rejects destructive or additional arguments without stdout', () => {
  for (const args of [[], ['down'], ['up', '--volumes']]) {
    const result = spawnSync(process.execPath, ['scripts/mail-compose.mjs', ...args], {
      encoding: 'utf8', timeout: 5000,
      env: { ...process.env, COMPOSE_ENV_FILES: 'does-not-exist-and-must-not-be-read.env' },
    });
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'Usage: mail-compose.mjs <up|stop|status>\n');
  }
});
