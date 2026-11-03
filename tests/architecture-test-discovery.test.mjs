import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('test discovery covers tests and colocated runtime/type contracts without entering generated dependencies', async () => {
  const { discoverTests } = await import('../scripts/test-discovery.mjs');
  const cwd = await mkdtemp(join(tmpdir(), 'foxmind-discovery-'));
  try {
    const files = ['tests/a.test.mjs', 'tests/helpers/helper.test.mjs', 'apps/api/src/b.test.mjs',
      'apps/web/src/view.test.tsx', 'src/core/domain/types.test.ts', 'src/core/domain/plain.ts',
      'apps/web/node_modules/foreign.test.mjs', 'apps/web/.next/generated.test.mjs'];
    for (const file of files) { await mkdir(join(cwd, file, '..'), { recursive: true }); await writeFile(join(cwd, file), ''); }
    assert.deepEqual(discoverTests({ cwd }), ['apps/api/src/b.test.mjs', 'apps/web/src/view.test.tsx',
      'src/core/domain/types.test.ts', 'tests/a.test.mjs', 'tests/helpers/helper.test.mjs']);
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

test('compile-only contracts are classified but can never enter a runtime route', async () => {
  const { validateCompleteSuite, validateCompleteRoutes } = await import('../scripts/ci-suites.mjs');
  const path = 'src/core/domain/contract.test.ts';
  const inventory = { discovered: [path], entries: [], exclusions: [{ path, kind: 'typecheck',
    reason: 'Compile-time assertion included in the strict API TypeScript build.' }], manual: [path] };
  assert.deepEqual(validateCompleteSuite(inventory), []);
  assert.ok(validateCompleteSuite({ ...inventory, entries: [path], exclusions: [] }).length);
  assert.ok(validateCompleteRoutes({ ...inventory, routes: [{ id: 'fast', kind: 'fast', files: [path] }] }).length);
});

test('colocated API imports use the strict build so decorated host exports remain loadable', () => {
  const env = Object.fromEntries(['PATH', 'SystemRoot', 'TEMP', 'TMP'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  const result = spawnSync(process.execPath, ['--import', './scripts/register-api-test-build.mjs', '--input-type=module', '-e',
    "const api=await import('./apps/api/src/foxy-ai/index.ts'); if(typeof api.createFoxyRuntime!=='function')process.exitCode=1;"],
  { env, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
});

test('fast executor supplies a real preload path and waits for finite TAP counts', async () => {
  const { executeFastFile } = await import('../scripts/run-fast-suite.mjs');
  const { EventEmitter } = await import('node:events');
  const { existsSync } = await import('node:fs');
  const result = await executeFastFile('synthetic.test.mjs', { cwd: process.cwd(), env: {}, spawnProcess: (_command, args) => {
    assert.equal(args[0], '--import'); assert.equal(new URL(args[1]).protocol, 'file:');
    assert.ok(existsSync(new URL(args[1])), 'preload must be a real file URL on Windows and POSIX');
    assert.ok(args.includes('--experimental-test-module-mocks'));
    const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    process.nextTick(() => { child.stdout.emit('data', '# pass 2\n# fail 0\n# skipped 0\n'); child.emit('close', 0); });
    return child;
  } });
  assert.deepEqual(result, { passed: 2, failed: 0, skipped: 0 });
});

test('fast group rejects malformed counts instead of reporting a successful NaN total', async () => {
  const { runFastGroup } = await import('../scripts/run-fast-suite.mjs');
  const result = await runFastGroup(['invalid', 'not-started'], { concurrency: 1, runFile: async () => ({}) });
  assert.equal(result.passed, 0); assert.equal(result.failed, 1); assert.equal(result.skipped, 0);
});

test('owned database cleanup also runs when Docker creates a container but its CLI times out', async () => {
  const { createAgendaDatabaseFixture } = await import('./agenda-database-helpers.test.mjs');
  assert.equal(typeof createAgendaDatabaseFixture, 'function', 'synthetic spawn seam required before running fixture');
  for (const outcome of ['owned', 'missing', 'foreign']) {
    let name, owner; const removed = [];
    const spawn = (_command, args) => {
      if (args[0] === 'run') {
        name = args[args.indexOf('--name') + 1]; owner = args[args.indexOf('--label') + 1].split('=')[1];
        return { status: null, error: Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }) };
      }
      if (args[0] === 'inspect') return outcome === 'missing'
        ? { status: 1, stderr: 'Error: No such object: synthetic' }
        : { status: 0, stdout: outcome === 'owned' ? owner : 'another-owner' };
      assert.equal(args[0], 'rm'); removed.push(args.at(-1)); return { status: 0, stdout: '' };
    };
    await assert.rejects(createAgendaDatabaseFixture({ spawn })(() => assert.fail('fixture callback must not start')),
      outcome === 'foreign' ? /ownership mismatch/ : /Docker run unavailable/);
    assert.deepEqual(removed, outcome === 'owned' ? [name] : [], outcome);
  }
});
