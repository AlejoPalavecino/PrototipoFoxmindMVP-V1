import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { identityTestEnvironment } from '../scripts/p33-identity-test-env.mjs';
import { createApplication } from '../.build/api/apps/api/src/application.js';
import { readConfiguration } from '../.build/api/apps/api/src/configuration.js';
import { PrismaService } from '../.build/api/apps/api/src/platform/database/prisma.service.js';
import { generateVerifier, sessionTokenDigest } from '../.build/api/apps/api/src/modules/identity/accounts/infrastructure/security/verifiers.js';
import { reserveAiMonthlyBudget, settleAiMonthlyBudget } from '../.build/api/apps/api/src/platform/ai/monthly-budget.js';

async function* snapshots(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const message = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      const data = /^id: (\d+)\ndata: (.+)$/m.exec(message);
      if (data) {
        const snapshot = JSON.parse(data[2]);
        assert.equal(snapshot.version, Number(data[1]));
        yield snapshot;
      }
    }
  }
}

test('monthly quota HTTP streams committed reservations and settlement only to the owner', { timeout: 90_000 }, async () => {
  await withAgendaDatabase(async ({ pool, databaseUrl }) => {
    async function account(role) {
      const id = randomUUID(), sessionId = randomUUID(), secret = generateVerifier();
      await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,'Synthetic','Quota','no-login',now(),$3)`, [id, `${id}@example.invalid`, role]);
      await pool.query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at)
        VALUES($1,$2,$3,now()+interval '1 hour',now())`, [sessionId, id, sessionTokenDigest(secret)]);
      return { id, sessionId, headers: { cookie: `foxmind_session=${secret}` } };
    }
    const teacher = await account('teacher'), student = await account('student');
    const app = await createApplication(readConfiguration({ ...identityTestEnvironment(), DATABASE_URL: databaseUrl, API_PORT: '0' }));
    const scope = new AbortController();
    try {
      await app.listen(0, '127.0.0.1');
      const endpoint = `http://127.0.0.1:${app.getHttpServer().address().port}/api/v1/ai-quota`;
      const signal = AbortSignal.any([scope.signal, AbortSignal.timeout(15_000)]);
      const get = (actor, suffix = '') => fetch(endpoint + suffix, { headers: actor?.headers, signal });
      const database = app.get(PrismaService);
      const tx = operation => database.$transaction(raw => operation({ query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) }));
      const reserve = (job, capability) => tx(transaction => reserveAiMonthlyBudget(transaction, job, 250_000n, {
        capability, provider: 'gemini', model: 'synthetic', pricing: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      }));
      const balance = (value, actor, limit, reserved, consumed) => {
        assert.equal(value.subjectId, actor.id);
        assert.equal(value.limitMicrousd, limit);
        assert.equal(value.reservedMicrousd, reserved);
        assert.equal(value.consumedMicrousd, consumed);
        assert.equal(value.remainingMicrousd, limit - reserved - consumed);
      };
      const open = async actor => {
        const response = await get(actor, '/events');
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type'), /^text\/event-stream/);
        return snapshots(response.body);
      };
      assert.equal((await get()).status, 401);
      assert.equal((await get(teacher, `?ownerId=${student.id}`)).status, 400);
      const teacherGet = await get(teacher);
      assert.equal(teacherGet.status, 200);
      assert.equal(teacherGet.headers.get('cache-control'), 'no-store');
      balance(await teacherGet.json(), teacher, 5_000_000, 0, 0);
      const [first, second, other] = await Promise.all([open(teacher), open(teacher), open(student)]);
      for (const event of await Promise.all([first.next(), second.next()])) balance(event.value, teacher, 5_000_000, 0, 0);
      balance((await other.next()).value, student, 3_000_000, 0, 0);
      const teaching = { ownerId: teacher.id, namespace: 'foxy_turns', jobId: randomUUID() };
      assert.equal(await reserve(teaching, 'foxy'), true);
      for (const event of await Promise.all([first.next(), second.next()])) {
        balance(event.value, teacher, 5_000_000, 250_000, 0);
        assert.deepEqual(event.value.tools, [{ capability: 'foxy', consumedMicrousd: 0, reservedMicrousd: 250_000,
          chargedOperations: 0, reservedOperations: 1 }]);
      }
      await tx(transaction => settleAiMonthlyBudget(transaction, teaching, 160_000n));
      for (const event of await Promise.all([first.next(), second.next()])) {
        balance(event.value, teacher, 5_000_000, 0, 160_000);
        assert.deepEqual(event.value.tools, [{ capability: 'foxy', consumedMicrousd: 160_000, reservedMicrousd: 0,
          chargedOperations: 1, reservedOperations: 0 }]);
      }
      balance(await (await get(student)).json(), student, 3_000_000, 0, 0);
      assert.equal(await reserve({ ownerId: student.id, namespace: 'study_image', jobId: randomUUID() }, 'study_image'), true);
      // The student's next frame must be its own even after two committed teacher movements.
      const nextStudent = (await other.next()).value;
      balance(nextStudent, student, 3_000_000, 250_000, 0);
      assert.deepEqual(nextStudent.tools, [{ capability: 'study_image', consumedMicrousd: 0, reservedMicrousd: 250_000,
        chargedOperations: 0, reservedOperations: 1 }]);
      await pool.query('UPDATE sessions SET revoked_at=clock_timestamp() WHERE id=$1', [teacher.sessionId]);
      for (const event of await Promise.all([first.next(), second.next()])) assert.equal(event.done, true);
      assert.equal((await get(teacher)).status, 401);
      balance(await (await get(student)).json(), student, 3_000_000, 250_000, 0);
      await other.return();
    } finally {
      scope.abort();
      app.getHttpServer().closeAllConnections();
      await app.close();
    }
  });
});
