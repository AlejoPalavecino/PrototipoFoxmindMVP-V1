import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// Copy only the public runner's input closure, never packages or env files.
function copyInput(scratch, relative) {
  const target = join(scratch, relative);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(root, relative), target);
}
function copyGeneratedSources(scratch, relative = '.generated/prisma') {
  for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) copyGeneratedSources(scratch, child);
    else if (entry.isFile() && entry.name.endsWith('.ts')) copyInput(scratch, child);
  }
}

test('S7 public outbox CLI resolves ancestor dependencies without scratch-local node_modules', { timeout: 29000 }, t => {
  const deadline = Date.now() + 28500;
  mkdirSync(join(root, '.test-artifacts'), { recursive: true });
  const scratch = mkdtempSync(join(root, '.test-artifacts/p33-runner-'));
  for (const relative of [
    'package.json', 'scripts/test-p33-outbox.mjs',
    'apps/api/tsconfig.json', 'apps/api/tsconfig.p33-outbox.json',
    "apps/api/src/modules/identity/domain/digest-domains.ts",    "apps/api/src/modules/identity/infrastructure/outbox/crypto.ts",
    "apps/api/src/modules/identity/infrastructure/outbox/repository.ts",
    "apps/api/src/modules/identity/infrastructure/outbox/worker.ts",
    'prisma/schema.prisma', 'tests/p33-account-mail-outbox.test.mjs',
  ]) copyInput(scratch, relative);
  for (const entry of readdirSync(join(root, 'prisma/migrations'), { withFileTypes: true })) {
    if (entry.isDirectory() && /^\d+_/.test(entry.name)) {
      copyInput(scratch, `prisma/migrations/${entry.name}/migration.sql`);
    }
  }
  // Unchanged generated source is allowed; the independent verifier generates its own.
  copyGeneratedSources(scratch);
  assert.equal(existsSync(join(scratch, 'node_modules')), false);
  // This is a fresh public CLI process, not a recursively invoked node:test worker.
  const { NODE_TEST_CONTEXT: _testContext, ...env } = process.env;
  const run = spawnSync(process.execPath, ['scripts/test-p33-outbox.mjs'], {
    cwd: scratch, env, encoding: 'utf8', windowsHide: true,
    timeout: Math.max(1, Math.min(28000, deadline - Date.now())),
  });
  writeFileSync(join(scratch, 'public-runner.log'), `${run.stdout ?? ''}${run.stderr ?? ''}`);
  t.diagnostic(`Evidence: ${scratch}/public-runner.log`);
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  if (run.status !== 0) {
    t.diagnostic(`Missing scratch-local compiler: ${/MODULE_NOT_FOUND/.test(output) && /node_modules[\\/]typescript[\\/]bin[\\/]tsc/.test(output)}`);
  }
  assert.equal(Boolean(run.error), false, 'Public runner must finish within its bounded budget');
  assert.equal(run.status, 0, 'Public runner must succeed without scratch-local packages');
  for (const pattern of [
    /Private TypeScript compilation: exit 0/, /Public outbox tests: exit 0/,
    /\btests 14\b/, /\bpass 14\b/, /\bfail 0\b/,
    /Owned container cleanup: exit 0/, /runner exit 0/,
  ]) assert.match(output, pattern);
  const logs = readdirSync(join(scratch, '.build/p33-outbox')).filter(name => /^verification-\d+\.log$/.test(name));
  assert.equal(logs.length, 1);
  const evidence = readFileSync(join(scratch, '.build/p33-outbox', logs[0]), 'utf8');
  assert.match(evidence, /\bpass 14\b/);
  assert.match(evidence, /Owned container cleanup: exit 0/);
  assert.equal(existsSync(join(scratch, 'node_modules')), false);
});
