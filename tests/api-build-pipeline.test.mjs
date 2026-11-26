import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildApi } from '../scripts/build-api.mjs';
import { runP33T2 } from '../scripts/test-p33-t2.mjs';

// Synthetic stages prove orchestration only. No real compiler, database or network.
const files = ['build-api', 'local-api-build', 'test-p33-t2', 'test-p33-registration-profile', 'test-p33-verification', 'test-p33-recovery', 'test-p33-password-change', 'test-p33-identity-http', 'test-backend', 'test-p33-mail-cancellation'];
const scratch = [];
after(() => { for (const root of scratch) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'foxmind-build-once-'));
  scratch.push(root);
  const put = (path, content) => {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), path.startsWith('tests/') ? `if(process.send){process.send({type:'foxmind-test-ready'});process.disconnect();}\n${content}` : content);
  };
  for (const file of files) put(`scripts/${file}.mjs`, readFileSync(`scripts/${file}.mjs`));
  return { root, put };
}
function cli(f, file, args = []) {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  return spawnSync(process.execPath, [`scripts/${file}.mjs`, ...args], { cwd: f.root, env, encoding: 'utf8', timeout: 5000 });
}
function tools(f, generation = 0, compilation = 0) {
  // Mirror the installed package's root export trap: the CLI is an explicit subpath.
  f.put('node_modules/prisma/package.json', JSON.stringify({ name: 'prisma', main: 'build/index.js',
    exports: { '.': './build/types.js', './build/index.js': './build/index.js' } }));
  f.put('node_modules/typescript/package.json', '{"name":"typescript","main":"index.js"}');
  f.put('node_modules/prisma/build/index.js', `
    if(process.argv.slice(2).join(' ')!=='generate')process.exit(99);
    console.log('SYNTHETIC_GENERATION'); console.error('SYNTHETIC_GENERATION_STDERR'); process.exit(${generation});`);
  f.put('node_modules/typescript/bin/tsc', `
    if(process.argv.slice(2).join(' ')!=='-p apps/api/tsconfig.json')process.exit(98);
    console.log('SYNTHETIC_COMPILATION'); console.error('SYNTHETIC_COMPILATION_STDERR'); process.exit(${compilation});`);
}
function resources(f, compileFails = false) {
  f.put('scripts/p33-test-process.mjs', readFileSync('scripts/p33-test-process.mjs'));
  f.put('scripts/p33-identity-test-env.mjs', `
    export const identityTestEnvironment = () => ({});
    export function compileIdentityApi() { console.log('SYNTHETIC_DEFAULT_COMPILER'); ${compileFails ? "throw new Error('synthetic failure');" : ''} }
    export async function withIdentityDatabase(run) {
      console.log('SYNTHETIC_DATABASE');
      try { return await run({ url:'synthetic', name:'synthetic', container:'synthetic', deadline:Date.now()+26000 }); }
      finally { console.log('SYNTHETIC_DATABASE_CLEANUP'); }
    }`);
  f.put('scripts/mailpit-test-runtime.mjs', `export async function withMailpit(run) {
    console.log('SYNTHETIC_INBOX'); return await run({smtpPort:1,httpOrigin:'synthetic'});
  }`);
  for (const file of ['p33-registration-profile', 'p33-mail-deadline', 'p33-identity-http', 'backend', 'p31-contracts']) {
    f.put(`tests/${file}.test.mjs`, `import { test } from 'node:test';
      test('D2 registration synthetic ${file}', () => console.log('SYNTHETIC_CHECK_${file}'));`);
  }
  f.put('tests/p33-verification.test.mjs', `import { test } from 'node:test';\n` +
    ['confirm', 'resend'].map(name =>
      `test('T3 ${name} synthetic', () => console.log('SYNTHETIC_CHECK_p33-verification-${name}'));`).join('\n'));
  f.put('tests/p33-recovery.test.mjs', `import { test } from 'node:test';\n` +
    [['request-core', 'request'], ['issuance', 'issuance'], ['confirm', 'confirm']].map(([prefix, group]) =>
      `test('R ${prefix} synthetic', () => console.log('SYNTHETIC_CHECK_p33-recovery-${group}'));`).join('\n'));
  f.put('tests/p33-password-change.test.mjs', `import { test } from 'node:test';\n` +
    ['core', 'guards', 'ip', 'races'].map(group =>
      `test('P ${group} synthetic', () => console.log('SYNTHETIC_CHECK_p33-password-${group}'));`).join('\n'));
  f.put('tests/p33-registration-profile.test.mjs', `import { test } from 'node:test';\n` +
    ['registration', 'rollback', 'authorized', 'SMTP'].map(name =>
      `test('D2 ${name} synthetic', () => console.log('SYNTHETIC_CHECK_p33-registration-profile'));`).join('\n'));
}

