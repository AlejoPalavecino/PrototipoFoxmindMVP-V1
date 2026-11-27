import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';
import { newClassroomCode } from '../apps/api/src/bootstrap/academic-management-composition.ts';
import { createMembershipCodeOperations } from '../apps/api/src/modules/classrooms/memberships/application/membership-code-operations.ts';
import { createMembershipCodeRepository } from '../apps/api/src/modules/classrooms/memberships/infrastructure/membership-code-operations-repository.ts';
import { rehashClassroomCodes } from '../apps/api/src/modules/classrooms/memberships/infrastructure/code-digest-migration.ts';
import { classroomCodeDigests } from '../apps/api/src/platform/crypto/classroom-code-digest.ts';
import { PreviewTokens } from '../apps/api/src/modules/classrooms/access/infrastructure/policy.ts';
import { decryptDelivery, encryptDelivery } from '../apps/api/src/modules/classrooms/invitations/infrastructure/delivery-envelope.ts';

// S7: classroom codes are stored as a keyed HMAC, so a database copy alone does not reveal them.
const sha = code => createHash('sha256').update(code).digest('hex');
const ports = { deliveryKey: Buffer.alloc(32, 11), signingKey: Buffer.alloc(32, 12), codeDigestKey: Buffer.alloc(32, 13) };

test('PostgreSQL: classroom codes use HMAC digests, legacy digests still work and can be recalculated (S7)', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ transaction }) => transaction(async local => {
    const f = await homeFixture(local.query), tx = { query: local.query }, room = f.rooms.teach.id;
    const code = await newClassroomCode(tx, room, ports);
    const [stored] = await local.query('SELECT code_digest FROM classroom_codes WHERE classroom_id=$1 AND revoked_at IS NULL', room);
    assert.match(stored.code_digest, /^h1:[0-9a-f]{64}$/u);
    assert.notEqual(stored.code_digest, sha(code), 'an unkeyed SHA-256 is never written for a new code');
    assert.equal(stored.code_digest, classroomCodeDigests(ports, code)[0]);

    const operations = createMembershipCodeOperations(createMembershipCodeRepository(), { codeDigests: classroomCodeDigests });
    const capability = { codeKeys: ports, tokens: new PreviewTokens(ports.signingKey),
      run: async (_request, _write, run) => run(tx, { id: f.outsider, account_role: 'student', now: new Date() }) };
    assert.ok((await operations.previewCodeOperation(capability, {}, code)).confirmation, 'a new code is found by its HMAC');

    // A live code written before this change keeps working until it is recalculated.
    const legacy = '482913';
    await local.query('UPDATE classroom_codes SET code_digest=$2,code_envelope=$3 WHERE classroom_id=$1 AND revoked_at IS NULL',
      room, sha(legacy), encryptDelivery(ports.deliveryKey, { code: legacy }, `classroom-access:${room}`));
    await local.query(`INSERT INTO classroom_codes(id,updated_at,classroom_id,code_digest,revoked_at)
      VALUES(gen_random_uuid(),now(),$1,$2,now())`, room, sha('111111'));
    assert.ok((await operations.previewCodeOperation(capability, {}, legacy)).confirmation, 'a legacy digest is still accepted');

    assert.deepEqual(await rehashClassroomCodes(tx, ports, decryptDelivery), { rehashed: 1, skipped: 0 });
    const rows = await local.query('SELECT code_digest,revoked_at IS NULL AS live FROM classroom_codes WHERE classroom_id=$1 ORDER BY live DESC', room);
    assert.equal(rows[0].code_digest, classroomCodeDigests(ports, legacy)[0]);
    assert.ok(rows.filter(row => !row.live).some(row => row.code_digest === sha('111111')), 'revoked digests are kept to avoid reuse');
    assert.deepEqual(await rehashClassroomCodes(tx, ports, decryptDelivery), { rehashed: 0, skipped: 0 }, 'recalculation is idempotent');
    assert.ok((await operations.previewCodeOperation(capability, {}, legacy)).confirmation, 'the same code still works after recalculation');

    // An envelope that does not match its digest is left untouched and reported.
    await local.query('UPDATE classroom_codes SET code_digest=$2,code_envelope=$3 WHERE classroom_id=$1 AND revoked_at IS NULL',
      room, sha('222222'), encryptDelivery(ports.deliveryKey, { code: '333333' }, `classroom-access:${room}`));
    assert.deepEqual(await rehashClassroomCodes(tx, ports, decryptDelivery), { rehashed: 0, skipped: 1 });
  }));
});

test('PostgreSQL: the recalculation command reports without --apply and writes with it (S7)', { timeout: 120000 }, async () => {
  const { spawnSync } = await import('node:child_process');
  await withAgendaDatabase(async ({ pool, databaseUrl }) => {
    const query = async (sql, ...values) => (await pool.query(sql, values)).rows;
    const f = await homeFixture(query), room = f.rooms.teach.id, legacy = '904512';
    await query(`INSERT INTO classroom_codes(id,updated_at,classroom_id,code_digest,code_envelope)
      VALUES(gen_random_uuid(),now(),$1,$2,$3)`, room, sha(legacy), encryptDelivery(ports.deliveryKey, { code: legacy }, `classroom-access:${room}`));
    const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, DATABASE_URL: databaseUrl,
      CLASSROOMS_SIGNING_KEY: ports.signingKey.toString('base64url'), CLASSROOMS_DELIVERY_KEY: ports.deliveryKey.toString('base64url'),
      CLASSROOMS_CODE_DIGEST_KEY: ports.codeDigestKey.toString('base64url') };
    const run = (...args) => spawnSync(process.execPath, ['scripts/rehash-classroom-codes.mjs', ...args], { env, encoding: 'utf8', windowsHide: true });
    const preview = run();
    assert.equal(preview.status, 0, preview.stderr);
    assert.deepEqual(JSON.parse(preview.stdout), { rehashed: 1, skipped: 0, applied: false });
    assert.equal((await query('SELECT code_digest FROM classroom_codes WHERE classroom_id=$1', room))[0].code_digest, sha(legacy));
    const applied = run('--apply');
    assert.deepEqual(JSON.parse(applied.stdout), { rehashed: 1, skipped: 0, applied: true });
    assert.equal((await query('SELECT code_digest FROM classroom_codes WHERE classroom_id=$1', room))[0].code_digest, classroomCodeDigests(ports, legacy)[0]);
  });
});
