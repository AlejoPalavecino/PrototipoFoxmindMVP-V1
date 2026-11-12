import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { buildApi } from '../scripts/build-api.mjs';

const require = createRequire(resolve('package.json'));
const commands = [
  [require.resolve('prisma/build/index.js'), 'generate'],
  [require.resolve('typescript/bin/tsc'), '-p', 'apps/api/tsconfig.json'],
];
function capture(run) {
  const stdout = [], stderr = [];
  const out = process.stdout.write, err = process.stderr.write;
  process.stdout.write = value => { stdout.push(value); return true; };
  process.stderr.write = value => { stderr.push(value); return true; };
  try { return { code: run(), stdout: stdout.join(''), stderr: stderr.join('') }; }
  finally { process.stdout.write = out; process.stderr.write = err; }
}

test('default30s and explicit local90s share one deadline, always generating then compiling', async () => {
  const { buildLocalApi } = await import('../scripts/local-api-build.mjs');
  for (const [build, budget] of [[buildApi, 30000], [buildLocalApi, 90000]]) {
    for (let invocation = 0; invocation < 2; invocation++) {
      let time = 1000;
      const calls = [];
      const result = capture(() => build({ now: () => time, run: (command, args, options) => {
        calls.push({ command, args, options });
        time += 12000;
        return { status: 0, stdout: `out${calls.length}\n`, stderr: `err${calls.length}\n` };
      } }));
      assert.deepEqual(result, { code: 0, stdout: 'out1\nPrisma generation: exit 0\nout2\nAPI TypeScript compilation: exit 0\n', stderr: 'err1\nerr2\n' });
      assert.deepEqual(calls.map(({ command, args, options }, stage) => {
        assert.equal(command, process.execPath);
        assert.deepEqual(args, commands[stage]);
        assert.deepEqual(options, { cwd: process.cwd(), env: process.env, encoding: 'utf8', windowsHide: true, timeout: budget - stage * 12000 });
        return args;
      }), commands);
    }
  }
});

test('both paths stop on failures/timeouts and never grant time past the shared deadline', async () => {
  const { buildLocalApi } = await import('../scripts/local-api-build.mjs');
  for (const [build, budget] of [[buildApi, 30000], [buildLocalApi, 90000]]) {
    for (const stage of [0, 1]) for (const failure of [
      { status: 7 }, { status: null, signal: 'SIGTERM' },
      { status: null, error: new Error('ETIMEDOUT') }, { status: 0, error: new Error('runner error') },
    ]) {
      const calls = [];
      const result = capture(() => build({ now: () => 0, run: (command, args) => {
        calls.push([command, args]);
        return { ...(calls.length === stage + 1 ? failure : { status: 0 }), stdout: 'out\n', stderr: 'err\n' };
      } }));
      assert.equal(result.code, failure.status || 1);
      assert.equal(result.stdout, 'out\nPrisma generation: exit ' + (stage ? '0\nout\nAPI TypeScript compilation: exit ' : '') + (failure.status ?? 'unavailable') + '\n');
      assert.equal(result.stderr, 'err\n'.repeat(stage + 1));
      assert.deepEqual(calls, commands.slice(0, stage + 1).map(args => [process.execPath, args]));
    }
    for (const elapsed of [budget, budget + 1]) {
      let time = 0, count = 0;
      const result = capture(() => build({ now: () => time, run: () => {
        count++; time = elapsed; return { status: 0 };
      } }));
      assert.deepEqual(result, { code: 1, stdout: 'Prisma generation: exit 0\nAPI TypeScript compilation: exit unavailable\n', stderr: '' });
      assert.equal(count, 1);
    }
  }
});

test('invalid programmatic budgets reject before any runner call', () => {
  for (const budgetMs of [0, -1, NaN, Infinity, 1.5, '90000', null]) {
    let calls = 0;
    const result = capture(() => {
      assert.throws(() => buildApi({ budgetMs, run: () => { calls++; } }), { name: 'TypeError', message: 'API build budget must be a positive safe integer' });
      return 0;
    });
    assert.equal(calls, 0);
    assert.deepEqual(result, { code: 0, stdout: '', stderr: '' });
  }
});

