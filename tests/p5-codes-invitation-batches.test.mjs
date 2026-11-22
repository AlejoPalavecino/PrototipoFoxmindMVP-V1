import test from 'node:test';
import assert from 'node:assert/strict';
import crypto, { randomUUID } from 'node:crypto';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
import { installClassroomsTransport } from '../.build/api/apps/api/src/bootstrap/academic-host.js';
import { IdentityHttpError } from '../.build/api/apps/api/src/modules/identity/domain/errors.js';
import { IdentityStore } from '../.build/api/apps/api/src/modules/identity/accounts/infrastructure/persistence.js';
import { ClassroomError } from '../.build/api/apps/api/src/modules/classrooms/access/infrastructure/policy.js';
import { withP5Database } from '../scripts/p5-database.mjs';
import { ClassroomService } from './helpers/academic-fixture.ts';
import { generateClassroomCode } from '../.build/api/apps/api/src/modules/classrooms/memberships/infrastructure/classroom-codes.js';
import { normalizeClassroomCode } from '../.build/api/apps/api/src/modules/classrooms/memberships/domain/classroom-code.js';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const draws = text => [...text].map(character => ALPHABET.indexOf(character));
const CODE_A = '23456789', CODE_B = '2345678A', CODE_C = '2345678B';

test('generated codes have 8 characters from the unambiguous alphabet and a flat distribution', () => {
  const counts = new Map();
  for (let i = 0; i < 6000; i++) {
    const code = generateClassroomCode();
    assert.match(code, /^[23456789ABCDEFGHJKMNPQRSTVWXYZ]{8}$/);
    for (const character of code) counts.set(character, (counts.get(character) ?? 0) + 1);
  }
  assert.equal(counts.size, 30);
  const expected = 6000 * 8 / 30;
  for (const [, count] of counts) assert.ok(count > expected * 0.8 && count < expected * 1.2);
  assert.equal(new Set(Array.from({ length: 200 }, generateClassroomCode)).size, 200);
});

test('code input accepts legacy 6 digits and 8-character codes, and rejects everything else', () => {
  assert.equal(normalizeClassroomCode(' 000 042 '), '000042');
  assert.equal(normalizeClassroomCode(' abcd-efgh '), 'ABCD-EFGH'.replace('-', ''));
  assert.equal(normalizeClassroomCode('2345 6789'), '23456789');
  assert.equal(normalizeClassroomCode('-_legacy-AcceptedCode123'), '-_legacy-AcceptedCode123');
  for (const bad of ['', '12345', '1234567', '0123456789', 'ABCDEFGI', 'ABCD-EFG1', 'ABCDEFGHJ', '2345678!', null, 12345678, {}, 'A'.repeat(60)])
    assert.equal(normalizeClassroomCode(bad), undefined, String(bad));
});


const denied = (promise, code) => assert.rejects(promise, error => error.code === code);
const hash = (action, subject) => crypto.createHmac('sha256', 'fixture-only').update(action + subject).digest('hex');
function admissionStore(database) {
  const execute = raw => (strings, ...values) => raw.$queryRawUnsafe(
    strings.reduce((sql, part, index) => sql + (index ? '$' + index : '') + part, ''), ...values);
  return new IdentityStore({ $transaction: fn => database.$transaction(raw =>
    fn({ $queryRaw: execute(raw), $executeRaw: execute(raw) })) });
}

