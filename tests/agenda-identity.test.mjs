import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';

const payload = { title: 'Privado', description: '', category: 'CLASS',
  schedule: { kind: 'ALL_DAY', startDate: '2026-11-02', endDateExclusive: '2026-11-03' }, repeat: { kind: 'NONE' } };
const webOrigin = 'http://127.0.0.1:3000';
test('agenda actual HTTP authenticates persisted sessions, applies Origin/CSRF and isolates account owners', { timeout: 60000 }, async () => {
  const { createApplication } = await import('../.build/api/apps/api/src/application.js');
  const { readConfiguration } = await import('../.build/api/apps/api/src/configuration.js');
  const { generateVerifier, sessionTokenDigest } = await import('../.build/api/apps/api/src/identity-security/index.js');
  await withAgendaDatabase(async ({ pool, databaseUrl }) => {
    const app = await createApplication(readConfiguration({ ...identityTestEnvironment(), DATABASE_URL: databaseUrl, API_PORT: '0' }));
    try {
      await app.listen(0, '127.0.0.1'); const origin = `http://127.0.0.1:${app.getHttpServer().address().port}`;
      const users = [];
      for (const verified of [true, true, false]) {
        const id = randomUUID(), session = randomUUID(), token = generateVerifier();
        await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
          VALUES($1,now(),$2,$2,'Agenda','HTTP','not-login',CASE WHEN $3 THEN now() ELSE NULL END,'teacher')`, [id, `${id}@example.invalid`, verified]);
        await pool.query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at)
          VALUES($1,$2,$3,now()+interval '1 hour',now())`, [session, id, sessionTokenDigest(token)]);
        users.push({ id, session, cookie: `foxmind_session=${token}` });
      }
      const [A, B, unverified] = users;
      const send = async (actor, path, method = 'GET', body, overrides = {}) => {
        const response = await fetch(origin + '/api/v1' + path, { method,
          headers: { ...(actor ? { cookie: actor.cookie } : {}), origin: webOrigin, 'content-type': 'application/json',
            ...(actor?.csrf ? { 'x-csrf-token': actor.csrf } : {}), ...overrides },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(4000) });
        assert.equal(response.headers.get('cache-control'), 'no-store'); return response;
      };
      for (const actor of users) {
        const response = await send(actor, '/auth/csrf'); assert.equal(response.status, 200);
        actor.csrf = (await response.json()).csrfToken;
      }
      const id = randomUUID(), path = `/agenda/events/${id}`;
      assert.equal((await send(A, path, 'PUT', payload)).status, 201);
      assert.equal((await send(A, path, 'PUT', payload)).status, 200);
      assert.equal((await send(B, path)).status, 403);
      assert.equal((await send(B, `/agenda/events/${randomUUID()}`)).status, 403);
      assert.equal((await send(B, path, 'PATCH', { revision: '0', event: payload })).status, 403);
      assert.equal((await send(B, path, 'DELETE', { revision: '0' })).status, 403);
      const bRange = await send(B, '/agenda?startDate=2026-11-01&endDateExclusive=2026-12-01&timeZone=UTC');
      assert.equal(bRange.status, 200); assert.deepEqual((await bRange.json()).items, []);
      for (const headers of [{ origin: 'http://evil.test' }, { 'x-csrf-token': 'wrong' }, { 'x-csrf-token': B.csrf }])
        assert.equal((await send(A, path, 'PATCH', { revision: '0', event: payload }, headers)).status, 403);
      assert.equal((await send(null, path)).status, 401);
      assert.equal((await send(unverified, path, 'PUT', payload)).status, 403);
      await pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1', [A.session]);
      assert.equal((await send(A, path)).status, 401);
      await pool.query("UPDATE sessions SET created_at=now()-interval '2 hours',last_seen_at=now()-interval '1 hour',expires_at=now()-interval '1 minute' WHERE id=$1", [B.session]);
      assert.equal((await send(B, '/agenda/upcoming')).status, 401);
      const rows = (await pool.query('SELECT owner_id,title,revision::text FROM agenda_events WHERE id=$1', [id])).rows;
      assert.deepEqual(rows, [{ owner_id: A.id, title: payload.title, revision: '0' }]);
    } finally { await app.close(); }
  });
});