test('invalid clock shape rejects silently before any runner call on both paths', async () => {
  const { buildLocalApi } = await import('../scripts/local-api-build.mjs');
  for (const build of [buildApi, buildLocalApi]) for (const now of [null, 0, true, '1000', {}]) {
    let calls = 0;
    const result = capture(() => {
      assert.throws(() => build({ now, run: () => { calls++; return { status: 0 }; } }),
        { name: 'TypeError', message: 'API build clock must be callable' });
      return 0;
    });
    assert.equal(calls, 0);
    assert.deepEqual(result, { code: 0, stdout: '', stderr: '' });
  }
});

test('invalid clock readings reject before arithmetic or a subsequent runner call on both paths', async () => {
  const { buildLocalApi } = await import('../scripts/local-api-build.mjs');
  for (const [build, budget] of [[buildApi, 30000], [buildLocalApi, 90000]]) {
    for (const invalid of [NaN, Infinity, -Infinity, undefined, null, '1000']) {
      // Read0 creates the deadline; read1 precedes generation; read2 precedes tsc.
      for (const invalidRead of [0, 1, 2]) {
        let reads = 0;
        const calls = [];
        const result = capture(() => {
          assert.throws(() => build({ now: () => reads++ === invalidRead ? invalid : 1000,
            run: (command, args, options) => {
              calls.push({ command, args, options });
              return { status: 0, stdout: 'generation out\n', stderr: 'generation err\n' };
            } }), { name: 'TypeError', message: 'API build clock must return a finite number' });
          return 0;
        });
        assert.equal(reads, invalidRead + 1);
        assert.deepEqual(calls, invalidRead < 2 ? [] : [{
          command: process.execPath, args: commands[0],
          options: { cwd: process.cwd(), env: process.env, encoding: 'utf8', windowsHide: true, timeout: budget },
        }]);
        assert.deepEqual(result, { code: 0,
          stdout: invalidRead < 2 ? '' : 'generation out\nPrisma generation: exit 0\n',
          stderr: invalidRead < 2 ? '' : 'generation err\n' });
      }
    }
  }
});

test('local wrapper opts in only API build with a fixed5s shutdown margin', async () => {
  const { runLocalApiBuild } = await import('../scripts/local-api-build.mjs');
  const calls = [];
  assert.equal(await runLocalApiBuild(async (...args) => { calls.push(args); return 'done'; }), 'done');
  assert.deepEqual(calls, [[process.execPath, ['scripts/local-api-build.mjs'], process.env, 95000]]);
  const error = new Error('Local command failed: scripts/local-api-build.mjs');
  await assert.rejects(runLocalApiBuild(async () => { throw error; }), candidate => candidate === error);
  const source = readFileSync('scripts/local-app.mjs', 'utf8');
  assert.equal(source.split('await runLocalApiBuild(command);').length - 1, 1);
  assert.match(source, /if\(action==='up'\|\|action==='restart'\)await up\(\)/);
  assert.doesNotMatch(source, /\['scripts\/build-api.mjs'\]/);
  assert.match(source, /async function command\(executable,args,environment=process.env,timeout=240000\)/);
  assert.match(source, /'migrate','deploy'\],\{\.\.\.process.env,\.\.\.environment\},60000/);
  assert.match(source, /NEXT_TELEMETRY_DISABLED:'1'\},180000/);
});

test('general and local CLI help/rejections remain resource-lazy with exact streams/exits', () => {
  for (const script of ['build-api', 'local-api-build']) {
    const usage = `Usage: node scripts/${script}.mjs\n`;
    for (const [args, code] of [[['--help'], 0], [['--budget=90000'], 2], [['--skip-build'], 2], [['--help', '--unknown'], 2]]) {
      const result = spawnSync(process.execPath, [`scripts/${script}.mjs`, ...args], { encoding: 'utf8', timeout: 2000 });
      assert.equal(result.status, code);
      assert.equal(result.stdout, code === 0 ? usage : '');
      assert.equal(result.stderr, code === 0 ? '' : usage);
    }
  }
});
