import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCompleteSuite } from '../scripts/ci-suites.mjs';

test('complete suite Windows environment preserves ProgramFiles without exposing configuration', async () => {
  const { cleanEnvironment } = await import('../scripts/run-complete-suite.mjs');
  assert.equal(typeof cleanEnvironment, 'function', 'runner exposes its environment policy');
  const source = { PATH: 'test-path', SystemRoot: 'test-system', WINDIR: 'test-windir', COMSPEC: 'test-shell',
    PATHEXT: '.EXE', TEMP: 'test-temp', TMP: 'test-tmp', HOME: 'test-home', USERPROFILE: 'test-profile',
    ProgramFiles: 'test-program-files', DOCKER_HOST: 'forbidden-host', DOCKER_CONTEXT: 'forbidden-context',
    APPDATA: 'forbidden-appdata', DOCKER_CONFIG: 'forbidden-config', OPENAI_API_KEY: 'forbidden-provider',
    UNKNOWN_SECRET: 'forbidden-secret', NEXT_TELEMETRY_DISABLED: '0' };
  assert.deepEqual(cleanEnvironment(source), { PATH: source.PATH, SystemRoot: source.SystemRoot, WINDIR: source.WINDIR,
    COMSPEC: source.COMSPEC, PATHEXT: source.PATHEXT, TEMP: source.TEMP, TMP: source.TMP, HOME: source.HOME,
    USERPROFILE: source.USERPROFILE, ProgramFiles: source.ProgramFiles, NEXT_TELEMETRY_DISABLED: '1' });
  assert.deepEqual(cleanEnvironment({}), { NEXT_TELEMETRY_DISABLED: '1' }, 'does not read ambient values when an explicit source is supplied');
});

const setup = () => ({ discovered: ['tests/a.test.mjs', 'tests/b.test.mjs', 'tests/fixture.test.mjs', 'tests/opt-in.test.mjs'],
  entries: ['tests/a.test.mjs', 'tests/b.test.mjs'],
  exclusions: [{ path: 'tests/fixture.test.mjs', reason: 'test helper; invoked only by its owner', kind: 'helper' },
    { path: 'tests/opt-in.test.mjs', reason: 'requires explicit external provider opt-in', kind: 'opt-in' }],
  manual: ['tests/fixture.test.mjs', 'tests/opt-in.test.mjs'] });
function invalid(value, label) { assert.ok(validateCompleteSuite(value).length > 0, label); }
test('complete suite inventory accepts explicit classification and catches missing, duplicate and unsafe fixture entries', () => {
  assert.deepEqual(validateCompleteSuite(setup()), []);
  let item = setup(); item.entries.pop(); invalid(item, 'omitted discovered entry');
  item = setup(); item.entries.push('tests/missing.test.mjs'); invalid(item, 'listed path missing from discovered inventory');
  item = setup(); item.entries.push(item.entries[0]); invalid(item, 'duplicate executable');
  item = setup(); item.exclusions.push({ ...item.exclusions[0] }); invalid(item, 'duplicate exclusion');
  item = setup(); item.exclusions[0].reason = '  '; invalid(item, 'exclusion without reason');
  item = setup(); item.exclusions[0].reason = null; invalid(item, 'null exclusion reason');
  item = setup(); item.exclusions[0].reason = 42; invalid(item, 'non-string exclusion reason');
  item = setup(); item.exclusions.push({ path: 'tests/missing-helper.test.mjs', reason: 'missing', kind: 'helper' }); invalid(item, 'excluded path missing from inventory');
  item = setup(); item.entries.push('tests/fixture.test.mjs'); item.exclusions.shift(); invalid(item, 'manual fixture cannot run as entry');
  item = setup(); item.entries.push('tests/opt-in.test.mjs'); item.exclusions.pop(); invalid(item, 'external opt-in cannot run as entry');
  item = setup(); item.exclusions.push({ path: 'tests/a.test.mjs', reason: 'ambiguous', kind: 'helper' }); invalid(item, 'entry/exclusion collision');
});

