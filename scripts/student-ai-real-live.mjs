import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, relative, resolve, isAbsolute } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { withP4Services } from './p4-services.mjs';
import { withMailpit } from './mailpit-test-runtime.mjs';
import { identityTestEnvironment } from './p33-identity-test-env.mjs';
import { seedActivityLive } from './activity-ai-live-seed.mjs';
import { loadRealAi, systemEnvironment } from './activity-ai-real-configuration.mjs';
import { freePort, queryOwned, startWeb, webReady, closeWeb, waitForStop } from './activity-ai-real-runtime.mjs';

const db = `student_ai_${randomBytes(6).toString('hex')}_test`;
const root = resolve('.test-artifacts');
const directory = resolve(root, db);
const child = relative(root, directory);
if (!child || child.startsWith('..') || isAbsolute(child) || basename(directory) !== db) throw new Error('owned-directory-guard');
async function migrate(url) {
  if (new URL(url).pathname !== `/${db}`) throw new Error('owned-db-guard');
  for (const args of [['migrate','deploy'], ['migrate','diff','--from-config-datasource','--to-schema','prisma/schema.prisma','--exit-code']]) {
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], { env: { ...systemEnvironment(), DATABASE_URL: url }, encoding: 'utf8', timeout: 60000, windowsHide: true });
    if (result.status !== 0) throw new Error(`migration-${args[1]}-failed`);
    console.log(`Owned migration ${args[1]} PASS`);
  }
}
function actor(origin) {
  const cookies = new Map();
  return async (method, path, body, extra = {}) => {
    async function request(target, options = {}) {
      const headers = new Headers(options.headers); headers.set('origin', origin);
      headers.set('cookie', [...cookies].map(([k,v]) => `${k}=${v}`).join('; '));
      const response = await fetch(`${origin}/api/v1${target}`, { ...options, headers });
      for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0], split = pair.indexOf('='); cookies.set(pair.slice(0,split), pair.slice(split+1)); }
      return response;
    }
    const headers = { 'content-type': 'application/json', ...extra };
    if (method !== 'GET') headers['x-csrf-token'] = (await (await request('/auth/csrf')).json()).csrfToken;
    const response = await request(path, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (!response.ok) throw new Error(`fixture-request-${method}-${response.status}`);
    return response.status === 204 ? null : response.json();
  };
}
async function run(runtime, mail, ai) {
  let app, web;
  try {
    await migrate(runtime.databaseUrl);
    const { createApplication } = await import('../.build/api/apps/api/src/application.js');
    const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
    const port = await freePort(), origin = `http://127.0.0.1:${port}`, infra = runtime.infrastructure;
    const env = { ...identityTestEnvironment(), ...ai, DATABASE_URL: runtime.databaseUrl, APP_ORIGIN: origin,
      MAIL_SMTP_PORT: String(mail.smtpPort), FILES_ENABLED: '1', FILES_S3_ENDPOINT: infra.endpoint,
      FILES_S3_REGION: infra.region, FILES_S3_BUCKET: infra.bucket, FILES_S3_ACCESS_KEY_ID: infra.accessKeyId,
      FILES_S3_SECRET_ACCESS_KEY: infra.secretAccessKey, FILES_SCANNER_HOST: infra.scannerHost,
      FILES_SCANNER_PORT: String(infra.scannerPort), FILES_DRAFT_QUOTA_BYTES: '20000000', CLASSROOMS_ENABLED: '1',
      CLASSROOMS_QUOTA_BYTES: '100000000', CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'),
      CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') };
    app = await createApplication(readConfiguration(env)); await app.listen(0, '127.0.0.1');
    web = startWeb(port, `http://127.0.0.1:${app.getHttpServer().address().port}`); await webReady(web, origin);
    const fixture = await seedActivityLive({ origin, inbox: mail.httpOrigin, directory });
    const teacher = actor(origin), student = actor(origin);
    await teacher('POST','/auth/login',{ email: fixture.teacherEmail, password: fixture.password });
    await student('POST','/auth/login',{ email: fixture.studentEmail, password: fixture.password });
    const root = `/classrooms/${fixture.roomId}`;
    const members = await teacher('GET',`${root}/members`), member = members.find(m => m.firstName === 'Marina');
    assert.ok(member?.studentId); console.log('Synthetic current membership PASS');
    const detail = await teacher('GET',root), revision = async () => (await teacher('GET',root)).revision;
    const change = async operation => teacher('POST',`${root}/activities`,{ revision: await revision(), operation });
    const { id } = await change({ action:'create', type:'ASSIGNMENT' });
    await change({ action:'save', id, payload: { title:'Ejercicio sintético de luz', unitId:detail.units[0].id,
      topicId:detail.units[0].topics[0].id, instructions:'Reconocer la exposición', attachmentRequired:false,
      instructionFileIds:[], materialIds:[], deadline:null, allowLate:true, questions:[] } });
    await change({ action:'publish', id });
    const session = await student('POST',`${root}/activities/${id}/start`,{});
    await delay(1200);
    await student('POST',`${root}/attempts/${session.attempt.id}/submit-practical`,{ revision:session.attempt.revision, confirm:true },
      { 'x-attempt-editor':session.editor.token, 'x-attempt-epoch':session.editor.epoch });
    console.log('Synthetic evidence submitted PASS');
    const reportPath = `${root}/members/${member.studentId}/ai-summary`;
    let result;
    for (let n=0;n<100;n++) {
      result = await teacher('GET',reportPath);
      if (result.state === 'READY' || result.state === 'FAILED') break;
      await delay(2000);
    }
    if (result.state !== 'READY') throw new Error(`report-${result.state}-${result.error ?? 'none'}`);
    assert.ok(result.report?.overview); assert.ok(result.evidenceReferences.some(x => x.ref === 'A1' && x.title === 'Ejercicio sintético de luz'));
    const proof = await queryOwned(runtime.databaseUrl, async c => (await c.query("SELECT state,dispatch_count FROM student_ai_reports WHERE state='READY'")).rows);
    assert.equal(proof.length, 1); assert.equal(proof[0].dispatch_count, 1);
    console.log('Gemini READY, one dispatch, A1 title mapping PASS');
    const stopFile = resolve(directory, 'stop');
    await writeFile(resolve(directory,'fixture.json'), JSON.stringify({ origin, roomId:fixture.roomId, teacherEmail:fixture.teacherEmail, password:fixture.password, stopFile }));
    console.log(JSON.stringify({ status:'browser-ready', fixturePath:resolve(directory,'fixture.json') }));
    await waitForStop(stopFile);
  } finally { try { await closeWeb(web); } finally { await app?.close(); } }
}
try {
  await mkdir(directory, { recursive:true });
  const ai = await loadRealAi();
  await withP4Services(runtime => withMailpit(mail => run(runtime,mail,ai)), { databaseName:db });
} catch (error) {
  const message = String(error?.message ?? 'unknown');
  console.error(JSON.stringify({ category: /^(owned-db-guard|migration-(deploy|diff)-failed|fixture-request-(GET|POST)-\d+|report-[A-Z_]+-[A-Z_]+)$/.test(message) ? message : 'isolated-run-unavailable' }));
  process.exitCode = 1;
} finally { await rm(directory, { recursive:true, force:true }); console.log('Owned fixture directory cleanup complete'); }