test('direct build preserves project strict flags and runs generation then compiler once', () => {
  const calls = [];
  const result = buildApi({ run: (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, stdout: '', stderr: '' };
  } });
  assert.equal(result, 0);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].command, process.execPath);
  assert.match(calls[0].args[0].replaceAll('\\', '/'), /prisma\/build\/index\.js$/);
  assert.deepEqual(calls[0].args.slice(1), ['generate']);
  assert.match(calls[1].args[0].replaceAll('\\', '/'), /typescript\/bin\/tsc$/);
  assert.deepEqual(calls[1].args.slice(1), ['-p', 'apps/api/tsconfig.json']);
  for (const { options } of calls) {
    assert.ok(options.timeout > 0 && options.timeout <= 90000);
    assert.equal(options.cwd, process.cwd());
  }
  const config = JSON.parse(readFileSync('apps/api/tsconfig.json', 'utf8'));
  assert.deepEqual(config, {
    compilerOptions: {
      target: 'ES2023', module: 'NodeNext', moduleResolution: 'NodeNext',
      rootDir: '../..', outDir: '../../.build/api', strict: true,
      experimentalDecorators: true, emitDecoratorMetadata: true,
      rewriteRelativeImportExtensions: true, skipLibCheck: true, noEmitOnError: true,
      types: ['node'],
    },
    // Compatibility entries remain emitted even after leaving the API import closure.
    include: ['src/**/*.ts', '../../.generated/prisma/**/*.ts', '../../src/core/domain/**/*.ts', '../../src/core/contracts/**/*.ts'],
  });
});

test('direct build stops on failed, signaled or timed-out stages without fabricated success', () => {
  for (const stage of [0, 1]) for (const failure of [{ status: 7 }, { status: null, signal: 'SIGTERM' }, { status: null, error: new Error('synthetic timeout') }]) {
    let count = 0;
    const code = buildApi({ run: () => count++ === stage ? failure : { status: 0 } });
    assert.equal(code, failure.status ?? 1);
    assert.equal(count, stage + 1);
  }
});

test('public direct build preserves exact stage streams/exits and never continues after failure', () => {
  for (const file of ['build-api', 'local-api-build']) for (const [generation, compilation, code] of [[0, 0, 0], [9, 0, 9], [0, 7, 7]]) {
    const f = fixture(); tools(f, generation, compilation);
    const run = cli(f, file);
    assert.equal(run.status, code, run.stderr);
    assert.equal(run.stdout, `SYNTHETIC_GENERATION\nPrisma generation: exit ${generation}\n` +
      (generation ? '' : `SYNTHETIC_COMPILATION\nAPI TypeScript compilation: exit ${compilation}\n`));
    assert.equal(run.stderr, 'SYNTHETIC_GENERATION_STDERR\n' + (generation ? '' : 'SYNTHETIC_COMPILATION_STDERR\n'));
  }
});

