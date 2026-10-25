import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import { withP4Services } from '../scripts/p4-services.mjs';
import { withMailpit } from '../scripts/mailpit-test-runtime.mjs';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';
import { aiEnvironment, extractionProvider, activityProvider } from '../scripts/activity-ai-live-provider.mjs';

// Dedicated disposable live QA host. Provider and credentials are synthetic only.
export async function withFoxmind3dControlledRuntime(run) {
  return withP4Services(runtime => withMailpit(async mail => {
    let app, web, db;
    try {
      for (const command of [['migrate', 'deploy'], ['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']]) {
        const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...command], {
          env: { ...process.env, DATABASE_URL: runtime.databaseUrl }, encoding: 'utf8', windowsHide: true, timeout: 60000 });
        if (result.status !== 0) throw new Error(`Owned controlled Prisma ${command[1]} unavailable`);
      }
      const reservation = createServer(); await new Promise(resolve => reservation.listen(0, '127.0.0.1', resolve));
      const port = reservation.address().port; await new Promise(resolve => reservation.close(resolve));
      const origin = `http://127.0.0.1:${port}`, infra = runtime.infrastructure;
      const { createApplication } = await import('../.build/api/apps/api/src/application.js');
      const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
      const config = readConfiguration({ ...identityTestEnvironment(), ...aiEnvironment, DATABASE_URL: runtime.databaseUrl, APP_ORIGIN: origin,
        MAIL_SMTP_PORT: String(mail.smtpPort), FILES_ENABLED: '1', FILES_S3_ENDPOINT: infra.endpoint, FILES_S3_REGION: infra.region,
        FILES_S3_BUCKET: infra.bucket, FILES_S3_ACCESS_KEY_ID: infra.accessKeyId, FILES_S3_SECRET_ACCESS_KEY: infra.secretAccessKey,
        FILES_SCANNER_HOST: infra.scannerHost, FILES_SCANNER_PORT: String(infra.scannerPort), FILES_DRAFT_QUOTA_BYTES: '20000000',
        CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '100000000', CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'),
        CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') });
      app = await createApplication(config, { ai: { provider: extractionProvider, activityProvider } }); await app.listen(0, '127.0.0.1');
      db = new pg.Client({ connectionString: runtime.databaseUrl, connectionTimeoutMillis: 2000, query_timeout: 5000 }); await db.connect();
      web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '127.0.0.1', '--port', String(port)], {
        env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', FOXMIND_API_ORIGIN: `http://127.0.0.1:${app.getHttpServer().address().port}` },
        windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      web.stdout.resume(); web.stderr.resume(); web.on('error', () => {});
      let ready = false;
      for (let i = 0; i < 100 && web.exitCode === null; i++) {
        try { const response = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(1000) }); await response.arrayBuffer(); if (response.ok) { ready = true; break; } } catch {}
        await delay(200);
      }
      if (!ready) throw new Error('Owned controlled web unavailable');
      return await run({ origin, inbox: mail.httpOrigin, db });
    } finally {
      if (web && web.exitCode === null) {
        const exited = new Promise(resolve => web.once('exit', resolve)); web.kill(); await Promise.race([exited, delay(5000)]);
        if (web.exitCode === null && web.signalCode === null) throw new Error('Owned controlled web cleanup unavailable');
      }
      await app?.close(); await db?.end();
      console.log('Owned controlled application processes cleaned');
    }
  }), { databaseName: 'foxmind_3d_test' });
}
