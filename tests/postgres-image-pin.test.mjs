import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// B12: every Postgres container (local compose, CI pulls and owned test databases) runs one image, pinned by digest.
// The digest is the multi-architecture index of the 17.10 Debian bookworm tag the suites already used.
export const postgresImage = 'postgres:17.10-bookworm@sha256:9b18b78397054fce88a9552e9d5a3ad5bb7fd258c5b3cc1c5028e46373d6ea8f';
const roots = ['scripts', 'tests', '.github', 'apps', 'src'];
const skipped = new Set(['node_modules', '.build', '.next', '.test-artifacts']);

async function* files(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* files(path);
    else if (/\.(?:m?[jt]sx?|ya?ml|json|sh)$/u.test(entry.name)) yield path;
  }
}

test('every Postgres image reference is pinned to the same digest (B12)', async () => {
  const candidates = (await readdir('.')).filter(name => /^compose.*\.ya?ml$/u.test(name));
  for (const root of roots) for await (const path of files(root)) candidates.push(path);
  const offenders = [], pinned = [];
  for (const path of candidates) {
    const text = await readFile(path, 'utf8');
    for (const match of text.matchAll(/\bpostgres:[0-9][\w.-]*(?:@sha256:[0-9a-f]{64})?/gu)) {
      (match[0] === postgresImage ? pinned : offenders).push(`${path}: ${match[0]}`);
    }
  }
  assert.deepEqual(offenders, []);
  assert.ok(pinned.some(item => item.startsWith('compose.yaml')), 'local compose uses the pinned image');
  assert.ok(pinned.some(item => item.includes('issue2-ci.yml')), 'CI pulls the pinned image');
});