const expected = ['build', 'registration', 'account', 'sessions', 'lifecycle', 'confirm', 'resend', 'recovery-request', 'recovery-issuance', 'recovery-confirm', 'password-core', 'password-guards', 'password-ip', 'password-races', 'deadline', 'identity', 'backend', 'offline'];
function stages(log, failure) {
  const stage = async (name, options) => {
    log.push(name);
    if (options) { assert.equal(typeof options.prepare, 'function'); await options.prepare(Date.now()+26000); }
    return name === failure ? 11 : 0;
  };
  return {
    build: () => stage('build'),
    registration: (group, options) => stage(group, options),
    verification: (group, options) => stage(group, options),
    recovery: (group, options) => stage(`recovery-${group}`, options),
    password: (group, options) => stage(`password-${group}`, options),
    mail: (mode, options) => { assert.equal(mode, '--deadline'); return stage('deadline', options); },
    identity: options => stage('identity', options),
    backend: options => stage('backend', options),
    offline: () => stage('offline'),
  };
}
test('pipeline builds exactly once in this invocation, then all stages in fixed order', async () => {
  const log = [];
  assert.equal(await runP33T2(stages(log)), 0);
  assert.deepEqual(log, expected);
  // A later invocation must build again; no persistent approval/cache exists.
  const again = [];
  assert.equal(await runP33T2(stages(again)), 0);
  assert.deepEqual(again, expected);
});
test('every failed check prevents every later stage/resource, preserving its exit', async () => {
  for (const failure of expected) {
    const log = [];
    assert.equal(await runP33T2(stages(log, failure)), 11);
    assert.deepEqual(log, expected.slice(0, expected.indexOf(failure)+1));
  }
  const log = [];
  const candidate = stages(log);
  const unavailable = new Error('synthetic unavailable');
  candidate.build = () => { throw unavailable; };
  await assert.rejects(runP33T2(candidate), error => error === unavailable);
  assert.deepEqual(log, []);
});

test('public pipeline builds once and skips only redundant preparation after successful build', () => {
  const f = fixture(); tools(f); resources(f);
  const run = cli(f, 'test-p33-t2');
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, 'SYNTHETIC_GENERATION_STDERR\nSYNTHETIC_COMPILATION_STDERR\n');
  for (const label of ['SYNTHETIC_GENERATION\n', 'SYNTHETIC_COMPILATION\n']) assert.equal(run.stdout.split(label).length-1, 1);
  assert.doesNotMatch(run.stdout, /SYNTHETIC_DEFAULT_COMPILER/);
  assert.equal(run.stdout.split('Same-invocation API output; no new compiler invoked').length-1, 16);
  const checks = [...run.stdout.matchAll(/SYNTHETIC_CHECK_([^\r\n]+)/g)].map(match => match[1]);
  assert.deepEqual(checks, ['p33-registration-profile', 'p33-registration-profile', 'p33-registration-profile', 'p33-registration-profile', 'p33-verification-confirm', 'p33-verification-resend', 'p33-recovery-request', 'p33-recovery-issuance', 'p33-recovery-confirm', 'p33-password-core', 'p33-password-guards', 'p33-password-ip', 'p33-password-races', 'p33-mail-deadline', 'p33-identity-http', 'backend', 'p31-contracts']);
});
test('public pipeline generation/compiler failure opens no fixtures and returns exact exit', () => {
  for (const [generation, compilation, code] of [[9, 0, 9], [0, 7, 7]]) {
    const f = fixture(); tools(f, generation, compilation);
    // Resource modules deliberately absent: importing them would fail this check.
    const run = cli(f, 'test-p33-t2');
    assert.equal(run.status, code, run.stderr);
    assert.doesNotMatch(run.stdout + run.stderr, /ERR_MODULE_NOT_FOUND|SYNTHETIC_DATABASE|Same-invocation/);
  }
});

test('public pipeline check failure returns its exit and opens no later fixtures', () => {
  const f = fixture(); tools(f); resources(f);
  f.put('tests/p33-registration-profile.test.mjs', `import { test } from 'node:test';
    test('D2 registration synthetic failure', () => { throw new Error('SYNTHETIC_CHECK_FAILURE'); });`);
  const run = cli(f, 'test-p33-t2');
  assert.equal(run.status, 1, run.stderr);
  assert.equal(run.stdout.split('SYNTHETIC_DATABASE\n').length-1, 1);
  assert.equal(run.stdout.split('SYNTHETIC_INBOX\n').length-1, 1);
  assert.match(run.stdout, /SYNTHETIC_DATABASE_CLEANUP/);
  assert.doesNotMatch(run.stdout, /group account|Mail deadline|Identity HTTP runner|Backend runner|Offline contracts/);
});

