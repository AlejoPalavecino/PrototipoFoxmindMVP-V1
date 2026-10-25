import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { withAiDatabase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';

test('A04 actual authenticated host reports aggregate source size as stable client AI_INPUT_LIMIT before enqueue', { timeout: 120000 }, async () => {
  const { createApplication } = await import('../.build/api/apps/api/src/application.js');
  const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
  const { sessionTokenDigest } = await import('../.build/api/apps/api/src/identity-security/index.js');
  await withAiDatabase(async local => {
    const config = readConfiguration({ ...identityTestEnvironment(), DATABASE_URL: local.databaseUrl,
      AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'synthetic-limit-host', AI_API_KEY: 'synthetic-only',
      AI_DAILY_ACTOR_REQUESTS: '5', AI_DAILY_GLOBAL_REQUESTS: '20', AI_MAX_INPUT_TOKENS: '100000', AI_MAX_OUTPUT_TOKENS: '16384',
      AI_DAILY_BUDGET_USD: '10', AI_INPUT_USD_PER_MILLION: '1', AI_OUTPUT_USD_PER_MILLION: '2', AI_DEADLINE_MS: '1000',
      AI_MAX_CONCURRENCY: '2', AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000',
      FILES_ENABLED: '1', FILES_S3_ENDPOINT: 'http://127.0.0.1:9', FILES_S3_REGION: 'us-east-1', FILES_S3_BUCKET: 'synthetic-private',
      FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32), FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64), FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: '9',
      FILES_DRAFT_QUOTA_BYTES: '1000000', CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '100000000',
      CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'), CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') });
    const f = await fixture(local), sourceIds = [];
    for (let n = 0; n < 2; n++) {
      const file = randomUUID(), material = randomUUID(), digest = String(n + 1).repeat(64), size = 10000001;
      await local.pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,
        detected_mime_type,size_bytes,validation_status,scan_status,validated_at,scanned_at)
        VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf','application/pdf',$5,'APPROVED','CLEAN',now(),now())`, [file, f.room, f.teacher, `synthetic/${file}`, size]);
      await local.pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at)
        VALUES($1,now(),$2,'COMPLETED',$3,now())`, [randomUUID(), file, size]);
      await local.pool.query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
        VALUES($1,'material','ready',$2,$2,$2)`, [file, digest]);
      await local.pool.query(`INSERT INTO materials(id,classroom_id,title,file_id,created_by_id) VALUES($1,$2,$3,$4,$5)`,
        [material, f.room, `Synthetic large source ${n}`, file, f.teacher]);
      sourceIds.push(`material:${material}`);
    }
    const token = randomBytes(32).toString('base64url');
    await local.pool.query(`INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at)
      VALUES($1,now(),$2,$3,now()+interval '1 hour')`, [randomUUID(), f.teacher, sessionTokenDigest(token)]);
    let providerCalls = 0;
    const noDispatch = async () => { providerCalls++; throw new Error('Oversize input must never dispatch'); };
    const app = await createApplication(config, { ai: { provider: { countStudyPlanTokens: noDispatch, extractStudyPlan: noDispatch },
      activityProvider: { countActivityTokens: noDispatch, generateActivity: noDispatch } } });
    try {
      await app.listen(0, '127.0.0.1');
      const origin = `http://127.0.0.1:${app.getHttpServer().address().port}`;
      const response = await fetch(`${origin}/api/v1/classrooms/${f.room}/activity-generations`, { method: 'POST',
        headers: { cookie: `foxmind_session=${token}`, origin: config.identity.security.origin,
          'x-csrf-token': config.identity.security.csrfToken(token), 'content-type': 'application/json' },
        body: JSON.stringify({ ...f.start, sourceIds }) });
      const body = await response.json();
      assert.equal(response.status, 400, `Expected client limit, observed ${response.status}/${body.error?.code}`);
      assert.equal(body.error.code, 'AI_INPUT_LIMIT'); assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations')).rows[0].n, 0);
      assert.equal(providerCalls, 0);
    } finally { await app.close(); }
  });
});