test('short codes and invitation batch receipts on isolated PostgreSQL', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    async function account(role) {
      const actor = randomUUID(), email = actor + '@example.test';
      await pool.query(`INSERT INTO users
        (id,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES ($1,$2,$2,'Fixture','Account','fixture',now(),$3)`, [actor, email, role]);
      return { actor, email };
    }
    async function classroom(owner) {
      const id = randomUUID();
      await pool.query(`INSERT INTO classrooms
        (id,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
        VALUES ($1,$2,'Fixture','Math','A',2026,'UTC','explore',100000000)`, [id, owner.actor]);
      return id;
    }
    const [teacher, other, student] = await Promise.all([account('teacher'), account('teacher'), account('student')]);
    const [room, otherRoom] = await Promise.all([classroom(teacher), classroom(other)]);
    const configuration = {
      database, authenticate: async (_, request) => request.actor,
      files: { promoteDraftPlanInTransaction() {} }, classroomQuotaBytes: 100000000n,
      signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), webOrigin: 'http://127.0.0.1:3005',
    };
    const service = new ClassroomService(configuration);

    await t.test('legacy survives time, short codes keep leading zeros, collisions do not revive older codes', async t => {
      const legacy = '-_legacy-AcceptedCode123';
      await pool.query(`INSERT INTO classroom_codes (id,classroom_id,code_digest,issued_at)
        VALUES($1,$2,$3,now()-interval '1 year')`, [randomUUID(), room, crypto.createHash('sha256').update(legacy).digest('hex')]);
      const old = await service.previewCode(student, legacy);
      const queue = [...draws(CODE_A), ...draws(CODE_A), ...draws(CODE_B), ...draws(CODE_A), ...draws(CODE_B), ...draws(CODE_C)];
      let fallback = 0;
      const random = t.mock.method(crypto, 'randomInt', () => queue.shift() ?? fallback++ % 8);
      syncBuiltinESMExports();
      try {
        const first = await service.rotateCode(teacher, room);
        assert.equal(first.code, CODE_A);
        assert.equal((await service.detail(teacher, room)).accessCode, CODE_A);
        await denied(service.confirmCode(student, old.confirmation), 'ENROLLMENT_UNAVAILABLE');
        await denied(service.previewCode(student, legacy), 'ENROLLMENT_UNAVAILABLE');
        await pool.query(`UPDATE classroom_codes SET issued_at=now()-interval '1 year'
          WHERE classroom_id=$1 AND revoked_at IS NULL`, [room]);
        assert.equal((await service.previewCode(student, ' 2345-6789 ')).classroom.name, 'Fixture');
        await denied(service.previewCode(student, '2345 678'), 'INVALID_INPUT');

        const results = await Promise.all([service.rotateCode(teacher, room), service.rotateCode(other, otherRoom)]);
        assert.deepEqual(results.map(({ code }) => code).sort(), [CODE_B, CODE_C]);
        const live = (await service.detail(teacher, room)).accessCode;
        await denied(service.rotateCode(teacher, room), 'SERVICE_UNAVAILABLE');
        assert.equal((await service.detail(teacher, room)).accessCode, live);
        assert.equal((await pool.query('SELECT count(*)::int n FROM classroom_codes WHERE revoked_at IS NULL')).rows[0].n, 2);
        await denied(service.previewCode(student, CODE_A), 'ENROLLMENT_UNAVAILABLE');
      } finally {
        random.mock.restore();
        syncBuiltinESMExports();
      }
    });

    await t.test('batch replays and concurrent emissions are durable, private and isolated by recipient', async () => {
      const requestId = randomUUID(), emails = [' MiXeD+fixture@EXAMPLE.TEST ', 'mixed+fixture@example.test',
        teacher.email, student.email, 'retry@example.test'];
      const input = { requestId, emails };
      await denied(service.reserveInvitationBatch(teacher, room, { requestId, emails: ['invalid'] }), 'INVALID_INPUT');
      await denied(service.reserveInvitationBatch(teacher, room, { requestId,
        emails: Array.from({ length: 51 }, (_, i) => `fixture${i}@example.test`) }), 'INVALID_INPUT');
      const receipt = await service.reserveInvitationBatch(teacher, room, input);
      assert.deepEqual(receipt.recipients.map(({ email, status }) => [email, status]), [
        ['MiXeD+fixture@example.test', 'pending'], [teacher.email, 'pending'], [student.email, 'pending'], ['retry@example.test', 'pending'],
      ]);
      await denied(service.readInvitationBatch(other, room, requestId), 'FORBIDDEN');
      await denied(service.emitInvitationBatchRecipient(student, room, requestId, 0), 'FORBIDDEN');
      await denied(service.reserveInvitationBatch(teacher, room, { requestId, emails: ['different@example.test'] }), 'CONFLICT');
      await service.invite(teacher, room, student.email);
      const renewed = new ClassroomService(configuration);
      const [created, replay] = await Promise.all([
        service.emitInvitationBatchRecipient(teacher, room, requestId, 0),
        renewed.emitInvitationBatchRecipient(teacher, room, requestId, 0),
      ]);
      assert.equal(created.status, 'created');
      assert.deepEqual(created, replay);
      assert.equal((await renewed.emitInvitationBatchRecipient(teacher, room, requestId, 1)).status, 'failed');
      assert.equal((await renewed.emitInvitationBatchRecipient(teacher, room, requestId, 2)).status, 'already_invited');
      assert.equal((await renewed.listInvitations(teacher, room)).find(({ id }) => id === created.invitationId).recipient, 'MiXeD+fixture@example.test');
      await pool.query(`ALTER TABLE background_jobs ADD CONSTRAINT fixture_block_new_invitation
        CHECK (type <> 'p5.invitation') NOT VALID`);
      try {
        await denied(renewed.emitInvitationBatchRecipient(teacher, room, requestId, 3), 'SERVICE_UNAVAILABLE');
        assert.deepEqual((await service.readInvitationBatch(teacher, room, requestId)).recipients.map(({ status }) => status),
          ['created', 'failed', 'already_invited', 'pending']);
        assert.equal((await pool.query("SELECT count(*)::int n FROM invitations WHERE recipient_email_normalized='retry@example.test'")).rows[0].n, 0);
      } finally {
        await pool.query('ALTER TABLE background_jobs DROP CONSTRAINT fixture_block_new_invitation');
      }
      assert.equal((await renewed.emitInvitationBatchRecipient(teacher, room, requestId, 3)).status, 'created');
      assert.equal((await pool.query("SELECT count(*)::int n FROM background_jobs WHERE type='p5.invitation'")).rows[0].n, 3);
      assert.deepEqual(await service.reserveInvitationBatch(teacher, room, input), await renewed.readInvitationBatch(teacher, room, requestId));

      await service.acceptInvitation(student, (await service.pendingInvitations(student))[0].id);
      const existing = await service.reserveInvitationBatch(teacher, room, { requestId: randomUUID(), emails: [student.email] });
      assert.equal((await service.emitInvitationBatchRecipient(teacher, room, existing.requestId, 0)).status, 'already_member');
      const archive = await service.reserveInvitationBatch(teacher, room, { requestId: randomUUID(), emails: ['archive@example.test'] });
      await service.setArchive(teacher, room, { archived: true, revision: (await service.detail(teacher, room)).revision });
      assert.equal((await service.emitInvitationBatchRecipient(teacher, room, archive.requestId, 0)).status, 'failed');
      assert.equal((await service.readInvitationBatch(teacher, room, archive.requestId)).recipients[0].code, 'CONFLICT');
      assert.deepEqual(await service.emitInvitationBatchRecipient(teacher, room, requestId, 0), created);
      assert.equal((await pool.query("SELECT count(*)::int n FROM background_jobs WHERE type='p5.invitation'")).rows[0].n, 3);
    });

    await t.test('batch works through the web proxy and exposes a missing receipt only to its classroom owner', async t => {
      let upstream = 0;
      const handler = createClassroomsHandler(service, { async admit(req) {
        upstream++;
        req.actor = req.headers.cookie === 'fixture=other' ? other.actor : teacher.actor;
      } });
      const api = createServer((req, res) => {
        req.url = req.url.slice('/api/v1'.length);
        handler(req, res, () => res.writeHead(404).end());
      }).listen(0, '127.0.0.1');
      await once(api, 'listening');
      const origin = 'http://127.0.0.1:' + api.address().port;
      const web = createServer((req, res) => proxyClassroomRequest(req, res, origin)).listen(0, '127.0.0.1');
      await once(web, 'listening');
      t.after(async () => {
        for (const server of [web, api]) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
      });
      const batch = `http://127.0.0.1:${web.address().port}/api/v1/classrooms/${otherRoom}/invitations/batch`;
      const requestId = randomUUID(), emails = ['http@example.test'];
      const owner = { cookie: 'fixture=other' };
      const post = (url, body) => fetch(url, { method: 'POST', body: JSON.stringify(body),
        headers: { ...owner, 'content-type': 'application/json' } });
      for (const body of [{ requestId, emails, force: true }, { requestId, emails: 'invalid' },
        { requestId, emails: [1] }, { requestId: 'invalid', emails }]) {
        assert.equal((await post(batch, body)).status, 400);
      }
      assert.equal(upstream, 0);
      const receipt = batch + '/' + requestId;
      assert.equal((await fetch(receipt)).status, 403);
      const missing = await fetch(receipt, { headers: owner });
      assert.equal(missing.status, 404);
      assert.equal((await missing.json()).error.code, 'INVITATION_BATCH_NOT_FOUND');
      const reserved = await post(batch, { requestId, emails });
      assert.equal(reserved.status, 200);
      assert.equal(reserved.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await reserved.json(), { requestId, recipients: [{ email: emails[0], status: 'pending' }] });
      assert.equal((await post(receipt + '/50', {})).status, 404);
      const emitted = await post(receipt + '/0', {});
      assert.equal(emitted.status, 200);
      const result = await emitted.json();
      assert.equal(result.status, 'created');
      assert.deepEqual(await (await fetch(receipt, { headers: owner })).json(), { requestId, recipients: [result] });
    });

    await t.test('legacy 6-digit codes keep resolving without forced rotation', async () => {
      const [legacyRoom] = await Promise.all([classroom(other)]);
      await pool.query(`UPDATE classroom_codes SET revoked_at=now() WHERE classroom_id=$1 AND revoked_at IS NULL`, [legacyRoom]);
      await pool.query(`INSERT INTO classroom_codes (id,classroom_id,code_digest) VALUES($1,$2,$3)`,
        [randomUUID(), legacyRoom, crypto.createHash('sha256').update('048151').digest('hex')]);
      assert.equal((await service.previewCode(student, '048 151')).classroom.name, 'Fixture');
    });

    await t.test('malformed codes are rejected before any database lookup or failure count', async () => {
      const before = (await pool.query("SELECT coalesce(sum(request_count),0)::int n FROM account_action_controls WHERE action='classroom-code-failure'")).rows[0].n;
      const seen = [];
      const tracked = new Proxy(database, { get(target, property) {
        if (property !== '$transaction') return Reflect.get(target, property);
        return (fn, options) => { seen.push('transaction'); return target.$transaction(fn, options); };
      } });
      const probe = new ClassroomService({ ...configuration, database: tracked });
      await denied(probe.previewCode(student, 'ABCD-EFG'), 'INVALID_INPUT');
      assert.deepEqual(seen, []);
      assert.equal((await pool.query("SELECT coalesce(sum(request_count),0)::int n FROM account_action_controls WHERE action='classroom-code-failure'")).rows[0].n, before);
    });

    await t.test('failed guesses are counted globally across accounts, survive the failed operation and end in 429', async () => {
      await pool.query("DELETE FROM account_action_controls WHERE action='classroom-code-failure'");
      const students = await Promise.all(Array.from({ length: 6 }, () => account('student')));
      const guess = i => 'ZZ' + Array.from({ length: 6 }, (_, k) => ALPHABET[Math.floor(i / 30 ** k) % 30]).join('');
      const count = async () => (await pool.query("SELECT request_count n FROM account_action_controls WHERE action='classroom-code-failure' AND subject_key='global'")).rows[0]?.n ?? 0;
      for (let i = 0; i < 300; i++) {
        await denied(service.previewCode(students[i % students.length], guess(i)), 'ENROLLMENT_UNAVAILABLE');
      }
      assert.equal(await count(), 300);
      await assert.rejects(service.previewCode(students[0], 'ZZZZ2222'), error => error.code === 'RATE_LIMITED' && error.retryAfter > 0);
      // Another account, and even a valid code, are blocked while the global window is saturated.
      await assert.rejects(service.previewCode(students[5], CODE_B), error => error.code === 'RATE_LIMITED');
      assert.equal(await count(), 300);
      await pool.query("UPDATE account_action_controls SET window_started_at=now()-interval '11 minutes' WHERE action='classroom-code-failure'");
      await denied(service.previewCode(students[1], 'ZZZZ2222'), 'ENROLLMENT_UNAVAILABLE');
      assert.equal(await count(), 1);
    });

    await t.test('verified code previews are rate-limited by account across sessions and allow a shared network', async t => {
      const store = admissionStore(database);
      store.authenticate = async verifier => ({
        verifier, sessionId: verifier,
        user: { id: verifier === sessionOne || verifier === sessionTwo ? student.actor : verifier,
          account_role: 'student', email_verified_at: new Date() },
      });
      const runtime = { configuration: { security: {
        abuseDigest: hash, assertOrigin() {}, validateCsrf: (_, csrf) => csrf === 'valid',
        clientAddress: request => request.socket.remoteAddress,
      } }, store, async generalAdmission() {} };
      const app = createRequire(import.meta.url)('express')();
      let reached = 0;
      installClassroomsTransport(app, runtime, { async previewCode() {
        reached++;
        throw new ClassroomError('ENROLLMENT_UNAVAILABLE');
      } });
      const server = createServer(app).listen(0, '127.0.0.1');
      await once(server, 'listening');
      t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
      const url = 'http://127.0.0.1:' + server.address().port + '/api/v1/classrooms/codes/preview';
      const sessionOne = crypto.randomBytes(32).toString('base64url'), sessionTwo = crypto.randomBytes(32).toString('base64url');
      const preview = async (session, forwarded = '203.0.113.7') => {
        const res = await fetch(url, { method: 'POST', body: JSON.stringify({ code: '000001' }),
          headers: { cookie: 'foxmind_session=' + session, 'content-type': 'application/json',
            'x-csrf-token': 'valid', 'x-forwarded-for': forwarded } });
        await res.json();
        return res;
      };
      for (let window = 0; window < 3; window++) {
        for (let i = 0; i < (window < 2 ? 10 : 8); i++) assert.equal((await preview(sessionOne)).status, 409);
        const limited = await preview(sessionTwo, '198.51.100.7');
        assert.equal(limited.status, 429);
        assert.ok(Number(limited.headers.get('retry-after')) > 0);
        await pool.query("UPDATE account_action_controls SET window_started_at=now()-interval '2 minutes' WHERE subject_key=$1",
          [hash('general-identity', 'identifier\0classroom-code:account-minute:' + student.actor)]);
      }
      assert.equal((await preview(sessionTwo)).status, 429);
      assert.equal(reached, 28);
      for (let i = 0; i < 32; i++) assert.equal((await preview(crypto.randomBytes(32).toString('base64url'))).status, 409);
      assert.equal(reached, 60);
    });

    await t.test('five batches behind one peer leave the general admission pool available', async t => {
      const store = admissionStore(database);
      const teachers = Array.from({ length: 5 }, () => crypto.randomBytes(32).toString('base64url'));
      const student = crypto.randomBytes(32).toString('base64url');
      store.authenticate = async verifier => ({
        verifier, sessionId: verifier, user: {
          id: verifier, account_role: verifier === student ? 'student' : 'teacher', email_verified_at: new Date(),
        },
      });
      let general = 0, reached = 0;
      const runtime = { configuration: { security: {
        abuseDigest: hash, assertOrigin() {}, validateCsrf: (_, csrf) => csrf === 'valid',
        clientAddress: request => request.socket.remoteAddress,
      } }, store, async generalAdmission() {
        if (++general > 240) throw new IdentityHttpError('RATE_LIMITED', 60);
      } };
      const app = createRequire(import.meta.url)('express')();
      const issue = async req => {
        if (req.headers.cookie?.endsWith(student)) throw new ClassroomError('FORBIDDEN');
        reached++;
        return { status: 'pending' };
      };
      installClassroomsTransport(app, runtime, { reserveInvitationBatch: issue, emitInvitationBatchRecipient: issue });
      const server = createServer(app).listen(0, '127.0.0.1');
      await once(server, 'listening');
      t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
      const base = `http://127.0.0.1:${server.address().port}/api/v1/classrooms/${room}/invitations/batch`;
      const post = (path, session, body, csrf = 'valid') => fetch(base + path, { method: 'POST', body: JSON.stringify(body),
        headers: { ...(session && { cookie: 'foxmind_session=' + session }), 'content-type': 'application/json',
          'x-csrf-token': csrf, 'x-forwarded-for': '203.0.113.99' } });
      for (const [session, csrf, status] of [[null, 'valid', 401], [student, 'valid', 403], [teachers[0], 'bad', 403]]) {
        const response = await post('', session, { requestId: randomUUID(), emails: ['case@example.test'] }, csrf);
        assert.equal(response.status, status);
        await response.json();
      }
      assert.equal(general, 3);
      await Promise.all(teachers.map(async session => {
        const requestId = randomUUID();
        const emails = Array.from({ length: 50 }, (_, i) => `fixture${i}@example.test`);
        assert.equal((await post('', session, { requestId, emails })).status, 200);
        for (let i = 0; i < 50; i++) assert.equal((await post(`/${requestId}/${i}`, session, {})).status, 200);
      }));
      assert.equal(reached, 255);
      assert.equal(general, 3);
      const saturate = (subject, count) => pool.query('UPDATE account_action_controls SET request_count=$1 WHERE subject_key=$2',
        [count, hash('general-identity', 'identifier\0classroom-invitation-batch:' + subject)]);
      await saturate('account:' + teachers[0], 120);
      const receiptId = randomUUID();
      const limited = await post(`/${receiptId}/0`, teachers[0], {});
      assert.equal(limited.status, 429);
      assert.ok(Number(limited.headers.get('retry-after')) > 0);
      await saturate('peer:127.0.0.1', 2000);
      assert.equal((await post(`/${receiptId}/0`, teachers[1], {})).status, 429);
      assert.equal(general, 3);
    });
  });
});
