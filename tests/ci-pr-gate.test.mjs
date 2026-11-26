import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criticalOwnedFiles } from '../scripts/ci-suites.mjs';

const workflow = readFileSync(new URL('../.github/workflows/issue2-ci.yml', import.meta.url), 'utf8').replace(/^\s*#.*$/gm, '');
const routes = JSON.parse(readFileSync(new URL('../scripts/complete-suite-routes.json', import.meta.url), 'utf8'));
const job = name => workflow.split(new RegExp(`\\n  ${name}:\\s*\\r?\\n`))[1]?.split(/\n  [a-z-]+:\s*\r?\n    runs-on/)[0] ?? '';
const matrix = name => job(name).match(/group:\s*\[([^\]]+)\]/)?.[1].split(',').map(value => value.trim());

test('PR gate runs fast, the critical set and owned services; heavy groups stay manual', () => {
  assert.deepEqual(matrix('complete-suite'), ['fast', 'critical', 'owned-services']);
  assert.deepEqual(matrix('full-suite'), ['owned-db', 'owned-browser', 'wrappers']);
  assert.match(job('complete-suite'), /^ {4}if\s*:\s*github\.event_name\s*!=\s*'push'\s*$/m);
  assert.match(job('full-suite'), /^ {4}if\s*:\s*github\.event_name\s*==\s*'workflow_dispatch'\s*$/m);
  assert.doesNotMatch(job('complete-suite'), /max-parallel:\s*[12]\b/, 'the gate groups must run side by side');
  const covered = new Set([...matrix('complete-suite'), ...matrix('full-suite')]);
  for (const group of ['fast', 'owned-db', 'owned-services', 'owned-browser', 'wrappers']) assert.ok(covered.has(group), `${group} still reachable by hand`);
});

test('critical set is a subset of owned-db that covers identity, files, AI cost and classroom access', () => {
  const ownedDb = new Set(routes.find(route => route.id === 'owned-db').files);
  assert.ok(criticalOwnedFiles.length > 0);
  for (const file of criticalOwnedFiles) assert.ok(ownedDb.has(file), `${file} must stay routed in owned-db`);
  assert.equal(new Set(criticalOwnedFiles).size, criticalOwnedFiles.length, 'no duplicates');
  for (const area of [/files\/custody\//, /ai-quota|monthly-ai|ai-monthly/, /exclusive-account-role/, /p5-enrollment/, /p5-codes/, /grading-ai-authorization/])
    assert.ok(criticalOwnedFiles.some(file => area.test(file)), `critical set must cover ${area}`);
});

test('critical group also runs every identity wrapper route', () => {
  const runner = readFileSync(new URL('../scripts/run-complete-suite.mjs', import.meta.url), 'utf8');
  assert.match(runner, /'critical'/);
  assert.match(runner, /criticalOwnedFiles/);
  assert.ok(routes.filter(route => route.kind === 'wrapper').some(route => route.id.startsWith('p33-')), 'identity wrappers exist');
});
