import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const env = Object.fromEntries(['PATH', 'SystemRoot', 'TEMP', 'TMP'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
test('CI suite manifest and runner expose an explicit list and reject unknown suites', () => {
  assert.ok(existsSync('scripts/ci-suites.mjs'), 'explicit suite manifest missing');
  assert.ok(existsSync('scripts/run-ci-suite.mjs'), 'suite runner missing');
  const list = spawnSync(process.execPath, ['scripts/run-ci-suite.mjs', '--list'], { env, encoding: 'utf8', timeout: 30000 });
  assert.equal(list.status, 0, list.stderr);
  assert.ok(list.stdout.trim(), 'suite list must be visible');
  const unknown = spawnSync(process.execPath, ['scripts/run-ci-suite.mjs', '--suite', '__no_such_suite__'], { env, encoding: 'utf8', timeout: 30000 });
  assert.notEqual(unknown.status, 0, 'unknown suites must fail');
});
