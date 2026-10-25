import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { withP4Services } from './p4-services.mjs';
import { withMailpit } from './mailpit-test-runtime.mjs';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';
import { aiEnvironment, extractionProvider, activityProvider } from './activity-ai-live-provider.mjs';
import { seedActivityLive } from './activity-ai-live-seed.mjs';

// Owned disposable services only. Never reads retained .env, user data or provider keys.
const directory = resolve('.test-artifacts/activity-ai-live');
await mkdir(directory, { recursive: true });
async function freePort() {
  const server = createServer();
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port; await new Promise(done => server.close(done)); return port;
}
await withP4Services(async runtime => withMailpit(async mail => {
  let app, web;
  try {
    for (const args of [['migrate', 'deploy'], ['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']]) {
      const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
        env: { ...process.env, DATABASE_URL: runtime.databaseUrl }, encoding: 'utf8', windowsHide: true, timeout: 60000 });
      if (result.status !== 0) { if (args[1] === 'diff') process.stdout.write(result.stdout); throw new Error(`Owned activity Prisma ${args[1]} failed (${result.error?.code ?? result.status})`); }
      console.log(`Owned activity Prisma ${args[1]} PASS`);
    }
    const { createApplication } = await import('../.build/api/apps/api/src/application.js');
    const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
    const port = await freePort(), origin = `http://127.0.0.1:${port}`, infra = runtime.infrastructure;
    const configuration = readConfiguration({ ...identityTestEnvironment(), ...aiEnvironment, DATABASE_URL: runtime.databaseUrl,
      APP_ORIGIN: origin, MAIL_SMTP_PORT: String(mail.smtpPort), FILES_ENABLED: '1', FILES_S3_ENDPOINT: infra.endpoint,
      FILES_S3_REGION: infra.region, FILES_S3_BUCKET: infra.bucket, FILES_S3_ACCESS_KEY_ID: infra.accessKeyId,
      FILES_S3_SECRET_ACCESS_KEY: infra.secretAccessKey, FILES_SCANNER_HOST: infra.scannerHost,
      FILES_SCANNER_PORT: String(infra.scannerPort), FILES_DRAFT_QUOTA_BYTES: '20000000', CLASSROOMS_ENABLED: '1',
      CLASSROOMS_QUOTA_BYTES: '100000000', CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'),
      CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') });
    app = await createApplication(configuration, { ai: { provider: extractionProvider, activityProvider } });
    await app.listen(0, '127.0.0.1');
    web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '127.0.0.1', '--port', String(port)], {
      env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', FOXMIND_API_ORIGIN: `http://127.0.0.1:${app.getHttpServer().address().port}` },
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    web.stdout.resume(); web.stderr.resume(); web.on('error', () => {});
    let ready = false;
    for (let index = 0; index < 100 && web.exitCode === null; index++) {
      try { const response = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(1000) }); await response.arrayBuffer(); if (response.ok) { ready = true; break; } } catch {}
      await delay(200);
    }
    if (!ready) throw new Error('Owned activity web readiness unavailable');
    const fixture = await seedActivityLive({ origin, inbox: mail.httpOrigin, directory });
    const stopFile = resolve(directory, `stop-${process.pid}`);
    await writeFile(resolve(directory, 'browser-fixture.json'), JSON.stringify({ ...fixture, origin, inbox: mail.httpOrigin, stopFile, controlledProvider: true }));
    console.log(`Activity AI controlled live ready: ${origin}; fixture ${resolve(directory, 'browser-fixture.json')}`);
    await new Promise(done => {
      const timer = setInterval(() => { void access(stopFile).then(() => { clearInterval(timer); done(); }, () => {}); }, 1000);
      const stop = () => { clearInterval(timer); done(); };
      process.once('SIGINT', stop); process.once('SIGTERM', stop); process.stdin.resume(); process.stdin.once('data', stop);
    });
    process.stdin.pause();
  } finally {
    if (web && web.exitCode === null) { const stopped = new Promise(done => web.once('exit', done)); web.kill(); await Promise.race([stopped, delay(5000)]); if (web.exitCode === null && web.signalCode === null) throw new Error('Owned activity web cleanup failed'); }
    await app?.close();
  }
}), { databaseName: 'activity_ai_test' });
