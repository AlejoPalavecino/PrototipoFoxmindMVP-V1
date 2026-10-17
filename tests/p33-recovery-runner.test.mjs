import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

function fixture() {
  mkdirSync('.test-artifacts/p33-d2-plan-c2-mvb4asm3', { recursive: true });
  const root = mkdtempSync(resolve('.test-artifacts/p33-d2-plan-c2-mvb4asm3/recovery-cli-'));
  mkdirSync(join(root, 'scripts'));
  writeFileSync(join(root, 'scripts/p33-test-process.mjs'), readFileSync('scripts/p33-test-process.mjs'));
  writeFileSync(join(root, 'scripts/test-p33-recovery.mjs'), readFileSync('scripts/test-p33-recovery.mjs'));
  return root;
}
const groups = { request: [1, 2, 3, 4], issuance: [5, 6, 7, 8], confirm: [9, 10, 11, 12, 13, 14, 15, 16] };
const names = () => [...readFileSync('tests/p33-recovery.test.mjs', 'utf8').matchAll(/test\('(R (?:request-core|issuance|confirm) [^']+)'/g)].map(match => match[1]);
test('recovery help and closed invalid options are lazy without compiler or fixture modules', () => {
  const cwd = fixture();
  for (const [args, status] of [[['--help'], 0], [[], 2], [['--group=all'], 2], [['--group=request', '--group=issuance'], 2],
    [['--help', '--group=confirm'], 2], [['--group', 'request'], 2], [['--group=confirm', '--skip-build'], 2],
    [['--reuse-build'], 2], [['--group=toString'], 2], [['--group='], 2]]) {
    const run = spawnSync(process.execPath, ['scripts/test-p33-recovery.mjs', ...args], { cwd, encoding: 'utf8', timeout: 1500 });
    assert.equal(run.status, status); assert.doesNotMatch(run.stdout + run.stderr, /ERR_MODULE_NOT_FOUND|database cleanup|Mailpit|postgresql:\/\//);
    assert.match(status === 0 ? run.stdout : run.stderr, /--group=<request\|issuance\|confirm>/);
    if (status === 0) {
      assert.equal(run.stderr, '');
      for (const [name, cases] of Object.entries(groups)) assert.ok(run.stdout.includes(`${name}: cases ${cases[0]}–${cases.at(-1)} (${cases.length})`));
      assert.match(run.stdout, /90s provisioning, 30s module startup, 26s work/);
    } else assert.equal(run.stdout, '');
  }
});
test('recovery fixed three groups cover every behavior once without auto-redivision', () => {
  const cases = names(); assert.equal(cases.length, 16); assert.equal(new Set(cases).size, 16);
  assert.deepEqual(Object.values(groups).flat(), Array.from({ length: 16 }, (_, i) => i + 1));
  assert.ok(cases.slice(0, 4).every(name => name.startsWith('R request-core ')));
  assert.ok(cases.slice(4, 8).every(name => name.startsWith('R issuance ')));
  assert.ok(cases.slice(8).every(name => name.startsWith('R confirm ')));
  const runner = readFileSync('scripts/test-p33-recovery.mjs', 'utf8');
  assert.match(runner, /--test-name-pattern/); assert.doesNotMatch(runner, /for\s*\([^)]*(?:groups|GROUPS)/);
});
test('recovery standalone groups compile once select exact cases preserve streams and clean on failure', () => {
  for (const [group, expected] of Object.entries(groups)) for (const failed of [false, true]) {
    const cwd = fixture();
    writeFileSync(join(cwd, 'scripts/p33-identity-test-env.mjs'), `
      export const identityTestEnvironment = () => ({});
      export function compileIdentityApi() {
        console.log('Synthetic prerequisite checked'); console.error('Synthetic compiler stderr');
        ${failed ? "throw new Error('controlled prerequisite failure');" : ''}
      }
      export async function withIdentityDatabase(run) {
        console.log('Synthetic database opened once');
        try { await run({ url: 'synthetic', name: 'synthetic', container: 'synthetic', deadline: Date.now()+26000 }); }
        finally { console.log('Synthetic database cleanup'); }
      }
    `);
    writeFileSync(join(cwd, 'scripts/mailpit-test-runtime.mjs'), `
      export async function withMailpit(run) {
        console.log('Synthetic inbox opened once');
        await run({ smtpPort: 1, httpOrigin: 'synthetic' });
      }
    `);
    mkdirSync(join(cwd, 'tests'));
    writeFileSync(join(cwd, 'tests/p33-recovery.test.mjs'), `if(process.send){process.send({type:'foxmind-test-ready'});process.disconnect();}
import { test } from 'node:test';\n` + names().map((name, i) =>
      `test(${JSON.stringify(name)}, () => console.log('EXECUTED_CASE_${i + 1}'));`).join('\n'));
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const run = spawnSync(process.execPath, ['scripts/test-p33-recovery.mjs', `--group=${group}`], { cwd, env, encoding: 'utf8', timeout: 2500 });
    assert.equal(run.status, failed ? 1 : 0, run.stderr);
    assert.equal(run.stdout.split('Synthetic prerequisite checked').length - 1, 1);
    assert.match(run.stdout, /Synthetic database cleanup/);
    if (failed) {
      assert.equal(run.stderr, 'Synthetic compiler stderr\nRecovery runner unavailable (sanitized)\n');
      assert.doesNotMatch(run.stdout, /EXECUTED_CASE|Synthetic inbox/);
    } else {
      assert.equal(run.stderr, 'Synthetic compiler stderr\n');
      assert.deepEqual([...run.stdout.matchAll(/EXECUTED_CASE_(\d+)/g)].map(match => Number(match[1])), expected);
      assert.equal(run.stdout.split('Synthetic inbox opened once').length - 1, 1);
    }
    assert.match(run.stdout, new RegExp(`Recovery group ${group}: exit ${failed ? 1 : 0}`));
  }
});