test('standalone runners retain default compilation and stop after preparation failure', () => {
  for (const [file, args, check] of [
    ['test-p33-registration-profile', ['--group=registration'], 'p33-registration-profile'],
    ['test-p33-verification', ['--group=confirm'], 'p33-verification-confirm'],
    ['test-p33-verification', ['--group=resend'], 'p33-verification-resend'],
    ['test-p33-recovery', ['--group=request'], 'p33-recovery-request'],
    ['test-p33-recovery', ['--group=issuance'], 'p33-recovery-issuance'],
    ['test-p33-recovery', ['--group=confirm'], 'p33-recovery-confirm'],
    ...['core', 'guards', 'ip', 'races'].map(group => ['test-p33-password-change', [`--group=${group}`], `p33-password-${group}`]),
    ['test-p33-identity-http', [], 'p33-identity-http'],
    ['test-backend', [], 'backend'],
    ['test-p33-mail-cancellation', ['--deadline'], 'p33-mail-deadline'],
  ]) for (const failed of [false, true]) {
    const f = fixture(); resources(f, failed);
    const run = cli(f, file, args);
    assert.equal(run.status, failed ? 1 : 0, run.stderr);
    assert.equal(run.stdout.split('SYNTHETIC_DEFAULT_COMPILER').length-1, 1);
    assert.match(run.stdout, /SYNTHETIC_DATABASE_CLEANUP/);
    if (failed) assert.doesNotMatch(run.stdout, /SYNTHETIC_CHECK|SYNTHETIC_INBOX/);
    else assert.match(run.stdout, new RegExp(`SYNTHETIC_CHECK_${check}`));
  }
});

test('private mail component defaults/regressions retain their original lazy prerequisites', () => {
  for (const args of [[], ['--cancellation'], ['--regressions']]) {
    const f = fixture();
    for (const name of ['p33-mail-cancellation', 'p32-mailer', 'p33-mailbox']) {
      f.put(`tests/${name}.test.mjs`, `import { test } from 'node:test';
        test('synthetic private component', () => console.log('SYNTHETIC_PRIVATE_COMPONENT'));`);
    }
    const run = cli(f, 'test-p33-mail-cancellation', args);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.stderr, '');
    assert.equal(run.stdout.split('SYNTHETIC_PRIVATE_COMPONENT').length-1, args[0] === '--regressions' ? 2 : 1);
    assert.doesNotMatch(run.stdout, /SYNTHETIC_DEFAULT_COMPILER|SYNTHETIC_DATABASE/);
  }
});

test('all public runners reject skip/unknown options and keep help resource-lazy', () => {
  const f = fixture();
  for (const file of files) for (const [args, code] of [[['--help'], 0], [['--skip-build'], 2], [['--reuse-build'], 2], [['--help', '--unknown'], 2]]) {
    const run = cli(f, file, args);
    assert.equal(run.status, code, `${file}: ${run.stderr}`);
    assert.match(code === 0 ? run.stdout : run.stderr, /Usage:/);
    assert.doesNotMatch(run.stdout + run.stderr, /ERR_MODULE_NOT_FOUND|SYNTHETIC_DATABASE|compilation: exit/);
  }
});

test('standalone compiler helper has no receipt or environment bypass', () => {
  const f = fixture(); tools(f);
  f.put('scripts/p33-identity-test-env.mjs', readFileSync('scripts/p33-identity-test-env.mjs'));
  f.put('scripts/test-timeout-scale.mjs', readFileSync('scripts/test-timeout-scale.mjs'));
  f.put('node_modules/pg/package.json', '{"name":"pg","main":"index.js"}');
  f.put('node_modules/pg/index.js', 'module.exports = {};');
  const run = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import { compileIdentityApi } from './scripts/p33-identity-test-env.mjs';
    compileIdentityApi(Date.now()+26000);`], { cwd: f.root, encoding: 'utf8', timeout: 2000 });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /SYNTHETIC_COMPILATION\n/);
  assert.match(run.stdout, /API TypeScript compilation: exit 0/);
  assert.equal(run.stderr, 'SYNTHETIC_COMPILATION_STDERR\n');
  const helper = readFileSync('scripts/p33-identity-test-env.mjs', 'utf8');
  assert.doesNotMatch(helper, /receipt|SKIP_BUILD|REUSE_BUILD/);
  // The 30 s cap can only be stretched locally (FOXMIND_TEST_TIMEOUT_SCALE >= 1), never skipped.
  assert.match(helper, /Math\.min\(scaledMs\(30000\), deadline - Date\.now\(\)\)/);
  assert.match(readFileSync('scripts/test-timeout-scale.mjs', 'utf8'), /scale < 1/);
  assert.match(helper, /Date\.now\(\) \+ 90000/);
});
