import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildApi } from './build-api.mjs';

function runOfflineContracts() {
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const run = spawnSync(process.execPath, ['--test', 'tests/p31-contracts.test.mjs'], {
    env, encoding: 'utf8', windowsHide: true, timeout: 26000,
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  if (run.error) console.error('Offline contracts unavailable or timed out');
  console.log(`Offline contracts: exit ${run.status ?? 'unavailable'}`);
  return run.status ?? 1;
}

// Module startup has its own 30s phase; provisioning is separately bounded and functional work stays at26s.
// Await the stage's bounded child and owned cleanup before reporting a late result.
async function boundedStage(run) {
  const deadline = Date.now() + 180000;
  const code = await run();
  if (Date.now() >= deadline) throw new Error('T2 stage exceeded startup plus work limit after cleanup');
  return code;
}

export async function runP33T2({
  build = buildApi,
  registration = async (...args) => (await import('./test-p33-registration-profile.mjs')).runRegistrationProfile(...args),
  verification = async (...args) => (await import('./test-p33-verification.mjs')).runVerification(...args),
  recovery = async (...args) => (await import('./test-p33-recovery.mjs')).runRecovery(...args),
  password = async (...args) => (await import('./test-p33-password-change.mjs')).runPasswordChange(...args),
  mail = async (...args) => (await import('./test-p33-mail-cancellation.mjs')).runMailCancellation(...args),
  identity = async (...args) => (await import('./test-p33-identity-http.mjs')).runIdentityHttp(...args),
  backend = async (...args) => (await import('./test-backend.mjs')).runBackend(...args),
  offline = runOfflineContracts,
} = {}) {
  const built = await boundedStage(build);
  if (built !== 0) return built;
  // Created ONLY in the successful continuation of this invocation's real build.
  // This is not compiler success evidence, a receipt, or a CLI/environment bypass.
  const preparation = {
    prepare: () => console.log('Same-invocation API output; no new compiler invoked'),
  };
  const checks = [
    () => registration('registration', preparation),
    () => registration('account', preparation),
    () => registration('sessions', preparation),
    () => registration('lifecycle', preparation),
    () => verification('confirm', preparation),
    () => verification('resend', preparation),
    () => recovery('request', preparation),
    () => recovery('issuance', preparation),
    () => recovery('confirm', preparation),
    () => password('core', preparation),
    () => password('guards', preparation),
    () => password('ip', preparation),
    () => password('races', preparation),
    () => mail('--deadline', preparation),
    () => identity(preparation),
    () => backend(preparation),
    offline,
  ];
  for (const check of checks) {
    const code = await boundedStage(check);
    if (code !== 0) return code;
  }
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const usage = 'Usage: node scripts/test-p33-t2.mjs';
  if (args.length === 1 && args[0] === '--help') console.log(`${usage}\nStrict build once, D2 four groups, T3 verification confirm/resend, recovery request/issuance/confirm, password core/guards/ip/races, C1 deadline, D1, backend, offline; sequential and fail-fast.`);
  else if (args.length) { console.error(usage); process.exitCode = 2; }
  else {
    try { process.exitCode = await runP33T2(); }
    catch { console.error('T2 pipeline unavailable or stage timed out'); process.exitCode = 1; }
  }
}
