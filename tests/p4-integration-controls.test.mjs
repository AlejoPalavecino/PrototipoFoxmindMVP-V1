import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';
import { api } from './p4-integration-helpers.mjs';

test('browser API helper accepts a successful empty logout response with a JSON content type', async () => {
  const page = { evaluate: (fn, args) => runInNewContext(`(${fn.toString()})(args)`, {
    args, fetch: async path => path.endsWith('/csrf')
      ? Response.json({ csrfToken: 'fixture' })
      : new Response(null, { status: 204, headers: { 'content-type': 'application/json' } }),
  }) };
  assert.equal((await api(page, 'POST', '/auth/logout', {})).status, 204);
});

test('combined manifest and lock preserve all final P3 exact pins and P4 additions', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const p3 = { '@nestjs/common': '12.1.3', '@nestjs/core': '12.1.3', '@nestjs/platform-express': '12.1.3',
    '@node-rs/argon2': '2.2.2', '@prisma/adapter-pg': '7.10.0', '@prisma/client': '7.10.0',
    'class-variance-authority': '0.7.1', clsx: '2.1.1', next: '16.4.2', nodemailer: '10.1.1', pg: '8.23.1',
    react: '19.3.1', 'react-dom': '19.3.1', 'reflect-metadata': '0.2.2', rxjs: '7.8.2', 'tailwind-merge': '3.7.0', validator: '13.15.35',
    '@playwright/test': '1.64.1', '@tailwindcss/postcss': '4.3.3', '@types/node': '24.19.2', '@types/react': '19.3.0',
    '@types/react-dom': '19.3.0', '@types/validator': '13.15.10', prisma: '7.10.0', tailwindcss: '4.3.3', typescript: '5.9.3' };
  const combined = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(p3)) assert.equal(combined[name], version);
  for (const [name, version] of Object.entries(combined)) {
    assert.match(version, /^\d+\.\d+\.\d+$/);
    assert.equal(lock.packages[`node_modules/${name}`].version, version);
  }
  assert.deepEqual(lock.packages[''].dependencies, pkg.dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
});
for (const [args, expected] of [[['--help'], 0], [['--invalid'], 2], [['--help', '--invalid'], 2]]) {
  test(`integration CLI ${args.join(' ')} is bounded and never starts infrastructure`, () => {
    const result = spawnSync(process.execPath, ['scripts/test-p4-integration.mjs', ...args], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(result.status, expected);
    assert.match(result.stdout + result.stderr, /Usage: node scripts\/test-p4-integration\.mjs/);
    assert.doesNotMatch(result.stdout + result.stderr, /Prisma generation|database\/storage\/scanner ready/);
  });
}
