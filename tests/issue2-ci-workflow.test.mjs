import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../.github/workflows/issue2-ci.yml', import.meta.url);
const workflow = async () => (await readFile(file, 'utf8')).replace(/^\s*#.*$/gm, '');
const area = (source, begin, end) => { const a = source.search(begin); assert.ok(a >= 0, 'missing block');
  const tail = source.slice(a); const b = tail.search(end); return b < 0 ? tail : tail.slice(0, b); };

test('PR event observes any target branch, including feature bases in stacked PRs', async () => {
  const text = await workflow(), event = area(text, /^on\s*:/m, /^jobs\s*:/m);
  assert.match(event, /^\s{2}pull_request\s*:/m);
  const pr = area(event, /^ {2}pull_request\s*:/m, /\n {2}[a-z_]+\s*:/);
  assert.doesNotMatch(pr, /^\s+(?:branches|branches-ignore|paths|paths-ignore)\s*:/m);
  assert.doesNotMatch(pr, /^\s+types\s*:/m, 'default PR lifecycle must include synchronize');
});

test('pushes to main run only the light verify job; the full suites stay on PRs and manual runs', async () => {
  const text = await workflow(), event = area(text, /^on\s*:/m, /^jobs\s*:/m);
  const push = area(event, /^ {2}push\s*:/m, /\n {2}[a-z_]+\s*:/);
  assert.match(push, /branches\s*:\s*\[\s*main\s*\]/, 'push trigger limited to main');
  assert.match(event, /^ {2}workflow_dispatch\s*:/m, 'manual runs of the whole workflow');
  for (const job of ['integration-owned', 'complete-suite']) {
    const block = area(text, new RegExp(`^ {2}${job}\s*:`, 'm'), /\n {2}[a-z-]+\s*:\s*\n {4}runs-on/);
    assert.match(block, /^ {4}if\s*:\s*github\.event_name\s*!=\s*'push'\s*$/m, `${job} must not run on push`);
  }
  const verify = area(text, /^ {2}verify\s*:/m, /\n {2}integration-owned\s*:/);
  assert.doesNotMatch(verify, /^ {4}if\s*:/m, 'verify runs on every event');
});

test('checkout, supported Node 24 and lockfile install precede API and web checks', async () => {
  const text = await workflow();
  assert.match(text, /uses:\s*actions\/checkout@/); assert.match(text, /uses:\s*actions\/setup-node@/);
  assert.match(text, /node-version:\s*["']?24(?:\.x)?["']?/);
  assert.match(text, /\bnpm\s+ci\b/); assert.match(text, /\bnpm\s+run\s+api:build\b/);
  assert.match(text, /\bnpm\s+run\s+web:build\b/);
  assert.match(text, /\b(?:npx|npm\s+exec)\s+(?:--\s+)?tsc\b[^\n]*(?:apps\/web\/tsconfig\.json|--noEmit)/i);
  assert.ok(text.indexOf('npm ci') < text.indexOf('npm run api:build'));
  assert.ok(text.indexOf('npm run api:build') < text.indexOf('npm run web:build'));
});

test('pulls exact Docker images needed by isolated database, storage and scanner fixtures', async () => {
  const text = await workflow();
  for (const image of ['postgres:17.10-bookworm',
    'chrislusf/seaweedfs:4.48@sha256:4e61d15fd35994cb1e43e1e553dff106794841fd9a99ade2fc8c8bfce4d7872d',
    'clamav/clamav:1.5.4@sha256:638d90201ee7ee6a82d249a2fc23b132e578673b5f1f2766852b127676ca1ef6']) {
    assert.ok(text.includes(`docker pull ${image}`), `missing pull for ${image.split('@')[0]}`);
  }
});

test('feature tests run when present, baseline absence is explicit and never silent green', async () => {
  const text = await workflow();
  assert.match(text, /grading-ai-\*\.test\.mjs/, 'discover all feature tests for this PR revision');
  assert.match(text, /(?:nullglob|find\s+tests|compgen\s+-G)/, 'handle zero files safely');
  assert.match(text, /node\s+.*--test[^\n]*/, 'execute discovered feature tests');
  assert.match(text, /(?:sin pruebas|no grading.ai tests|no .*tests|no hay pruebas)/i, 'explicit baseline message');
  assert.doesNotMatch(text, /continue-on-error\s*:\s*true|\|\|\s*true/, 'test failures must not be suppressed');
});

test('final feature marker requires integration files in the single discovered suite', async () => {
  const text = await workflow();
  assert.match(text, /odd\/tasks\/grading-ai-issue-2\.md/, 'detect final feature marker');
  for (const name of ['grading-ai-integration.test.mjs', 'grading-ai-files-integration.test.mjs']) {
    assert.ok(text.includes(name), `final marker must require ${name}`);
  }
  assert.match(text, /(?:\[\[?\s+![^\n]*-[ef]|if\s+!\s+test\s+-[ef]|\[\[?\s+-[ef])/,
    'check for final integration prerequisites');
  assert.match(text, /\bexit\s+1\b/, 'missing final requirements must fail clearly');
  assert.match(text, /(?:cobertura parcial|partial coverage)/i, 'earlier slices must be explicitly partial');
  assert.match(text, /(?:for\s+[A-Za-z_][A-Za-z_0-9]*\s+in\s+[^\n]*\$\{[A-Za-z_][A-Za-z_0-9]*\[@\]\})/,
    'iterate every discovered feature test including integrations');
  assert.doesNotMatch(text, /node\s+[^\n]*--test[^\n]*grading-ai-(?:files-)?integration\.test\.mjs/,
    'do not run integrations twice outside the complete suite');
});

test('test workflow does not depend on OpenAI credentials or secrets', async () => {
  const text = await workflow();
  assert.doesNotMatch(text, /OPENAI_API_KEY|secrets\s*\.|codex\s+exec/i);
});
import { mkdtemp, mkdir, writeFile, rm, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

// Inventory mirrors the tracked feature files at the established slice 06. It is
// self-contained so the check works on a clean GitHub checkout without local refs.
const slice06 = [
  'src/core/domain/grading/grading-ai.ts',
  ...['enqueue','provider','runtime','snapshot','snapshot-sql','sql-queue'].map(x => `apps/api/src/modules/grading/infrastructure/grading-ai/${x}.ts`),
  ...['grading-ai-attachment-reader','durable-grading-ai-attachment-reader','durable-grading-ai-instruction-reader'].map(x => `apps/api/src/modules/files/custody/infrastructure/${x}.ts`),
  ...['attachment-reader','before-count','contract','durable-reader','enqueue','instruction-reader','provider','runtime','snapshot','sql'].map(x => `tests/grading-ai-${x}.test.mjs`),
];
const finalSlice = [...slice06, 'apps/api/src/modules/grading/assistance/application/grading-ai/service.ts', 'tests/grading-ai-api.test.mjs',
  'tests/grading-ai-preflight.test.mjs', 'tests/grading-ai-lifecycle.test.mjs',
  'tests/grading-ai-integration.test.mjs', 'tests/grading-ai-files-integration.test.mjs', 'odd/tasks/grading-ai-issue-2.md'];
async function runSuiteBlock(files, simulateTimeout = false) {
  const text = await workflow();
  const match = text.match(/- name:\s*Run grading AI suite for this revision\s*\n\s*shell:\s*bash\s*\n\s*run:\s*\|\s*\n((?:(?: {10}[^\n]*|[ \t]*\r?)\n)+)/);
  assert.ok(match, 'feature suite must expose its bash script');
  const script = match[1].replace(/^ {10}/gm, '');
  const root = await mkdtemp(join(tmpdir(), 'issue2-ci-test-'));
  try {
    for (const relative of files) { const path = join(root, relative); await mkdir(dirname(path), { recursive: true }); await writeFile(path, relative === 'apps/api/src/bootstrap/academic-classrooms.module.ts' ? 'GradingAiRuntime' : 'fixture'); }
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
    // Replace node only, preserving Bash's glob, conditions, exit handling and arguments.
    const result = spawnSync(bash, ['-c', `node() { printf 'NODE_ARG:%s\\n' "$@"; }\ntimeout() { printf 'TIMEOUT_ARG:%s\\n' "$1"; ${simulateTimeout ? 'return 124;' : 'shift; "$@";'} }\n${script}`],
      { cwd: root, encoding: 'utf8', timeout: 10000 });
    if (result.error) throw result.error;
    return { code: result.status, output: result.stdout + result.stderr };
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('slice 06 runs present suite and reports partial rather than requiring slice 11', async () => {
  const result = await runSuiteBlock(slice06);
  assert.equal(result.code, 0, result.output); assert.match(result.output, /cobertura parcial/i);
  assert.equal((result.output.match(/TIMEOUT_ARG:360s/g) ?? []).length, 10, 'each test has an independent 360s child deadline');
  assert.match(result.output, /NODE_ARG:tests\/grading-ai-runtime\.test\.mjs/);
  assert.doesNotMatch(result.output, /NODE_ARG:tests\/grading-ai-(?:preflight|lifecycle)\.test\.mjs/);
  const timedOut = await runSuiteBlock(slice06, true);
  assert.notEqual(timedOut.code, 0, 'timeout must fail the feature suite');
  assert.equal((timedOut.output.match(/TIMEOUT_ARG:360s/g) ?? []).length, 1, 'no timeout retries');
});

test('final marker enforces both integration files and executes each once in complete suite', async () => {
  const complete = await runSuiteBlock(finalSlice);
  assert.equal(complete.code, 0, complete.output); assert.doesNotMatch(complete.output, /cobertura parcial/i);
  assert.equal((complete.output.match(/TIMEOUT_ARG:360s/g) ?? []).length, finalSlice.filter(x => /^tests\/grading-ai-.*\.test\.mjs$/.test(x)).length);
  for (const file of ['tests/grading-ai-integration.test.mjs', 'tests/grading-ai-files-integration.test.mjs']) {
    assert.equal(complete.output.split(`NODE_ARG:${file}`).length - 1, 1, `${file} is run once`);
    const missing = await runSuiteBlock(finalSlice.filter(item => item !== file));
    assert.notEqual(missing.code, 0, `missing ${file} must fail`); assert.ok(missing.output.includes(file));
    assert.doesNotMatch(missing.output, /NODE_ARG:/, 'missing final proof cannot launch or pass the suite');
  }
});

test('affected P7/P8 and proxy regressions run serially and propagate test failures', async () => {
  const text = await workflow();
  const match = text.match(/- name:\s*Run affected P7\/P8 regressions\s*\n\s*shell:\s*bash\s*\n\s*run:\s*\|\s*\n((?:(?: {10}[^\n]*|[ \t]*\r?)\n)+)/);
  assert.ok(match, 'missing explicit affected regression step');
  const script = match[1].replace(/^ {10}/gm, '');
  const required = ['p7-authoring', 'p7-practical', 'p7-questionnaire', 'p8-grading', 'p8-publication', 'p8-scoring', 'p5-web-proxy']
    .map(name => `tests/${name}.test.mjs`);
  const root = await mkdtemp(join(tmpdir(), 'issue2-ci-regressions-'));
  try {
    for (const file of required) { const path = join(root, file); await mkdir(dirname(path), { recursive: true }); await writeFile(path, 'fixture'); }
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
    const run = (code, timedOut = false) => spawnSync(bash, ['-c', `node() { printf 'NODE_ARG:%s\\n' "$@"; return ${code}; }\ntimeout() { printf 'TIMEOUT_ARG:%s\\n' "$1"; ${timedOut ? 'return 124;' : 'shift; "$@";'} }\n${script}`],
      { cwd: root, encoding: 'utf8', timeout: 10000 });
    const success = run(0); if (success.error) throw success.error;
    assert.equal(success.status, 0, success.stdout + success.stderr);
    const args = success.stdout.split('\n').filter(x => x.startsWith('NODE_ARG:')).map(x => x.slice('NODE_ARG:'.length).trim());
    assert.equal(args.filter(x => x === '--test').length, required.length);
    assert.equal(args.filter(x => x === '--test-concurrency=1').length, required.length);
    assert.equal((success.stdout.match(/TIMEOUT_ARG:360s/g) ?? []).length, required.length);
    for (const file of required) assert.equal(args.filter(x => x === file).length, 1, `${file} must run once`);
    const failed = run(23); if (failed.error) throw failed.error;
    assert.notEqual(failed.status, 0, 'test runner failure must fail the workflow step');
    assert.equal((failed.stdout.match(/TIMEOUT_ARG:360s/g) ?? []).length, 1, 'no retry on failure');
    const timedOut = run(0, true); if (timedOut.error) throw timedOut.error;
    assert.notEqual(timedOut.status, 0, 'timeout must fail the workflow step');
    assert.equal((timedOut.stdout.match(/TIMEOUT_ARG:360s/g) ?? []).length, 1, 'no retry on timeout');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('Next build is supervised by 180s and propagates timeout', async () => {
  const text = await workflow();
  const match = text.match(/- name:\s*Build web application\s*\n\s*run:\s*([^\n]+)/);
  assert.ok(match); assert.match(match[1], /\btimeout\s+180s\s+npm\s+run\s+web:build\b/);
  const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : 'bash';
  const result = spawnSync(bash, ['-c', `timeout() { printf 'TIMEOUT:%s\\n' "$1"; return 124; }\n${match[1]}`], { encoding: 'utf8', timeout: 10000 });
  if (result.error) throw result.error;
  assert.notEqual(result.status, 0); assert.equal((result.stdout.match(/TIMEOUT:180s/g) ?? []).length, 1);
});

test('instruction reader slice fails closed if its required sensitive-file test is absent', async () => {
  const reader = 'apps/api/src/modules/files/custody/infrastructure/durable-grading-ai-instruction-reader.ts';
  const proof = 'tests/grading-ai-instruction-reader.test.mjs';
  const partial = await runSuiteBlock(slice06.filter(x => x !== proof));
  assert.notEqual(partial.code, 0, `${reader} cannot run without ${proof}`);
  assert.ok(partial.output.includes(proof));
  assert.doesNotMatch(partial.output, /NODE_ARG:/);
});

for (const [source, missing] of [
  ['apps/web/src/features/grading/ai-review/GradingAiReview.tsx', 'tests/grading-ai-review-ui.test.mjs'],
  ['apps/api/src/bootstrap/academic-classrooms.module.ts', 'tests/grading-ai-host.test.mjs'],
  ['apps/api/src/bootstrap/academic-classrooms.module.ts', 'tests/grading-ai-authorization.test.mjs'],
]) test(`${source} requires ${missing} only when introduced`, async () => {
  const files = [...slice06, source,
    ...['tests/grading-ai-review-ui.test.mjs', 'tests/grading-ai-host.test.mjs', 'tests/grading-ai-authorization.test.mjs'].filter(x => x !== missing)];
  const result = await runSuiteBlock(files);
  assert.notEqual(result.code, 0, `${source} must require ${missing}`);
  assert.ok(result.output.includes(missing)); assert.doesNotMatch(result.output, /NODE_ARG:/);
});

test('workflow Bash extraction preserves the full suite block with LF and CRLF line endings', async () => {
  const raw = await readFile(file, 'utf8');
  for (const ending of ['\n', '\r\n']) {
    const source = raw.replace(/\r?\n/g, ending).replace(/^\s*#.*$/gm, '');
    const match = source.match(/- name:\s*Run grading AI suite for this revision\s*\n\s*shell:\s*bash\s*\n\s*run:\s*\|\s*\n((?:(?: {10}[^\n]*|[ \t]*\r?)\n)+)/);
    assert.ok(match, 'script block located');
    assert.match(match[1], /Cobertura parcial/, `complete suite content retained for ${JSON.stringify(ending)}`);
    assert.match(match[1], /grading-ai-integration\.test\.mjs/, 'final integration guard retained');
    assert.match(match[1], /timeout\s+360s\s+node/, 'per-file bounded runner retained');
  }
});
