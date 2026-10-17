import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { setTimeout } from 'node:timers/promises';
import pg from 'pg';

// Keys and owned database credentials exist only in process memory.
export function identityTestEnvironment() {
  return {
    APP_ORIGIN: 'http://127.0.0.1:3000', AUTH_LOCAL_HTTP: 'true', NODE_ENV: 'test',
    AUTH_CSRF_HMAC_KEY: randomBytes(32).toString('base64url'),
    AUTH_ABUSE_HMAC_KEY: randomBytes(32).toString('base64url'),
    AUTH_OUTBOX_KEYS_JSON: JSON.stringify({ ephemeral: randomBytes(32).toString('base64') }),
    AUTH_OUTBOX_ACTIVE_KEY_ID: 'ephemeral', MAIL_SMTP_PORT: '1025',
    AUTH_TRUSTED_PROXY_CIDRS: '', AUTH_RATE_LIMITS_JSON: undefined,
  };
}

export function compileIdentityApi(deadline) {
  const run = spawnSync(process.execPath, [createRequire(import.meta.url).resolve('typescript/bin/tsc'), '-p', 'apps/api/tsconfig.json'], {
    env: process.env, encoding: 'utf8', timeout: Math.max(1, Math.min(30000, deadline - Date.now())), windowsHide: true,
  });
  if (run.stdout) process.stdout.write(run.stdout);
  if (run.stderr) process.stderr.write(run.stderr);
  console.log(`API TypeScript compilation: exit ${run.status ?? 'unavailable'}`);
  if (run.error || run.status !== 0) throw new Error('API compilation unavailable');
}

export async function withIdentityDatabase(run) {
  // Provisioning is infrastructure, not the execution budget for product assertions.
  const deadline = Date.now() + 90000;
  const name = `foxmind-identity-${randomBytes(8).toString('hex')}`;
  const password = randomBytes(24).toString('hex');
  const env = { ...process.env, POSTGRES_PASSWORD: password };
  let owned = false;
  let client;
  const docker = (...args) => {
    const result = spawnSync('docker', args, { env, encoding: 'utf8', windowsHide: true, timeout: Math.max(1, Math.min(args[0] === 'run' ? 30000 : 15000, deadline - Date.now())) });
    if (result.error || result.status !== 0) throw new Error('Owned Docker operation unavailable');
    return result.stdout.trim();
  };
  try {
    owned = true;
    const container = docker('run', '--detach', '--rm', '--pull=never', '--name', name,
      '--label', 'foxmind.identity-test-owned=true', '--publish', '127.0.0.1::5432',
      '--tmpfs', '/var/lib/postgresql/data', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=identity_test',
      '--health-cmd', 'pg_isready -U postgres -d identity_test', '--health-interval', '1s',
      '--health-timeout', '1s', '--health-retries', '10', 'postgres:17.10-bookworm');
    let healthy = false;
    while (Date.now() < deadline - 5000) {
      const state = docker('inspect', '--format', '{{.State.Health.Status}}', name);
      if (state === 'healthy') { healthy = true; break; }
      if (state === 'unhealthy') break;
      await setTimeout(100);
    }
    if (!healthy) throw new Error('Owned database readiness unavailable');
    const port = docker('inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', name);
    const url = `postgresql://postgres:${password}@127.0.0.1:${port}/identity_test`;
    client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 1000, query_timeout: 2000 });
    await client.connect();
    for (const entry of readdirSync('prisma/migrations').sort()) {
      if (/^\d+_/.test(entry)) await client.query(readFileSync(`prisma/migrations/${entry}/migration.sql`, 'utf8'));
    }
    await client.end(); client = undefined;
    return await run({ url, container, name, deadline: Date.now() + 30000 });
  } finally {
    if (client) { try { await client.end(); } catch {} }
    if (owned) {
      // Resume only our owned fixture if an outage assertion was interrupted.
      const paused = spawnSync('docker', ['inspect', '--format', '{{.State.Paused}}', name], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
      if (paused.stdout?.trim() === 'true') spawnSync('docker', ['unpause', name], { stdio: 'pipe', windowsHide: true, timeout: 10000 });
      const result = spawnSync('docker', ['rm', '--force', name], { stdio: 'pipe', windowsHide: true, timeout: 15000 });
      console.log(`Owned identity database cleanup: exit ${result.status ?? 'unavailable'}`);
      if (result.status !== 0) throw new Error('Owned database cleanup unavailable');
    }
  }
}
