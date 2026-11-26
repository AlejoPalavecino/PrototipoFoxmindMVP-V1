// Runs the GitHub Actions checks of .github/workflows/issue2-ci.yml and secret-scan.yml on this machine,
// for when hosted runners are unavailable (for example, Actions minutes exhausted). With --publish it
// records each result as a commit status named `local/<job>` on the tested commit, which costs no minutes.
//
// Usage: node scripts/ci-local.mjs [--jobs verify,gitleaks,...] [--install] [--publish] [--repo owner/name]
//                                  [--timeout-scale 1-10] [--full]
// Without --jobs it runs the PR gate (the jobs every PR gets on GitHub); --full adds the manual full-suite jobs.
// --timeout-scale stretches the tight test budgets that read FOXMIND_TEST_TIMEOUT_SCALE (see
// scripts/test-timeout-scale.mjs) and is noted in every published status, so a pass is never mistaken for one at CI limits.
// Run it from the repository root of the commit to validate. It refuses to publish while tracked files differ
// from HEAD, so the status always describes exactly the tested commit.
import { spawnSync } from 'node:child_process';
import { testTimeoutScale } from './test-timeout-scale.mjs';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const node = process.execPath;
const nodeTest = file => [node, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', '--test', '--test-concurrency=1', file], 360_000];
const npm = (args, timeout = 1_800_000) => ({ shell: true, command: `npm ${args}`, timeout });
const images = ['postgres:17.10-bookworm', 'chrislusf/seaweedfs:4.48@sha256:4e61d15fd35994cb1e43e1e553dff106794841fd9a99ade2fc8c8bfce4d7872d',
  'clamav/clamav:1.5.4@sha256:638d90201ee7ee6a82d249a2fc23b132e578673b5f1f2766852b127676ca1ef6'];
const mailpit = ['axllent/mailpit:v1.31.6', 'axllent/mailpit:v1.31.6@sha256:23fe39e81bde596a918000b3135c0f85dc8bb4c9ea6be274b051143f3e300387'];
export const gitleaksImage = 'ghcr.io/gitleaks/gitleaks:v8.24.3@sha256:e1b35e12a8c6fa8901f060459cfb6b2fc4c484d3afbe3b029733a3bbfab07055';

// Each implemented grading-AI slice requires its own focused proof (mirrors the bash step of the workflow).
export const gradingAiPairs = [
  ['apps/api/src/modules/grading/assistance/infrastructure/grading-ai/provider.ts', 'tests/grading-ai-provider.test.mjs'],
  ['apps/api/src/modules/grading/assistance/infrastructure/grading-ai/snapshot.ts', 'tests/grading-ai-snapshot.test.mjs'],
  ['apps/api/src/modules/grading/assistance/infrastructure/grading-ai/sql-queue.ts', 'tests/grading-ai-sql.test.mjs'],
  ['apps/api/src/modules/grading/assistance/infrastructure/grading-ai/runtime.ts', 'tests/grading-ai-runtime.test.mjs'],
  ['apps/api/src/modules/grading/assistance/infrastructure/grading-ai/runtime.ts', 'tests/grading-ai-before-count.test.mjs'],
  ['apps/api/src/modules/grading/assistance/application/grading-ai/service.ts', 'tests/grading-ai-api.test.mjs'],
  ['apps/api/src/modules/files/custody/infrastructure/grading-ai-attachment-reader.ts', 'tests/grading-ai-attachment-reader.test.mjs'],
  ['apps/api/src/modules/files/custody/infrastructure/durable-grading-ai-attachment-reader.ts', 'tests/grading-ai-durable-reader.test.mjs'],
  ['apps/api/src/modules/files/custody/infrastructure/durable-grading-ai-instruction-reader.ts', 'tests/grading-ai-instruction-reader.test.mjs'],
  ['apps/web/src/features/grading/ai-review/GradingAiReview.tsx', 'tests/grading-ai-review-ui.test.mjs'],
];

export function gradingAiRequirements(cwd) {
  const has = path => existsSync(join(cwd, path)), missing = [];
  if (has('src/core/domain/grading/grading-ai.ts') && !has('tests/grading-ai-contract.test.mjs')) missing.push('tests/grading-ai-contract.test.mjs');
  if (has('apps/api/src/modules/grading/assistance/infrastructure/grading-ai/enqueue.ts') && !has('tests/grading-ai-enqueue.test.mjs')) missing.push('tests/grading-ai-enqueue.test.mjs');
  for (const [source, required] of gradingAiPairs) if (has(source) && !has(required)) missing.push(required);
  const host = 'apps/api/src/bootstrap/academic-classrooms.module.ts';
  if (has(host) && readFileSync(join(cwd, host), 'utf8').includes('GradingAiRuntime'))
    for (const required of ['tests/grading-ai-host.test.mjs', 'tests/grading-ai-authorization.test.mjs']) if (!has(required)) missing.push(required);
  if (has('odd/tasks/grading-ai-issue-2.md'))
    for (const required of ['tests/grading-ai-preflight.test.mjs', 'tests/grading-ai-lifecycle.test.mjs', 'tests/grading-ai-integration.test.mjs', 'tests/grading-ai-files-integration.test.mjs'])
      if (!has(required)) missing.push(required);
  return missing;
}

// CI caps web:build at 180 s to stop a hung build; this machine may be slower, so the local cap is 10 min.
const pull = list => list.map(image => ({ command: ['docker', ['pull', image]], timeout: 900_000 }));
const step = (label, run) => ({ label, run });
const command = (label, program, args, timeout) => step(label, () => exec(program, args, timeout));

// Job ids match the GitHub check names; the published context is `local/<id>`.
export function jobs(cwd) {
  const p78 = ['tests/p7-authoring.test.mjs', 'tests/p7-practical.test.mjs', 'tests/p7-questionnaire.test.mjs',
    'tests/p8-grading.test.mjs', 'tests/p8-publication.test.mjs', 'tests/p8-scoring.test.mjs', 'tests/p5-web-proxy.test.mjs'];
  const group = name => [
    ...(name === 'fast' ? [] : pullAll([...images, ...mailpit])),
    command(`test:complete --group ${name}`, node, ['scripts/run-complete-suite.mjs', '--group', name], 18_000_000),
  ];
  return {
    verify: [
      step('docs:check', () => execShell(npm('run docs:check'))),
      step('api:build', () => execShell(npm('run api:build'))),
      command('tsc web', node, ['node_modules/typescript/bin/tsc', '--noEmit', '-p', 'apps/web/tsconfig.json'], 900_000),
      step('web:build', () => execShell(npm('run web:build', 600_000))),
      step('lint:boundaries', () => execShell(npm('run lint:boundaries'))),
      command('suite pure', node, ['scripts/run-ci-suite.mjs', '--suite', 'pure'], 3_600_000),
      command('suite transport', node, ['scripts/run-ci-suite.mjs', '--suite', 'transport'], 3_600_000),
      command('workflow contract', node, ['--test', 'tests/issue2-ci-workflow.test.mjs'], 120_000),
      ...pullAll(images),
      ...p78.map(file => command(`regression ${file}`, ...nodeTest(file))),
      step('grading AI requirements', () => {
        const missing = gradingAiRequirements(cwd);
        return missing.length ? { ok: false, output: `Faltan pruebas requeridas: ${missing.join(', ')}` } : { ok: true, output: 'ok' };
      }),
      ...readdirSync(join(cwd, 'tests')).filter(name => /^grading-ai-.*\.test\.mjs$/.test(name)).sort()
        .map(name => command(`grading AI tests/${name}`, ...nodeTest(`tests/${name}`))),
    ],
    gitleaks: [step('gitleaks (clean export of HEAD)', () => gitleaks(cwd))],
    'integration-owned (integration-owned)': [
      step('api:build', () => execShell(npm('run api:build'))),
      step('web:build', () => execShell(npm('run web:build', 600_000))),
      ...pullAll(images),
      command('suite integration-owned', node, ['scripts/run-ci-suite.mjs', '--suite', 'integration-owned'], 3_000_000),
    ],
    'complete-suite (fast)': group('fast'),
    'complete-suite (critical)': group('critical'),
    'complete-suite (owned-services)': group('owned-services'),
    'full-suite (owned-db)': group('owned-db'),
    'full-suite (owned-browser)': group('owned-browser'),
    'full-suite (wrappers)': group('wrappers'),
  };
  function pullAll(list) { return pull(list).map(({ command: [program, args], timeout }) => command(`docker pull ${args[1]}`, program, args, timeout)); }
}

function exec(program, args, timeout) {
  const result = spawnSync(program, args, { encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  return { ok: result.status === 0 && !result.error, output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}` };
}
function execShell({ command: line, timeout }) {
  const result = spawnSync(line, { shell: true, encoding: 'utf8', timeout, windowsHide: true, maxBuffer: 256 * 1024 * 1024 });
  return { ok: result.status === 0 && !result.error, output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}` };
}
// CI scans a fresh checkout. Locally the work tree can hold ignored secrets (.env), build output and
// node_modules, so the scan runs over `git archive HEAD`, which contains exactly the committed files.
function gitleaks(cwd) {
  const dir = mkdtempSync(join(tmpdir(), 'ci-local-gitleaks-')), archive = join(dir, 'head.tar'), tree = join(dir, 'repo');
  try {
    mkdirSync(tree);
    const exported = exec('git', ['-C', cwd, 'archive', '--format=tar', '-o', archive, 'HEAD'], 300_000);
    if (!exported.ok) return exported;
    // Relative paths from the temp folder: GNU tar reads a drive letter such as `C:` as a remote host.
    const result = spawnSync('tar', ['-xf', 'head.tar', '-C', 'repo'], { cwd: dir, encoding: 'utf8', timeout: 300_000, windowsHide: true });
    const unpacked = { ok: result.status === 0 && !result.error, output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}` };
    if (!unpacked.ok) return unpacked;
    return exec('docker', ['run', '--rm', '-v', `${tree}:/repo:ro`, gitleaksImage, 'detect', '--source', '/repo', '--no-git', '--redact', '--exit-code', '1'], 600_000);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

function git(cwd, ...args) { const r = exec('git', ['-C', cwd, ...args], 60_000); if (!r.ok) throw new Error(r.output.trim()); return r.output.trim(); }
function publish(repo, sha, context, state, description) {
  const r = exec('gh', ['api', '-X', 'POST', `repos/${repo}/statuses/${sha}`, '-f', `state=${state}`, '-f', `context=local/${context}`, '-f', `description=${description.slice(0, 139)}`], 60_000);
  if (!r.ok) console.error(`No se pudo publicar local/${context}: ${r.output.trim()}`);
}
const minutes = ms => `${Math.round(ms / 6000) / 10} min`;

export async function main(argv = process.argv.slice(2), cwd = process.cwd()) {
  const option = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const all = jobs(cwd), selected = option('--jobs')?.split(',').map(value => value.trim())
    ?? Object.keys(all).filter(id => argv.includes('--full') || !id.startsWith('full-suite '));
  for (const id of selected) if (!all[id]) throw new Error(`Trabajo desconocido: ${id}. Disponibles: ${Object.keys(all).join(' | ')}`);
  const sha = git(cwd, 'rev-parse', 'HEAD'), dirty = git(cwd, 'status', '--porcelain', '--untracked-files=no');
  const doPublish = argv.includes('--publish'), repo = option('--repo') ?? 'AlejoPalavecino/PrototipoFoxmindMVP-V1';
  if (doPublish && dirty) throw new Error(`Hay archivos versionados con cambios; no se publica un estado para ${sha.slice(0, 8)} que no describa exactamente ese commit.\n${dirty}`);
  // Stretches only the budgets that read FOXMIND_TEST_TIMEOUT_SCALE; GitHub CI never sets it.
  const scaleValue = option('--timeout-scale');
  if (scaleValue !== undefined) process.env.FOXMIND_TEST_TIMEOUT_SCALE = String(testTimeoutScale({ FOXMIND_TEST_TIMEOUT_SCALE: scaleValue }));
  const scale = testTimeoutScale(), scaleNote = scale === 1 ? '' : ` (tiempos x${scale})`;
  const out = resolve(cwd, '.test-artifacts', 'ci-local'); mkdirSync(out, { recursive: true });
  if (argv.includes('--install')) { const r = execShell(npm('ci', 1_800_000)); if (!r.ok) throw new Error(`npm ci falló\n${r.output.slice(-4000)}`); }
  const summary = { sha, startedAt: new Date().toISOString(), host: process.platform, node: process.version, installed: argv.includes('--install'), timeoutScale: scale, jobs: [] };
  console.log(`CI local sobre ${sha.slice(0, 8)}${scaleNote}: ${selected.join(', ')}`);
  for (const id of selected) {
    if (doPublish) publish(repo, sha, id, 'pending', `Corriendo en la máquina local${scaleNote}`);
    const begin = Date.now(), log = [];
    let failed;
    for (const { label, run } of all[id]) {
      const at = Date.now(), result = run();
      log.push(`$ ${label} (${minutes(Date.now() - at)}) ${result.ok ? 'ok' : 'FALLÓ'}\n${result.output}`);
      if (!result.ok) { failed = label; break; }
    }
    const file = join(out, `${sha.slice(0, 12)}-${id.replace(/[^a-z0-9-]+/gi, '_')}.log`);
    writeFileSync(file, log.join('\n'));
    const elapsed = Date.now() - begin, ok = !failed;
    summary.jobs.push({ id, ok, failedStep: failed ?? null, minutes: Math.round(elapsed / 6000) / 10, log: file });
    console.log(`${ok ? 'PASS' : 'FAIL'} local/${id} en ${minutes(elapsed)}${failed ? ` (falló: ${failed})` : ''}`);
    if (doPublish) publish(repo, sha, id, ok ? 'success' : 'failure', ok ? `Pasó en la máquina local en ${minutes(elapsed)}${scaleNote}` : `Falló en la máquina local${scaleNote}: ${failed}`);
  }
  summary.finishedAt = new Date().toISOString();
  writeFileSync(join(out, `${sha.slice(0, 12)}-summary.json`), JSON.stringify(summary, null, 2));
  return summary.jobs.every(job => job.ok) ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().then(code => { process.exitCode = code; }, error => { console.error(error.message); process.exitCode = 2; });
}
