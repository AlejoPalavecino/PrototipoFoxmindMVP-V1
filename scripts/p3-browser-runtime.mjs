import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { withMailpit } from './mailpit-test-runtime.mjs';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';

function docker(args, env = process.env, timeout = 30000) {
  const result = spawnSync('docker', args, { env, encoding: 'utf8', windowsHide: true, timeout });
  if (result.error || result.status !== 0) throw new Error(`P3 owned ${args[0]} unavailable (${result.error?.code ?? result.status})`);
  return result.stdout.trim();
}
async function freePort() {
  const server = createServer(); await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
async function ready(origin, child) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('P3 web process exited before readiness');
    try { const response = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(1500) }); await response.arrayBuffer(); if (response.ok) return; } catch {}
    await delay(100);
  }
  throw new Error('P3 web readiness unavailable');
}

/** Real P3 identity/Next/SQL/SMTP, isolated disposable resources; no synthetic authenticated actors. */
export async function withP3BrowserRuntime(callback) {
  const owner = randomUUID(), name = `foxmind-p3-browser-${owner}`;
  const password = randomBytes(24).toString('hex');
  const env = { ...process.env, POSTGRES_PASSWORD: password };
  let db, api, web, created = false, primaryFailure;
  let webOutput = '';
  try {
    created = true;
    docker(['run', '--detach', '--rm', '--pull=never', '--name', name, '--label', `com.foxmind.p3-browser=${owner}`,
      '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data', '--env', 'POSTGRES_PASSWORD',
      '--env', 'POSTGRES_DB=p3_browser', '--health-cmd', 'pg_isready -U postgres -d p3_browser',
      '--health-interval', '1s', '--health-timeout', '1s', '--health-retries', '15', 'postgres:17.10-bookworm'], env);
    const deadline = Date.now() + 20000;
    let healthy = false;
    while (Date.now() < deadline) {
      const status = docker(['inspect', '--format', '{{.State.Health.Status}}', name], env, 15000);
      if (status === 'healthy') { healthy = true; break; }
      if (status === 'unhealthy') break;
      await delay(100);
    }
    if (!healthy) throw new Error('P3 isolated PostgreSQL readiness unavailable');
    const port = docker(['inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', name], env, 15000);
    const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${port}/p3_browser`;
    db = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 2000, query_timeout: 3000 }); await db.connect();
    for (const entry of readdirSync('prisma/migrations').sort()) {
      if (/^\d+_/.test(entry)) await db.query(readFileSync(`prisma/migrations/${entry}/migration.sql`, 'utf8'));
    }
    return await withMailpit(async ({ smtpPort, httpOrigin }) => {
      const webPort = await freePort(), webOrigin = `http://127.0.0.1:${webPort}`;
      const { createApplication } = await import('../.build/api/apps/api/src/application.js');
      const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
      // Test-only loopback keys exist in memory; restarting the API below reuses them.
      const configuration = readConfiguration({ ...process.env, ...identityTestEnvironment(), DATABASE_URL: databaseUrl,
        APP_ORIGIN: webOrigin, MAIL_SMTP_PORT: String(smtpPort) });
      api = await createApplication(configuration); await api.listen(0, '127.0.0.1');
      const apiPort = api.getHttpServer().address().port;
      const webEnv = { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', FOXMIND_API_ORIGIN: `http://127.0.0.1:${apiPort}` };
      web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '127.0.0.1', '--port', String(webPort)], {
        env: webEnv, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      });
      web.on('error', () => {});
      for (const stream of [web.stdout, web.stderr]) stream.on('data', value => { webOutput = (webOutput + value).slice(-12000); });
      await ready(webOrigin, web);
      try {
        return await callback({ origin: webOrigin, inbox: httpOrigin, db,
          async restartApi() {
            // A real process restart drops every connection. Without this, close() waits on the long-lived
            // streams (such as the AI quota stream) that open browser tabs keep with the API, as in P4.
            const closing = api.close(); api.getHttpServer().closeAllConnections();
            await closing; api = undefined;
            api = await createApplication(configuration); await api.listen(apiPort, '127.0.0.1');
          },
        });
      } catch (error) {
        // Web logs contain only loopback application requests, never fragments/body/keys.
        if (webOutput.includes('Error')) console.error('P3 web process reported an error; public assertions retain the failure');
        throw error;
      }
    });
  } catch (error) { primaryFailure = error; throw error; }
  finally {
    const failures = [];
    async function clean(operation) { try { await operation(); } catch (error) { failures.push(error); } }
    await clean(async () => {
      if (!web) return;
      const stopped = new Promise(resolve => web.once('exit', resolve));
      if (web.exitCode === null) { web.kill(); await Promise.race([stopped, delay(5000)]); }
      if (web.exitCode === null && web.signalCode === null) throw new Error('Owned P3 web shutdown unavailable');
    });
    await clean(async () => { if (api) await api.close(); });
    await clean(async () => { if (db) await db.end(); });
    await clean(async () => {
      if (!created) return;
      const result = spawnSync('docker', ['inspect', '--format', '{{index .Config.Labels "com.foxmind.p3-browser"}}', name], { env, encoding: 'utf8', windowsHide: true, timeout: 10000 });
      if (result.status !== 0 && /No such (object|container)/i.test(result.stderr ?? '')) return;
      if (result.error || result.status !== 0 || result.stdout.trim() !== owner) throw new Error('Refusing to remove unverifiable P3 database');
      docker(['rm', '--force', name], env, 15000);
      console.log('Owned P3 browser database cleanup: exit 0');
    });
    if (failures.length) throw new AggregateError([...(primaryFailure ? [primaryFailure] : []), ...failures], 'P3 runtime cleanup failed');
  }
}
