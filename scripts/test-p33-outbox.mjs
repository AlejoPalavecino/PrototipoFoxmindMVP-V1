import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';
import pg from 'pg';

// Only this unique, disposable container is addressed. Never load env files,
// Compose, caller DATABASE_URL, development inboxes or persistent volumes.
const started = Date.now();
const deadline = started + 26000;
const name = `foxmind-p33-outbox-${randomBytes(8).toString('hex')}`;
const password = randomBytes(24).toString('hex');
const database = 'foxmind_outbox_test';
const logPath = `.build/p33-outbox/verification-${Date.now()}.log`;
mkdirSync('.build/p33-outbox', { recursive: true });
const evidence = [];
let owned = false;
let result = 1;
let client;
function execute(file, args, env, label, max = 6000) {
  const remaining = Math.min(max, deadline - Date.now());
  if (remaining <= 0) throw new Error('Runner budget exhausted');
  const run = spawnSync(file, args, { encoding: 'utf8', env, timeout: remaining, windowsHide: true });
  // Docker and DB arguments/output are deliberately never persisted.
  if (label) evidence.push(`${label}: exit ${run.status ?? 'unavailable'}${run.error ? ' (process failure/timeout)' : ''}`, run.stdout ?? '', run.stderr ?? '');
  if (run.error || run.status !== 0) throw new Error(`${label ?? 'Owned Docker operation'} failed`);
  return run.stdout.trim();
}
const docker = (...args) => execute('docker', args, { ...process.env, POSTGRES_PASSWORD: password }, undefined);
try {
  execute(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'apps/api/tsconfig.p33-outbox.json'], process.env, 'Private TypeScript compilation', 8000);
  // Assign ownership before run so even a lost response permits name-only cleanup.
  owned = true;
  docker('run', '--detach', '--rm', '--pull=never', '--name', name,
    '--label', 'foxmind.p33-outbox-owned=true', '--publish', '127.0.0.1::5432',
    '--tmpfs', '/var/lib/postgresql/data', '--env', 'POSTGRES_PASSWORD',
    '--env', `POSTGRES_DB=${database}`, '--health-cmd', `pg_isready -U postgres -d ${database}`,
    '--health-interval', '1s', '--health-timeout', '1s', '--health-retries', '10', 'postgres:17.10-bookworm');
  let healthy = false;
  while (Date.now() < deadline - 6000) {
    const state = docker('inspect', '--format', '{{.State.Health.Status}}', name);
    if (state === 'healthy') { healthy = true; break; }
    if (state === 'unhealthy') throw new Error('Owned PostgreSQL unhealthy');
    await setTimeout(150);
  }
  if (!healthy) throw new Error('Owned PostgreSQL readiness budget exhausted');
  const port = docker('inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', name);
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/${database}`;
  client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 1000, query_timeout: 2000 });
  await client.connect();
  for (const dir of readdirSync('prisma/migrations').sort()) {
    if (!/^\d+_/.test(dir)) continue;
    await client.query(readFileSync(`prisma/migrations/${dir}/migration.sql`, 'utf8'));
  }
  await client.end();
  client = undefined;
  evidence.push('Existing migrations: applied to owned PostgreSQL');
  const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/p33-account-mail-outbox.test.mjs'], {
    encoding: 'utf8', timeout: Math.max(1, deadline - Date.now()), windowsHide: true,
    env: { ...process.env, P33_OUTBOX_DATABASE_URL: url, P33_OUTBOX_ISOLATED: name },
  });
  evidence.push(`Public outbox tests: exit ${run.status ?? 'unavailable'}${run.error ? ' (process failure/timeout)' : ''}`);
  evidence.push(run.stdout ?? '', run.stderr ?? '');
  result = run.status ?? 1;
} catch (error) {
  // Never serialize a driver/child-process error (it may include credentials).
  evidence.push(`Runner failed: ${error instanceof Error && /^(Runner budget|Owned |Private TypeScript)/.test(error.message) ? error.message : 'isolated operation unavailable'}`);
} finally {
  if (client) { try { await client.end(); } catch {} }
  if (owned) {
    const cleanup = spawnSync('docker', ['rm', '--force', name], { encoding: 'utf8', timeout: 2000, windowsHide: true });
    evidence.push(`Owned container cleanup: exit ${cleanup.status ?? 'unavailable'}`);
    if (cleanup.status !== 0) result = 1;
  }
  evidence.push(`Elapsed: ${Date.now() - started}ms; runner exit ${result}`);
  writeFileSync(logPath, evidence.join('\n') + '\n');
  console.log(evidence.join('\n'));
  console.log(`Evidence: ${logPath}`);
}
process.exitCode = result;
