import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runSuite } from '../scripts/run-ci-suite.mjs';

test('suite runner executes real fixture tests, fails fast and reports missing files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-audit-ci-'));
  try {
    await writeFile(join(root, 'pass.test.mjs'), "import test from 'node:test'; test('fixture pass', () => {});\n");
    await writeFile(join(root, 'fail.test.mjs'), "import test from 'node:test'; test('fixture failure', () => { throw new Error('fixture failure'); });\n");
    await writeFile(join(root, 'after.test.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('executed-after-failure', 'unexpected');\n");
    const good = await runSuite(['pass.test.mjs'], { cwd: root, timeoutMs: 5000 });
    assert.equal(good.passed, 1); assert.equal(good.failed, 0);
    let failed;
    try { failed = await runSuite(['fail.test.mjs', 'after.test.mjs'], { cwd: root, timeoutMs: 5000 }); }
    catch { failed = { failed: 1 }; }
    assert.ok(failed.failed > 0);
    await assert.rejects(access(join(root, 'executed-after-failure')));
    await assert.rejects(runSuite(['missing.test.mjs'], { cwd: root, timeoutMs: 5000 }));
    await assert.rejects(runSuite(['pass.test.mjs', 'pass.test.mjs'], { cwd: root, timeoutMs: 5000 }));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('suite timeout is reported as failure and prevents subsequent execution', async () => {
  const root = await mkdtemp(join(tmpdir(), 'foxmind-audit-timeout-'));
  try {
    await writeFile(join(root, 'slow.test.mjs'), 'fixture');
    await writeFile(join(root, 'after.test.mjs'), 'fixture');
    const invocations = [];
    const spawn = (_cmd, args, options) => { invocations.push({ args, timeout: options.timeout }); return { status: null, error: Object.assign(new Error('deadline'), { code: 'ETIMEDOUT' }), stdout: '', stderr: '' }; };
    const result = await runSuite(['slow.test.mjs', 'after.test.mjs'], { cwd: root, timeoutMs: 42, spawn });
    assert.equal(result.failed, 1);
    assert.equal(invocations.length, 1);
    assert.equal(invocations[0].timeout, 42);
  } finally { await rm(root, { recursive: true, force: true }); }
});
