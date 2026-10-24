import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { withP4Services } from './p4-services.mjs';
import { withMailpit } from './mailpit-test-runtime.mjs';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';

// Synthetic provider only. No environment secret files or Google credentials are read.
const ai = {
  AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'synthetic-live', AI_API_KEY: 'synthetic-only',
  AI_DAILY_ACTOR_REQUESTS: '30', AI_DAILY_GLOBAL_REQUESTS: '100', AI_DAILY_BUDGET_USD: '10',
  AI_MAX_INPUT_TOKENS: '100000', AI_MAX_OUTPUT_TOKENS: '16384', AI_INPUT_USD_PER_MILLION: '1',
  AI_OUTPUT_USD_PER_MILLION: '2', AI_DEADLINE_MS: '90000', AI_MAX_CONCURRENCY: '2',
  AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000',
};
const units = [{ name: 'La luz', topics: [{ name: 'Exposición' }, { name: 'Composición' }] },
  { name: 'La cámara', topics: [{ name: 'Apertura' }, { name: 'Velocidad' }] }];
const provider = {
  async countStudyPlanTokens() { return 200; },
  async extractStudyPlan() {
    await delay(1200);
    return { json: { units, warnings: [] }, inputTokens: 200, outputTokens: 80 };
  },
};
async function freePort() {
  const server = createServer();
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const port = server.address().port;
  await new Promise(done => server.close(done)); return port;
}
async function fixtures(directory) {
  const pdf = await PDFDocument.create(), page = pdf.addPage(), font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText('Unidad 1: La luz\nTemas: Exposicion, Composicion\nUnidad 2: La camara\nTemas: Apertura, Velocidad', { x: 40, y: 740, font, size: 18, lineHeight: 28 });
  const path = resolve(directory, 'plan-sintetico.pdf');
  await writeFile(path, await pdf.save()); return path;
}
await withP4Services(async runtime => withMailpit(async mail => {
  let app, web;
  try {
    for (const args of [['migrate', 'deploy'], ['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code']]) {
      const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], {
        env: { ...process.env, DATABASE_URL: runtime.databaseUrl }, encoding: 'utf8', windowsHide: true, timeout: 60000,
      });
      if (result.status !== 0) {
        if (args[1] === 'diff') process.stdout.write(result.stdout);
        throw new Error(`Owned AI Prisma ${args.join(' ').split(' --')[0]} failed (${result.error?.code ?? result.status})`);
      }
      console.log(`Owned AI Prisma ${args[0]} PASS`);
    }
    const { createApplication } = await import('../.build/api/apps/api/src/application.js');
    const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
    const port = await freePort(), origin = `http://127.0.0.1:${port}`, infra = runtime.infrastructure;
    const configuration = readConfiguration({ ...identityTestEnvironment(), ...ai,
      DATABASE_URL: runtime.databaseUrl, APP_ORIGIN: origin, MAIL_SMTP_PORT: String(mail.smtpPort),
      FILES_ENABLED: '1', FILES_S3_ENDPOINT: infra.endpoint, FILES_S3_REGION: infra.region,
      FILES_S3_BUCKET: infra.bucket, FILES_S3_ACCESS_KEY_ID: infra.accessKeyId, FILES_S3_SECRET_ACCESS_KEY: infra.secretAccessKey,
      FILES_SCANNER_HOST: infra.scannerHost, FILES_SCANNER_PORT: String(infra.scannerPort), FILES_DRAFT_QUOTA_BYTES: '20000000',
      CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '50000000',
      CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'), CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url'),
    });
    app = await createApplication(configuration, { ai: { provider } }); await app.listen(0, '127.0.0.1');
    const apiPort = app.getHttpServer().address().port;
    web = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', 'apps/web', '--hostname', '127.0.0.1', '--port', String(port)], {
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', FOXMIND_API_ORIGIN: `http://127.0.0.1:${apiPort}` }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
    web.stdout.resume(); web.stderr.resume(); web.on('error', () => {});
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (web.exitCode !== null) break;
      try { const response = await fetch(`${origin}/sign-in`, { signal: AbortSignal.timeout(1000) }); await response.arrayBuffer(); if (response.ok) { ready = true; break; } } catch {}
      await delay(200);
    }
    if (!ready) throw new Error('Owned AI web unavailable');
    const directory = resolve('.test-artifacts/ai-live'); await mkdir(directory, { recursive: true });
    const plan = await fixtures(directory);
    const metadata = { origin, inbox: mail.httpOrigin, plan, syntheticProvider: true };
    await writeFile(resolve(directory, 'metadata.json'), JSON.stringify(metadata));
    console.log(JSON.stringify(metadata));
    console.log('AI synthetic live ready; send Enter to stop owned services.');
    await new Promise(done => { process.stdin.resume(); process.stdin.once('data', done); process.once('SIGINT', done); process.once('SIGTERM', done); });
    process.stdin.pause();
  } finally {
    if (web && web.exitCode === null) {
      const stopped = new Promise(done => web.once('exit', done)); web.kill(); await Promise.race([stopped, delay(5000)]);
      if (web.exitCode === null && web.signalCode === null) throw new Error('Owned AI web cleanup failed');
    }
    await app?.close();
  }
}), { databaseName: 'classroom_ai_test' });
