import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { withAiDatabase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';

test('A4 actual host protects generation routes with persisted identity, teacher role, Origin and CSRF', { timeout: 120000 }, async t => {
  const { createApplication } = await import('../.build/api/apps/api/src/application.js');
  const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
  const { sessionTokenDigest } = await Promise.all([import("../.build/api/apps/api/src/modules/identity/domain/security/errors.js"),import("../.build/api/apps/api/src/modules/identity/domain/security/inputs.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/verifiers.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/configuration.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/passwords.js"),import("../.build/api/apps/api/src/modules/identity/infrastructure/security/sessions.js"),import("../.build/api/apps/api/src/modules/identity/presentation/session-cookies.js")]).then(([m0,m1,m2,m3,m4,m5,m6]) => Object.freeze({IdentitySecurityError: m0.IdentitySecurityError,validatePassword: m1.validatePassword,validateName: m1.validateName,validateBodyShape: m1.validateBodyShape,assertBodySize: m1.assertBodySize,generateVerifier: m2.generateVerifier,parseVerifier: m2.parseVerifier,accountTokenDigest: m2.accountTokenDigest,sessionTokenDigest: m2.sessionTokenDigest,readIdentityConfiguration: m3.readIdentityConfiguration,createPasswordService: m4.createPasswordService,IDENTITY_POLICY: m5.IDENTITY_POLICY,newSessionWindow: m5.newSessionWindow,sessionIsActive: m5.sessionIsActive,refreshSessionWindow: m5.refreshSessionWindow,sessionCookie: m6.sessionCookie,clearSessionCookie: m6.clearSessionCookie}));
  await withAiDatabase(async local => {
    const config = readConfiguration({ ...identityTestEnvironment(), DATABASE_URL: local.databaseUrl,
      AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'synthetic-activity-host', AI_API_KEY: 'synthetic-only',
      AI_DAILY_ACTOR_REQUESTS: '5', AI_DAILY_GLOBAL_REQUESTS: '20', AI_MAX_INPUT_TOKENS: '100000', AI_MAX_OUTPUT_TOKENS: '16384',
      AI_DAILY_BUDGET_USD: '10', AI_INPUT_USD_PER_MILLION: '1', AI_OUTPUT_USD_PER_MILLION: '2', AI_DEADLINE_MS: '1000',
      AI_MAX_CONCURRENCY: '2', AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000',
      FILES_ENABLED: '1', FILES_S3_ENDPOINT: 'http://127.0.0.1:9', FILES_S3_REGION: 'us-east-1', FILES_S3_BUCKET: 'synthetic-private',
      FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32), FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64), FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: '9',
      FILES_DRAFT_QUOTA_BYTES: '1000000', CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '100000000',
      CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'), CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') });
    let providerCalls = 0;
    const app = await createApplication(config, { ai: { provider: { countStudyPlanTokens: async () => { throw new Error('No extraction authorized'); },
      extractStudyPlan: async () => { throw new Error('No extraction authorized'); } }, activityProvider: {
      countActivityTokens: async () => { providerCalls++; return 20; }, generateActivity: async () => { providerCalls++;
        return { json: { status: 'INSUFFICIENT_CONTENT', missingInformation: ['Falta una definición trabajada en clase.'] }, inputTokens: 20, outputTokens: 10 }; },
    } } });
    try {
      await app.listen(0, '127.0.0.1');
      const origin = `http://127.0.0.1:${app.getHttpServer().address().port}`, f = await fixture(local), tokens = new Map();
      for (const actor of [f.teacher, f.stranger, f.student]) {
        const token = randomBytes(32).toString('base64url'); tokens.set(actor, token);
        await local.pool.query(`INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at) VALUES($1,now(),$2,$3,now()+interval '1 hour')`, [randomUUID(), actor, sessionTokenDigest(token)]);
      }
      const headers = actor => { const token = tokens.get(actor); return { cookie: `foxmind_session=${token}`, origin: config.identity.security.origin,
        'x-csrf-token': config.identity.security.csrfToken(token), 'content-type': 'application/json' }; };
      const base = `/api/v1/classrooms/${f.room}/activity-generations`, start = { ...f.start, sourceIds: [], context: 'Exposición es la luz acumulada durante un intervalo.' };
      const send = (path, method = 'GET', body, h = headers(f.teacher)) => fetch(origin + path, { method, headers: h, ...(body ? { body: JSON.stringify(body) } : {}) });
      await t.test('missing and forged identity cannot list jobs or sources', async () => {
        for (const h of [{}, { 'x-user-id': f.teacher }]) {
          const denied = await send(base, 'GET', undefined, h); assert.equal(denied.status, 401); assert.equal((await denied.json()).error.code, 'AUTH_REQUIRED');
        }
      });
      await t.test('student/other teacher cannot list sources/jobs or start, and no input is sent externally', async () => {
        for (const actor of [f.student, f.stranger]) for (const [path, method, body] of [[base, 'GET'], [`${base}/sources`, 'GET'], [base, 'POST', start]]) {
          const denied = await send(path, method, body, headers(actor)); assert.equal(denied.status, 403); assert.equal(denied.headers.get('cache-control'), 'no-store');
          assert.equal((await denied.json()).error.code, 'FORBIDDEN');
        }
        assert.equal(providerCalls, 0);
      });
      await t.test('wrong Origin and CSRF are rejected before enqueue, while malformed authority is 400', async () => {
        for (const [patch, code] of [[{ origin: 'https://foreign.invalid' }, 'ORIGIN_NOT_ALLOWED'], [{ 'x-csrf-token': 'wrong' }, 'CSRF_INVALID']]) {
          const denied = await send(base, 'POST', start, { ...headers(f.teacher), ...patch });
          assert.equal(denied.status, 403); assert.equal((await denied.json()).error.code, code);
        }
        assert.equal((await send(base, 'POST', { ...start, ownerId: f.teacher })).status, 400);
        assert.equal((await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations')).rows[0].n, 0); assert.equal(providerCalls, 0);
      });
      await t.test('teacher explicit start returns 202 then replay200, recoverable only to teacher', async () => {
        const created = await send(base, 'POST', start); assert.equal(created.status, 202); const job = await created.json(); assert.ok(job.id);
        const replay = await send(base, 'POST', start); assert.equal(replay.status, 200); assert.equal((await replay.json()).id, job.id);
        assert.equal((await send(`${base}/${job.id}`)).status, 200);
        const denied = await send(`${base}/${job.id}`, 'GET', undefined, headers(f.student)); assert.equal(denied.status, 403);
        const privateList = await send(base); assert.equal(privateList.status, 200); assert.equal((await privateList.json()).jobs.length, 1);
        assert.equal((await f.classrooms.listActivities(f.S, f.room)).activities.length, 0);
      });
    } finally { await app.close(); }
  });
});
