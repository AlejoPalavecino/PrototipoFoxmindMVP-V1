import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { withP4Services } from './p4-services.mjs';
import { withMailpit } from './mailpit-test-runtime.mjs';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';
import { seedActivityLive } from './activity-ai-live-seed.mjs';
import { loadRealAi } from './activity-ai-real-configuration.mjs';
import { freePort, migrateOwned, queryOwned, startWeb, webReady, closeWeb, waitForStop } from './activity-ai-real-runtime.mjs';

const directory = resolve('.test-artifacts/activity-ai-real');
const databaseName = 'activity_ai_real_test';

function environment(runtime, mail, ai, origin) {
  const infra = runtime.infrastructure;
  return { ...identityTestEnvironment(), ...ai, DATABASE_URL: runtime.databaseUrl, APP_ORIGIN: origin,
    MAIL_SMTP_PORT: String(mail.smtpPort), FILES_ENABLED: '1', FILES_S3_ENDPOINT: infra.endpoint,
    FILES_S3_REGION: infra.region, FILES_S3_BUCKET: infra.bucket, FILES_S3_ACCESS_KEY_ID: infra.accessKeyId,
    FILES_S3_SECRET_ACCESS_KEY: infra.secretAccessKey, FILES_SCANNER_HOST: infra.scannerHost,
    FILES_SCANNER_PORT: String(infra.scannerPort), FILES_DRAFT_QUOTA_BYTES: '20000000', CLASSROOMS_ENABLED: '1',
    CLASSROOMS_QUOTA_BYTES: '100000000', CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'),
    CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') };
}

async function confirmNoStartupJobs(runtime) {
  await queryOwned(runtime.databaseUrl, async client => {
    const result = await client.query('SELECT (SELECT count(*) FROM classroom_curriculum_extractions)::int AS extraction, (SELECT count(*) FROM activity_ai_generations)::int AS activity, (SELECT count(*) FROM ai_usage_daily)::int AS usage');
    if (Object.values(result.rows[0]).some(count => count !== 0)) throw new Error('unexpected-startup-ai-job');
    console.log('Owned real activity startup extraction0/activity0/usage0 PASS');
  });
}

async function publishFixture(runtime, mail, origin, ai) {
  const fixture = await seedActivityLive({ origin, inbox: mail.httpOrigin, directory });
  await confirmNoStartupJobs(runtime);
  const stopFile = resolve(directory, `stop-${process.pid}`);
  const fixturePath = resolve(directory, 'browser-fixture.json');
  await writeFile(fixturePath, JSON.stringify({ ...fixture, origin, inbox: mail.httpOrigin, stopFile,
    realProvider: true, databaseName, ownedContainers: runtime.names }));
  const metadata = { origin, inbox: mail.httpOrigin, model: ai.AI_MODEL, keyConfigured: true, realProvider: true, fixturePath };
  await writeFile(resolve(directory, 'metadata.json'), JSON.stringify(metadata));
  console.log(JSON.stringify(metadata));
  console.log('Real activity session ready; no Google call yet. Enter/SIGTERM/owned stop marker cleans this session only.');
  await waitForStop(stopFile);
}

async function runOwned(runtime, mail, ai) {
  let app, web;
  try {
    await migrateOwned(runtime.databaseUrl);
    const { createApplication } = await import('../.build/api/apps/api/src/application.js');
    const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
    const port = await freePort(), origin = `http://127.0.0.1:${port}`;
    const configuration = readConfiguration(environment(runtime, mail, ai, origin));
    app = await createApplication(configuration);
    await app.listen(0, '127.0.0.1');
    web = startWeb(port, `http://127.0.0.1:${app.getHttpServer().address().port}`);
    await webReady(web, origin);
    await publishFixture(runtime, mail, origin, ai);
  } finally {
    try { await closeWeb(web); } finally { await app?.close(); }
  }
}

try {
  const ai = await loadRealAi();
  console.log('Original AI files exist=true keyConfigured=true settingsValid=true');
  await mkdir(directory, { recursive: true });
  await withP4Services(runtime => withMailpit(mail => runOwned(runtime, mail, ai)), { databaseName });
} catch (error) {
  // Never serialize raw SDK/process errors, request URLs, headers or private configuration.
  const safeCategories = ['real-key-missing', 'real-settings-invalid', 'real-key-file-changed', 'owned-database-required',
    'owned-migration-deploy-failed', 'owned-migration-diff-failed', 'owned-history-count',
    'owned-web-readiness', 'owned-web-cleanup', 'unexpected-startup-ai-job'];
  const category = error?.code === 'ENOENT' ? 'authorized-source-path-missing'
    : safeCategories.includes(error?.message) ? error.message : 'owned-runtime-unavailable';
  console.error(JSON.stringify({ category, statusCode: Number.isInteger(error?.status) ? error.status : null }));
  process.exitCode = 1;
}
