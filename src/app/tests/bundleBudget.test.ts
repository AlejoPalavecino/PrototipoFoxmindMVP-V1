import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// Node build tooling lives outside the application's src-only module graph.
const scriptUrl = new URL('../../../scripts/check-frontend-bundle.mjs', import.meta.url);
const { BUNDLE_LIMITS, checkBundleBudget, measureInitialGraph } = await import(scriptUrl.href);
const script = fileURLToPath(scriptUrl);
function fixture(manifest: unknown, assets: Record<string, string>, run: (distDir: string) => void) {
  const distDir = mkdtempSync(join(tmpdir(), 'foxmind-bundle-'));
  try {
    mkdirSync(join(distDir, '.vite'));
    if (manifest !== undefined) {
      writeFileSync(join(distDir, '.vite/manifest.json'), typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
    }
    for (const [file, content] of Object.entries(assets)) {
      mkdirSync(dirname(join(distDir, file)), { recursive: true });
      writeFileSync(join(distDir, file), content);
    }
    run(distDir);
  } finally {
    rmSync(distDir, { recursive: true, force: true });
  }
}
const entry = { file: 'assets/entry.js', isEntry: true };
const small = { 'assets/entry.js': 'export const entry = 1;' };

test('recursive static graph deduplicates files and imports, terminates cycles, excludes dynamic/server JS', () => {
  const assets = {
    ...small, 'assets/shared.mjs': 'export const shared = "á";'.repeat(20),
    'assets/leaf.js': 'export const leaf = 2;', 'assets/alias-only.js': 'export const extra = 3;',
    'assets/lazy.js': 'lazy'.repeat(500),
    'server.cjs': 'server'.repeat(500),
  };
  fixture({
    root: { ...entry, imports: ['shared', 'alias', 'shared'], dynamicImports: ['lazy'] },
    shared: { file: 'assets/shared.mjs', imports: ['leaf', 'root'] },
    alias: { file: 'assets/shared.mjs', imports: ['extra'] },
    extra: { file: 'assets/alias-only.js' },
    leaf: { file: 'assets/leaf.js' }, lazy: { file: 'assets/lazy.js' },
    other: { file: 'assets/leaf.js', isEntry: true },
  }, assets, distDir => {
    const measured = measureInitialGraph({ distDir });
    const files = ['assets/alias-only.js', 'assets/entry.js', 'assets/leaf.js', 'assets/shared.mjs'];
    assert.deepEqual(measured.files, files);
    assert.equal(measured.rawBytes, files.reduce((sum, file) => sum + Buffer.byteLength(assets[file]), 0));
    assert.equal(measured.gzipBytes, files.reduce((sum, file) => sum + gzipSync(assets[file]).length, 0));
    assert.notEqual(measured.gzipBytes, gzipSync(files.map(file => assets[file]).join('')).length);
    assert.equal(checkBundleBudget(measured), measured);
  });
});

test('dynamic imports do not require lazy assets or references in the initial graph', () => {
  fixture({ root: { ...entry, dynamicImports: ['not-built'] } }, small, distDir => {
    assert.deepEqual(measureInitialGraph({ distDir }).files, ['assets/entry.js']);
  });
});

test('ratified ceilings accept equality and reject each independent one-byte overflow', () => {
  assert.deepEqual(BUNDLE_LIMITS, { rawBytes: 391100, gzipBytes: 124000 });
  const atLimit = { ...BUNDLE_LIMITS, files: ['assets/entry.js'] };
  assert.equal(checkBundleBudget(atLimit), atLimit);
  assert.throws(() => checkBundleBudget({ ...atLimit, rawBytes: 391101 }), /raw.*391101.*391100/i);
  assert.throws(() => checkBundleBudget({ ...atLimit, gzipBytes: 124001 }), /gzip.*124001.*124000/i);
});

const invalidCases: [string, unknown, Record<string, string>, RegExp][] = [
  ['missing manifest', undefined, {}, /manifest/i],
  ['invalid JSON', '{broken', {}, /manifest.*JSON/i],
  ['null manifest', null, {}, /manifest.*object/i],
  ['array manifest', [], {}, /manifest.*object/i],
  ['no entry', { root: { file: 'assets/entry.js' } }, small, /entry/i],
  ['malformed entry', { root: null }, {}, /root.*object/i],
  ['malformed entry flag', { root: { ...entry, isEntry: 'true' } }, small, /root.*isEntry/i],
  ['missing emitted file', { root: entry }, {}, /assets\/entry\.js/i],
  ['missing static reference', { root: { ...entry, imports: ['lost'] } }, small, /lost.*reference/i],
  ['inherited reference', { root: { ...entry, imports: ['toString'] } }, small, /toString.*reference/i],
  ['non-array imports', { root: { ...entry, imports: 'lost' } }, small, /root.*imports/i],
  ['non-string import', { root: { ...entry, imports: [42] } }, small, /root.*imports/i],
  ['invalid dynamic shape', { root: { ...entry, dynamicImports: {} } }, small, /root.*dynamicImports/i],
  ['missing file field', { root: { isEntry: true } }, {}, /root.*file/i],
  ['non-JS static import', { root: { ...entry, imports: ['css'] }, css: { file: 'assets/style.css' } },
    { ...small, 'assets/style.css': 'body{}' }, /css.*unsupported.*JavaScript/i],
  ['unsupported entry', { root: { file: 'server.cjs', isEntry: true } }, { 'server.cjs': 'server' }, /root.*unsupported.*JavaScript/i],
  ['parent escape', { root: { file: '../outside.js', isEntry: true } }, {}, /path.*escape/i],
  ['absolute escape', { root: { file: '/outside.js', isEntry: true } }, {}, /path.*escape/i],
  ['Windows escape', { root: { file: 'C:\\outside.js', isEntry: true } }, {}, /path.*escape/i],
];
for (const [name, manifest, assets, message] of invalidCases) {
  test(`fails closed: ${name}`, () => {
    fixture(manifest, assets, distDir => {
      assert.throws(() => measureInitialGraph({ distDir }), message);
    });
  });
}

test('CLI exits nonzero for missing assets and actual over-budget fixtures without touching real dist', () => {
  fixture({ root: entry }, {}, distDir => {
    const result = spawnSync(process.execPath, [script, distDir], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /assets\/entry\.js/);
  });
  fixture({ root: entry }, { 'assets/entry.js': 'x'.repeat(391101) }, distDir => {
    const result = spawnSync(process.execPath, [script, distDir], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /raw.*391101.*391100/i);
  });
});

test('CLI rejects actual gzip overflow even when raw bytes are below their ceiling', () => {
  // Deterministic printable bytes: avoid random/flaky compression thresholds.
  let state = 123456789;
  const content = Array.from({ length: 200000 }, () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return String.fromCharCode(32 + (state >>> 0) % 95);
  }).join('');
  assert.ok(Buffer.byteLength(content) < BUNDLE_LIMITS.rawBytes);
  assert.ok(gzipSync(content).length > BUNDLE_LIMITS.gzipBytes);
  fixture({ root: entry }, { 'assets/entry.js': content }, distDir => {
    const result = spawnSync(process.execPath, [script, distDir], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /gzip.*exceeds ceiling 124000/i);
  });
});

test('importing helpers has no CLI filesystem or output side effects', () => {
  fixture(undefined, {}, distDir => {
    const url = new URL('../../../scripts/check-frontend-bundle.mjs', import.meta.url).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(url)})`], {
      cwd: distDir, encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  });
});

test('CLI reports static-only measurement and baseline/ceilings, not runtime or total-download claims', () => {
  fixture({ root: entry }, small, distDir => {
    const result = spawnSync(process.execPath, [script, distDir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /initial static JavaScript/i);
    assert.match(result.stdout, /1 file/);
    assert.match(result.stdout, /355534.*112124/);
    assert.match(result.stdout, /391100.*124000/);
    assert.match(result.stdout, /not.*latency.*total/i);
  });
});
