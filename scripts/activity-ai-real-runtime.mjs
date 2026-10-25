import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { access } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { systemEnvironment } from './activity-ai-real-configuration.mjs';

export async function freePort() {
  const server = createServer();
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done));
  return port;
}

export async function migrateOwned(databaseUrl) {
  if (new URL(databaseUrl).pathname !== '/activity_ai_real_test') throw new Error('owned-database-required');
  for (const args of [['migrate', 'deploy'], ['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']]) {
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
      env: { ...systemEnvironment(), DATABASE_URL: databaseUrl }, encoding: 'utf8', windowsHide: true, timeout: 60000 });
    if (result.error || result.status !== 0) throw new Error(`owned-migration-${args[1]}-failed`);
    console.log(`Owned real activity Prisma ${args[1]} PASS`);
  }
  await queryOwned(databaseUrl, async client => {
    const result = await client.query('SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL');
    if (result.rows[0].count !== 14) throw new Error('owned-history-count');
    console.log('Owned real activity migration history14 PASS');
  });
}

export async function queryOwned(databaseUrl, callback) {
  const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 1000, query_timeout: 3000 });
  try { await client.connect(); return await callback(client); }
  finally { await client.end(); }
}

export function startWeb(port, apiOrigin) {
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '127.0.0.1', '--port', String(port)], {
    env: { ...systemEnvironment(), NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', FOXMIND_API_ORIGIN: apiOrigin },
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.resume(); child.stderr.resume(); child.on('error', () => {});
  return child;
}

export async function webReady(child, origin) {
  for (let attempt = 0; attempt < 100 && child.exitCode === null; attempt++) {
    try {
      const response = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(1000) });
      await response.arrayBuffer(); if (response.ok) return;
    } catch { /* Owned startup only. */ }
    await delay(200);
  }
  throw new Error('owned-web-readiness');
}

export async function closeWeb(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const stopped = new Promise(done => child.once('exit', done)); child.kill();
  await Promise.race([stopped, delay(5000)]);
  if (child.exitCode === null && child.signalCode === null) throw new Error('owned-web-cleanup');
}

export async function waitForStop(stopFile) {
  await new Promise(done => {
    const stop = () => { clearInterval(timer); process.stdin.pause(); done(); };
    const timer = setInterval(() => { void access(stopFile).then(stop, () => {}); }, 1000);
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    process.stdin.resume(); process.stdin.once('data', stop);
  });
}
