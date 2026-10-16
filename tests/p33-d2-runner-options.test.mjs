import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

function fixture() {
  mkdirSync('.test-artifacts/p33-d2-plan-c2-mvb4asm3', { recursive: true });
  const root = mkdtempSync(resolve('.test-artifacts/p33-d2-plan-c2-mvb4asm3/cli-'));
  mkdirSync(join(root, 'scripts'));
  writeFileSync(join(root, 'scripts/test-p33-registration-profile.mjs'), readFileSync('scripts/test-p33-registration-profile.mjs'));
  // Resource imports must be lazy: neither helper exists in this project.
  return root;
}
const groups = { registration: [1, 2, 3, 4, 5, 6, 7], account: [8, 9, 10, 11, 12], sessions: [13, 14], lifecycle: [15, 16, 17] };
const names = () => [...readFileSync('tests/p33-registration-profile.test.mjs', 'utf8').matchAll(/test\('(D2 [^']+)'/g)].map(match => match[1]);
test('public help and invalid closed-group options exit before resource imports', () => {
  const cwd = fixture();
  for (const [args, status] of [[['--help'], 0], [[], 2], [['--group=all'], 2], [['--group=registration', '--group=account'], 2], [['--help', '--group=registration'], 2], [['--group', 'sessions'], 2], [['--group=registration', '--unknown'], 2], [['--group=toString'], 2], [['--group='], 2]]) {
    const run = spawnSync(process.execPath, ['scripts/test-p33-registration-profile.mjs', ...args], { cwd, encoding: 'utf8', timeout: 1500 });
    assert.equal(run.status, status); assert.doesNotMatch(run.stdout + run.stderr, /ERR_MODULE_NOT_FOUND|database cleanup|Mailpit|postgresql:\/\//);
    assert.match(status === 0 ? run.stdout : run.stderr, /--group=<registration\|account\|sessions\|lifecycle>/);
    if (status === 0) { assert.equal(run.stderr, ''); for (const [name, cases] of Object.entries(groups)) assert.ok(run.stdout.includes(`${name}: cases ${cases[0]}–${cases.at(-1)} (${cases.length})`)); }
    else assert.equal(run.stdout, '');
  }
});
test('closed selection covers every original behavior exactly once and preserves registration dependency', () => {
  const cases = names();
  assert.equal(cases.length, 17); assert.equal(new Set(cases).size, 17);
  assert.deepEqual(Object.values(groups).flat(), Array.from({ length: 17 }, (_, i) => i + 1));
  const runner = readFileSync('scripts/test-p33-registration-profile.mjs', 'utf8');
  assert.match(runner, /--test-name-pattern/); assert.doesNotMatch(runner, /for\s*\([^)]*(?:groups|GROUPS)/);
});
test('each public group selects its exact original cases using fresh synthetic helper invocations', () => {
  for (const [group, expected] of Object.entries(groups)) {
    const cwd = fixture();
    writeFileSync(join(cwd, 'scripts/p33-identity-test-env.mjs'), `
      export const identityTestEnvironment = () => ({});
      export function compileIdentityApi() { console.log('Synthetic prerequisite checked'); }
      export async function withIdentityDatabase(run) {
        console.log('Synthetic database opened once');
        await run({ url: 'synthetic-only', name: 'synthetic', container: 'synthetic', deadline: Date.now()+26000 });
      }
    `);
    writeFileSync(join(cwd, 'scripts/mailpit-test-runtime.mjs'), `
      export async function withMailpit(run) {
        console.log('Synthetic inbox opened once');
        await run({ smtpPort: 1, httpOrigin: 'synthetic-only' });
      }
    `);
    mkdirSync(join(cwd, 'tests'));
    writeFileSync(join(cwd, 'tests/p33-registration-profile.test.mjs'), `import { test } from 'node:test';\n` + names().map((name, i) => `test(${JSON.stringify(name)}, () => console.log('EXECUTED_CASE_${i + 1}'));`).join('\n'));
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = spawnSync(process.execPath, ['scripts/test-p33-registration-profile.mjs', `--group=${group}`], { cwd, env, encoding: 'utf8', timeout: 2500 });
    assert.equal(run.status, 0, run.stderr); assert.equal(run.stderr, '');
    assert.deepEqual([...run.stdout.matchAll(/EXECUTED_CASE_(\d+)/g)].map(match => Number(match[1])), expected);
    for (const label of ['Synthetic database opened once', 'Synthetic inbox opened once', 'Synthetic prerequisite checked']) assert.equal(run.stdout.split(label).length - 1, 1);
    assert.match(run.stdout, new RegExp(`Registration/profile group ${group}: exit 0`));
  }
});
