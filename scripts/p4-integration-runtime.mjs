import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { withP4Services } from './p4-services.mjs';
import { withMailpit } from './mailpit-test-runtime.mjs';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
function ownedDocker(runtime, action, name) {
  if (!runtime.names.includes(name)) throw new Error('Unowned integration resource');
  const check = spawnSync('docker', ['inspect', '--format', '{{index .Config.Labels "foxmind.p4.owner"}}', name],
    { encoding: 'utf8', windowsHide: true, timeout: 5000 });
  if (check.status !== 0 || check.stdout.trim() !== runtime.owner) throw new Error('Integration resource ownership unavailable');
  const result = spawnSync('docker', [action, name], { encoding: 'utf8', windowsHide: true, timeout: 15000 });
  if (result.status !== 0) throw new Error(`Owned integration ${action} unavailable`);
}

/** Real persisted P3 identity plus owned private services; optional integrated classrooms. */
export async function withP4IntegrationRuntime(callback, { classrooms = false } = {}) {
  return withP4Services(async runtime => {
    let db, api, web;
    const paused = new Set();
    try {
      db = new pg.Client({ connectionString: runtime.databaseUrl, connectionTimeoutMillis: 2000, query_timeout: 5000 });
      await db.connect();
      const migrations = readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).sort();
      if (migrations.length !== 8) throw new Error('Unexpected combined migration inventory');
      const prisma = command => {
        const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...command], {
          env: { ...process.env, DATABASE_URL: runtime.databaseUrl }, encoding: 'utf8', windowsHide: true, timeout: 60000,
        });
        if (result.status !== 0) throw new Error(`Combined Prisma ${command[0]} unavailable (${result.error?.code ?? result.status})`);
        console.log(`Combined Prisma ${command[0]}: exit 0`);
      };
      prisma(['migrate', 'deploy']);
      prisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']);
      const applied = await db.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
      if (JSON.stringify(applied.rows.map(row => row.migration_name)) !== JSON.stringify(migrations)) throw new Error('Combined migration history mismatch');
      return await withMailpit(async ({ smtpPort, httpOrigin }) => {
        const port = await freePort(), origin = `http://127.0.0.1:${port}`, infra = runtime.infrastructure;
        const { createApplication } = await import('../.build/api/apps/api/src/application.js');
        const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
        const configuration = readConfiguration({ ...identityTestEnvironment(), DATABASE_URL: runtime.databaseUrl,
          APP_ORIGIN: origin, MAIL_SMTP_PORT: String(smtpPort), FILES_ENABLED: '1', FILES_S3_ENDPOINT: infra.endpoint,
          FILES_S3_REGION: infra.region, FILES_S3_BUCKET: infra.bucket, FILES_S3_ACCESS_KEY_ID: infra.accessKeyId,
          FILES_S3_SECRET_ACCESS_KEY: infra.secretAccessKey, FILES_SCANNER_HOST: infra.scannerHost,
          FILES_SCANNER_PORT: String(infra.scannerPort), FILES_DRAFT_QUOTA_BYTES: '500000',
          ...(classrooms ? { CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '100000000',
            CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'),
            CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') } : {}) });
        api = await createApplication(configuration); await api.listen(0, '127.0.0.1');
        const apiPort = api.getHttpServer().address().port;
        web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '127.0.0.1', '--port', String(port)], {
          env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', FOXMIND_API_ORIGIN: `http://127.0.0.1:${apiPort}` },
          windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
        });
        web.on('error', () => {});
        // Drain process output without retaining request bodies or credential-bearing configuration.
        web.stdout.resume(); web.stderr.resume();
        const deadline = Date.now() + 30000; let ready = false;
        while (Date.now() < deadline) {
          if (web.exitCode !== null) throw new Error('Owned integration web process exited');
          try { const result = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(1000) }); await result.arrayBuffer(); if (result.ok) { ready = true; break; } } catch {}
          await delay(100);
        }
        if (!ready) throw new Error('Owned integration web readiness unavailable');
        return await callback({ origin, inbox: httpOrigin, get db() { return db; }, migrations,
          async stopInvitationDelivery() {
            if (!classrooms) throw new Error('Classroom host not enabled');
            const { InvitationDeliveryWorker } = await import('../.build/api/apps/api/src/classrooms/delivery.js');
            await api.get(InvitationDeliveryWorker).onModuleDestroy();
          },
          async restartApi() { await api.close(); api = undefined; api = await createApplication(configuration); await api.listen(apiPort, '127.0.0.1'); },
          async restartData() {
            await api.close(); api = undefined; await db.end(); db = undefined;
            await runtime.restartData();
            db = new pg.Client({ connectionString: runtime.databaseUrl, connectionTimeoutMillis: 2000, query_timeout: 5000 }); await db.connect();
            prisma(['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']);
            api = await createApplication(configuration); await api.listen(apiPort, '127.0.0.1');
          },
          pauseScanner() { const name = runtime.names.find(name => name.endsWith('-scan')); ownedDocker(runtime, 'pause', name); paused.add(name); },
          resumeScanner() { for (const name of paused) { ownedDocker(runtime, 'unpause', name); paused.delete(name); } },
        });
      });
    } finally {
      const failures = [];
      const clean = async operation => { try { await operation(); } catch (error) { failures.push(error); } };
      await clean(async () => { for (const name of paused) ownedDocker(runtime, 'unpause', name); });
      await clean(async () => {
        if (!web || web.exitCode !== null) return;
        const exited = new Promise(resolve => web.once('exit', resolve)); web.kill();
        await Promise.race([exited, delay(5000)]);
        if (web.exitCode === null && web.signalCode === null) throw new Error('Owned integration web shutdown unavailable');
      });
      await clean(async () => { if (api) await api.close(); });
      await clean(async () => { await db?.end(); });
      console.log(`P4 integrated process cleanup failures: ${failures.length}`);
      if (failures.length) throw new AggregateError(failures, 'P4 integration process cleanup failed');
    }
  }, { persistent: true });
}
