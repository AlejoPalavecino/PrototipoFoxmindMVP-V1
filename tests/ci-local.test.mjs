import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gitleaksImage, gradingAiPairs, gradingAiRequirements, jobs } from '../scripts/ci-local.mjs';

const workflow = readFileSync(new URL('../.github/workflows/issue2-ci.yml', import.meta.url), 'utf8');
const secretScan = readFileSync(new URL('../.github/workflows/secret-scan.yml', import.meta.url), 'utf8');
const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

test('ci-local covers every GitHub check name of the PR workflows', () => {
  const groups = workflow.match(/group:\s*\[([^\]]+)\]/)[1].split(',').map(value => value.trim());
  const expected = ['verify', 'gitleaks', 'integration-owned (integration-owned)', ...groups.map(group => `complete-suite (${group})`)];
  assert.deepEqual(Object.keys(jobs(root)).sort(), expected.sort());
});

test('ci-local runs the same verify commands, regressions and gitleaks image as CI', () => {
  const labels = jobs(root).verify.map(step => step.label).join('\n');
  for (const script of ['docs:check', 'api:build', 'web:build', 'lint:boundaries']) {
    assert.match(workflow, new RegExp(`npm run ${script}`)); assert.match(labels, new RegExp(script));
  }
  for (const suite of ['pure', 'transport']) assert.match(labels, new RegExp(`suite ${suite}`));
  for (const file of workflow.match(/tests\/p[578]-[a-z-]+\.test\.mjs/g)) assert.match(labels, new RegExp(`regression ${file}`));
  assert.ok(secretScan.includes(gitleaksImage), 'same pinned gitleaks image');
  const pairs = [...workflow.matchAll(/'([^':]+):(tests\/grading-ai-[a-z-]+\.test\.mjs)'/g)].map(match => [match[1], match[2]]);
  assert.deepEqual(gradingAiPairs, pairs);
});

test('grading AI requirements report each implemented slice that lacks its focused proof', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ci-local-test-'));
  try {
    const write = path => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), ''); };
    assert.deepEqual(gradingAiRequirements(dir), []);
    write('src/core/domain/grading/grading-ai.ts');
    write(gradingAiPairs[0][0]);
    assert.deepEqual(gradingAiRequirements(dir), ['tests/grading-ai-contract.test.mjs', gradingAiPairs[0][1]]);
    write('tests/grading-ai-contract.test.mjs'); write(gradingAiPairs[0][1]);
    assert.deepEqual(gradingAiRequirements(dir), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('ci-local rejects an invalid timeout scale before running any job', async () => {
  const { main } = await import('../scripts/ci-local.mjs');
  await assert.rejects(main(['--jobs', 'gitleaks', '--timeout-scale', '0.5']), /FOXMIND_TEST_TIMEOUT_SCALE/);
});

test('npm run ci:local is the documented entry point', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts['ci:local'], 'node scripts/ci-local.mjs');
});