import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
async function discover(path = 'tests') {
  const result = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = `${path}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await discover(file));
    else if (entry.isFile() && entry.name.endsWith('.test.mjs')) result.push(file);
  }
  return result.sort();
}
test('versioned complete inventory covers every present test exactly once and CLI reports validation', async () => {
  const inventory = JSON.parse(await readFile('scripts/complete-suite-inventory.json', 'utf8'));
  const discovered = await discover();
  const manual = inventory.manual;
  assert.ok(Array.isArray(manual), 'independent unsafe/manual allowlist required');
  assert.deepEqual([...manual].sort(), inventory.exclusions.filter(item => ['helper', 'manual', 'retired', 'opt-in'].includes(item.kind)).map(item => item.path).sort());
  assert.ok(discovered.length > 300, 'real inventory must include project test surfaces');
  assert.deepEqual(validateCompleteSuite({ discovered, entries: inventory.entries, exclusions: inventory.exclusions, manual }), []);
  const env = Object.fromEntries(['PATH','SystemRoot','TEMP','TMP'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
  const check = spawnSync(process.execPath, ['scripts/run-ci-suite.mjs', '--check'], { env, encoding: 'utf8', timeout: 30000 });
  assert.equal(check.status, 0, check.stderr);
  assert.ok(check.stdout.trim(), 'classification should be visible');
});



test('complete routing covers each executable, rejects exclusions and requires known wrapper boundaries', async () => {
  const { validateCompleteRoutes } = await import('../scripts/ci-suites.mjs');
  assert.equal(typeof validateCompleteRoutes, 'function', 'routing validator required');
  const entries = ['tests/pure.test.mjs', 'tests/database.test.mjs', 'tests/backend.test.mjs', 'tests/p3-browser.test.mjs'];
  const exclusions = [{ path: 'tests/manual.test.mjs', reason: 'manual fixture', kind: 'manual' }];
  const routes = [
    { id: 'pure', kind: 'fast', files: ['tests/pure.test.mjs'] },
    { id: 'database', kind: 'wrapper', files: ['tests/database.test.mjs'], command: ['node', 'scripts/test-database.mjs'] },
    { id: 'backend', kind: 'wrapper', files: ['tests/backend.test.mjs'], command: ['node', 'scripts/test-backend.mjs'] },
    { id: 'p3', kind: 'wrapper', files: ['tests/p3-browser.test.mjs'], command: ['node', 'scripts/test-p3-browser.mjs'] },
  ];
  const check = value => validateCompleteRoutes({ entries, exclusions, routes: value });
  assert.deepEqual(check(routes), []);
  let value = structuredClone(routes); value.pop(); assert.ok(check(value).length, 'unrouted entry');
  value = structuredClone(routes); value.push({ id: 'pure', kind: 'fast', files: ['tests/pure.test.mjs'] }); assert.ok(check(value).length, 'duplicate route ID');
  value = structuredClone(routes); value[0].files.push('tests/manual.test.mjs'); assert.ok(check(value).length, 'excluded fixture routed');
  value = structuredClone(routes); value[0].files.push('tests/unknown.test.mjs'); assert.ok(check(value).length, 'unknown file routed');
  value = structuredClone(routes); value[0].files = []; assert.ok(check(value).length, 'empty route');
  value = structuredClone(routes); value[0].kind = 'invalid'; assert.ok(check(value).length, 'invalid route kind');
  value = structuredClone(routes); delete value[1].command; assert.ok(check(value).length, 'wrapper without command');
  value = structuredClone(routes); value[1].command = ['node', 'scripts/unknown.mjs']; assert.ok(check(value).length, 'unknown wrapper');
  value = structuredClone(routes); value[1] = { id: 'database', kind: 'fast', files: ['tests/database.test.mjs'] }; assert.ok(check(value).length, 'database requires owned wrapper');
  value = structuredClone(routes); value[2] = { id: 'backend', kind: 'owned', files: ['tests/backend.test.mjs'] }; assert.ok(check(value).length, 'backend requires owned wrapper');
  value = structuredClone(routes); value[3] = { id: 'p3', kind: 'fast', files: ['tests/p3-browser.test.mjs'] }; assert.ok(check(value).length, 'P3 browser requires wrapper');
});

test('P33 wrapper routing requires every bounded group and rejects unknown groups', async () => {
  const { validateCompleteRoutes } = await import('../scripts/ci-suites.mjs');
  const sets = [
    ['registration-profile', ['registration', 'account', 'sessions', 'lifecycle']],
    ['verification', ['confirm', 'resend']],
    ['recovery', ['request', 'issuance', 'confirm']],
    ['password-change', ['core', 'guards', 'ip', 'races']],
  ];
  const entries = sets.map(([name]) => `tests/p33-${name}.test.mjs`);
  const routes = sets.flatMap(([name, groups]) => groups.map(group => ({ id: `${name}-${group}`, kind: 'wrapper',
    files: [`tests/p33-${name}.test.mjs`], command: ['node', `scripts/test-p33-${name}.mjs`, `--group=${group}`] })));
  const check = value => validateCompleteRoutes({ entries, exclusions: [], routes: value });
  assert.deepEqual(check(routes), []);
  for (const [name, groups] of sets) {
    const missing = routes.filter(route => route.id !== `${name}-${groups[0]}`);
    assert.ok(check(missing).length, `${name}: missing ${groups[0]}`);
  }
  const unknown = structuredClone(routes); unknown[0].command[2] = '--group=unknown';
  assert.ok(check(unknown).length, 'unknown group');
});

test('complete group runner propagates wrapper failure and timeout without inventing test passes', async () => {
  const { runCompleteGroup } = await import('../scripts/run-complete-suite.mjs');
  assert.equal(typeof runCompleteGroup, 'function');
  const route = { id: 'database', kind: 'wrapper', files: ['tests/database.test.mjs'], command: ['node', 'scripts/test-database.mjs'] };
  const calls = [];
  const failed = await runCompleteGroup(route, { cwd: process.cwd(), env: {}, spawn: (_cmd, args, options) => {
    calls.push({ args, timeout: options.timeout }); return { status: 7, stdout: '', stderr: '', error: null };
  } });
  assert.ok(failed.failed > 0); assert.equal(failed.passed, 0);
  assert.equal(calls.length, 1); assert.equal(calls[0].timeout, 360000);
  const timedOut = await runCompleteGroup(route, { cwd: process.cwd(), env: {}, spawn: () => ({ status: null, stdout: '', stderr: '', error: Object.assign(new Error('deadline'), { code: 'ETIMEDOUT' }) }) });
  assert.ok(timedOut.failed > 0); assert.equal(timedOut.passed, 0);
  const completed = await runCompleteGroup(route, { cwd: process.cwd(), env: {}, spawn: () => ({ status: 0, stdout: '', stderr: '', error: null }) });
  assert.equal(completed.failed, 0); assert.equal(completed.passed, 0, 'wrapper exit alone is not an individual test pass');
});

test('versioned routing covers the actual inventory without executing excluded fixtures', async () => {
  const { validateCompleteRoutes } = await import('../scripts/ci-suites.mjs');
  const inventory = JSON.parse(await readFile('scripts/complete-suite-inventory.json', 'utf8'));
  const routes = JSON.parse(await readFile('scripts/complete-suite-routes.json', 'utf8'));
  assert.deepEqual(validateCompleteRoutes({ entries: inventory.entries, exclusions: inventory.exclusions, routes }), []);
});

test('fast suite runs at most four concurrently and stops scheduling after failure', async () => {
  const { runFastGroup } = await import('../scripts/run-fast-suite.mjs');
  assert.equal(typeof runFastGroup, 'function');
  let active = 0, maxActive = 0;
  const success = await runFastGroup(['a','b','c','d','e','f','g'], { concurrency: 4, runFile: async () => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 2)); active--;
    return { passed: 1, failed: 0, skipped: 0 };
  } });
  assert.equal(success.passed, 7); assert.equal(success.failed, 0); assert.ok(maxActive <= 4);
  const started = [], resolvers = [];
  const pending = runFastGroup(['a','b','c','d','e','f'], { concurrency: 4, runFile: file => {
    started.push(file); return new Promise(resolve => resolvers.push(resolve));
  } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(started.length, 4);
  resolvers[0]({ passed: 0, failed: 1, skipped: 0 });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(started.length, 4, 'failure must not launch subsequent entries');
  for (const resolve of resolvers.slice(1)) resolve({ passed: 1, failed: 0, skipped: 0 });
  const result = await pending;
  assert.equal(result.failed, 1); assert.equal(result.passed, 3);
});

test('fast file executor rejects empty TAP and timeout even when no process exit code is available', async () => {
  const { executeFastFile } = await import('../scripts/run-fast-suite.mjs');
  const { EventEmitter } = await import('node:events');
  let spawned = 0, killed = 0;
  const fake = ({ timeout = false } = {}) => () => {
    spawned++; const child = new EventEmitter(); child.stdout = new EventEmitter(); child.stderr = new EventEmitter();
    child.kill = () => { killed++; process.nextTick(() => child.emit('close', null)); return true; };
    if (!timeout) process.nextTick(() => child.emit('close', 0));
    return child;
  };
  const options = { cwd: process.cwd(), env: {}, timeoutMs: 10 };
  const empty = await executeFastFile('empty.test.mjs', { ...options, spawnProcess: fake() });
  assert.equal(spawned, 1, 'executor must use injected child');
  assert.equal(empty.passed, 0); assert.ok(empty.failed > 0, 'empty TAP must not pass');
  const expired = await executeFastFile('timeout.test.mjs', { ...options, spawnProcess: fake({ timeout: true }) });
  assert.equal(spawned, 2); assert.equal(killed, 1, 'timeout must terminate child');
  assert.equal(expired.passed, 0); assert.ok(expired.failed > 0, 'timeout must fail');
});


test('owned suite runner rejects empty TAP even on successful child exit', async () => {
  const { runSuite } = await import('../scripts/run-ci-suite.mjs');
  let called = 0;
  const result = await runSuite(['tests/database.test.mjs'], { cwd: process.cwd(), timeoutMs: 1000,
    spawn: () => { called++; return { status: 0, stdout: '', stderr: '', error: null }; } });
  assert.equal(called, 1);
  assert.equal(result.passed, 0); assert.ok(result.failed > 0, 'empty TAP must not yield a successful suite');
});

test('complete routing rejects flags that silently narrow or alter wrapper coverage', async () => {
  const { validateCompleteRoutes } = await import('../scripts/ci-suites.mjs');
  const inventory = JSON.parse(await readFile('scripts/complete-suite-inventory.json', 'utf8'));
  const routes = JSON.parse(await readFile('scripts/complete-suite-routes.json', 'utf8'));
  const check = value => validateCompleteRoutes({ entries: inventory.entries, exclusions: inventory.exclusions, routes: value });
  assert.deepEqual(check(routes), []);
  for (const flag of ['--empty', '--test-name-pattern=single']) {
    const changed = structuredClone(routes); changed.find(route => route.files.includes('tests/database.test.mjs')).command.push(flag);
    assert.ok(check(changed).length, `database wrapper must reject ${flag}`);
  }
  const missing = structuredClone(routes); missing.find(route => route.files.includes('tests/p33-mail-deadline.test.mjs')).command.pop();
  assert.ok(check(missing).length, 'mail deadline wrapper must require --deadline');
  const extra = structuredClone(routes); extra.find(route => route.files.includes('tests/p33-registration-profile.test.mjs')).command.push('--unexpected');
  assert.ok(check(extra).length, 'P33 group wrapper must reject extra arguments');
});

test('complete CI job pre-pulls pinned Mailpit before owned groups execute', async () => {
  const workflow = await readFile('.github/workflows/issue2-ci.yml', 'utf8');
  const section = workflow.split(/\n  complete-suite:\s*\r?\n/)[1]?.split(/\n  [a-zA-Z0-9_-]+:\s*\r?\n/)[0];
  assert.ok(section, 'complete-suite job must exist');
  const image = 'axllent/mailpit:v1.31.6@sha256:23fe39e81bde596a918000b3135c0f85dc8bb4c9ea6be274b051143f3e300387';
  const pull = section.indexOf(`docker pull ${image}`);
  const runMatch = /(?:node scripts\/run-complete-suite\.mjs --group|npm run test:complete -- --group)/.exec(section);
  const run = runMatch?.index ?? -1;
  assert.ok(pull >= 0, 'pinned Mailpit image must be pulled for owned fixture groups');
  const tagMatch = /docker pull axllent\/mailpit:v1\.31\.6\s*(?:\r?\n|$)/.exec(section);
  const tagPull = tagMatch?.index ?? -1;
  assert.ok(tagPull >= 0 && tagPull < run, 'Mailpit tag required by p5 fixtures must also be pulled');
  assert.ok(run > pull, 'pull must precede complete-suite group execution');
});
