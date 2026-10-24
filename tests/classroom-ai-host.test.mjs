import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { withAiDatabase, aiFixture } from './classroom-ai-database.test.mjs';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';

const aiEnvironment = {
  AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'gemini-host-fixture', AI_API_KEY: 'synthetic-only',
  AI_DAILY_ACTOR_REQUESTS: '5', AI_DAILY_GLOBAL_REQUESTS: '20', AI_MAX_INPUT_TOKENS: '100000', AI_MAX_OUTPUT_TOKENS: '16384',
  AI_DAILY_BUDGET_USD: '10', AI_INPUT_USD_PER_MILLION: '1', AI_OUTPUT_USD_PER_MILLION: '2',
  AI_DEADLINE_MS: '90000', AI_MAX_CONCURRENCY: '2', AI_MAX_DISPATCHES: '2', AI_MAX_JOB_AGE_MS: '300000',
};

test('C4 actual application AI composition preserves persisted session, Origin and CSRF gates', { timeout: 120000 }, async t => {
  const { createApplication } = await import('../.build/api/apps/api/src/application.js');
  const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
  const { sessionTokenDigest } = await import('../.build/api/apps/api/src/identity-security/index.js');
  await withAiDatabase(async ({ pool, databaseUrl }) => {
    const configuration = readConfiguration({ ...identityTestEnvironment(), ...aiEnvironment, DATABASE_URL: databaseUrl,
      FILES_ENABLED: '1', FILES_S3_ENDPOINT: 'http://127.0.0.1:9', FILES_S3_REGION: 'us-east-1',
      FILES_S3_BUCKET: 'synthetic-private', FILES_S3_ACCESS_KEY_ID: 'a'.repeat(32), FILES_S3_SECRET_ACCESS_KEY: 'b'.repeat(64),
      FILES_SCANNER_HOST: '127.0.0.1', FILES_SCANNER_PORT: '9', FILES_DRAFT_QUOTA_BYTES: '1000000',
      CLASSROOMS_ENABLED: '1', CLASSROOMS_QUOTA_BYTES: '1000000', CLASSROOMS_SIGNING_KEY: randomBytes(32).toString('base64url'),
      CLASSROOMS_DELIVERY_KEY: randomBytes(32).toString('base64url') });
    assert.equal(configuration.ai?.model, 'gemini-host-fixture', 'Root configuration must opt in AI explicitly');
    let providerCalls = 0;
    const provider = { countStudyPlanTokens: async () => { providerCalls++; return 20; },
      extractStudyPlan: async () => { providerCalls++; throw new Error('Provider must not receive unauthorized input'); } };
    const app = await createApplication(configuration, { ai: { provider } });
    try {
      await app.listen(0, '127.0.0.1');
      const origin = `http://127.0.0.1:${app.getHttpServer().address().port}`;
      const f = await aiFixture(pool), unverified = await aiFixture(pool, { verified: false });
      const sessions = [];
      for (const actor of [f.ownerId, f.strangerId, unverified.ownerId]) {
        const token = randomBytes(32).toString('base64url');
        await pool.query(`INSERT INTO sessions(id,updated_at,user_id,token_hash,expires_at)
          VALUES($1,now(),$2,$3,now()+interval '1 hour')`, [randomUUID(), actor, sessionTokenDigest(token)]);
        sessions.push(token);
      }
      const headers = token => ({ cookie: `foxmind_session=${token}`, origin: configuration.identity.security.origin,
        'x-csrf-token': configuration.identity.security.csrfToken(token), 'content-type': 'application/json' });
      const route = `/api/v1/classrooms/drafts/${f.draftId}/curriculum-extractions`;
      const read = suffix => `/api/v1/classrooms/drafts/${f.draftId}/curriculum-extractions/${suffix}`;
      await t.test('same AI-enabled host creates and reloads owner-private agenda color', async () => {
        const eventId = randomUUID(), path = `/api/v1/agenda/events/${eventId}`;
        const event = { title: 'Coexisting agenda', description: '', category: 'CLASS', color: 'PURPLE',
          schedule: { kind: 'ALL_DAY', startDate: '2026-11-02', endDateExclusive: '2026-11-03' }, repeat: { kind: 'NONE' } };
        const created = await fetch(origin + path, { method: 'PUT', headers: headers(sessions[0]), body: JSON.stringify(event) });
        assert.equal(created.status, 201);
        const saved = await fetch(origin + path, { headers: headers(sessions[0]) });
        assert.equal(saved.status, 200);
        assert.equal(saved.headers.get('cache-control'), 'no-store');
        assert.equal((await saved.json()).color, 'PURPLE');
        const foreign = await fetch(origin + path, { headers: headers(sessions[1]) });
        assert.equal(foreign.status, 403);
        assert.deepEqual((await pool.query('SELECT owner_id,color FROM agenda_events WHERE id=$1', [eventId])).rows,
          [{ owner_id: f.ownerId, color: 'PURPLE' }]);
        assert.equal(providerCalls, 0, 'Agenda traffic cannot dispatch the AI provider');
      });
      const before = JSON.stringify((await pool.query('SELECT payload FROM classroom_drafts ORDER BY id')).rows);
      await t.test('missing/forged sessions and unverified actor return trusted identity errors', async () => {
        for (const [requestHeaders, code, status] of [[{}, 'AUTH_REQUIRED', 401],
          [{ 'x-user-id': f.ownerId }, 'AUTH_REQUIRED', 401], [headers(sessions[2]), 'EMAIL_VERIFICATION_REQUIRED', 403]]) {
          const response = await fetch(origin + read(randomUUID()), { headers: requestHeaders });
          assert.equal(response.status, status); assert.equal((await response.json()).error.code, code);
          assert.equal(response.headers.get('cache-control'), 'no-store');
        }
      });
      await t.test('mutations reject wrong Origin and CSRF before enqueuing', async () => {
        for (const [patch, code] of [[{ origin: 'https://foreign.invalid' }, 'ORIGIN_NOT_ALLOWED'], [{ 'x-csrf-token': 'wrong' }, 'CSRF_INVALID']]) {
          const response = await fetch(origin + route, { method: 'POST', headers: { ...headers(sessions[0]), ...patch }, body: JSON.stringify(f.start) });
          assert.equal(response.status, 403); assert.equal((await response.json()).error.code, code);
        }
      });
      await t.test('authorized foreign actor cannot discover drafts; malformed input is not a job', async () => {
        const denied = await fetch(origin + route, { method: 'POST', headers: headers(sessions[1]), body: JSON.stringify(f.start) });
        assert.equal(denied.status, 403);
        const malformed = await fetch(origin + route, { method: 'POST', headers: headers(sessions[0]), body: JSON.stringify({ ...f.start, ownerId: f.ownerId }) });
        assert.equal(malformed.status, 400);
        assert.equal((await pool.query('SELECT count(*)::int n FROM classroom_curriculum_extractions')).rows[0].n, 0);
        assert.equal(providerCalls, 0);
        assert.equal(JSON.stringify((await pool.query('SELECT payload FROM classroom_drafts ORDER BY id')).rows), before);
      });
    } finally { await app.close(); }
    assert.equal(providerCalls, 0, 'Lifecycle closes without dispatching unauthorized work');
  });
});
