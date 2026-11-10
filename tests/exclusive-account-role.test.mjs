import assert from 'node:assert/strict';
import test from 'node:test';
import { IdentityStore } from '../.build/api/apps/api/src/modules/identity/infrastructure/persistence.js';
import { IdentityRuntime, publicUser } from '../.build/api/apps/api/src/bootstrap/identity-runtime.js';
import { DraftService } from '../.build/api/apps/api/src/bootstrap/academic-management-composition.js';
import { MembershipService } from '../.build/api/apps/api/src/bootstrap/academic-management-composition.js';

const input = { firstName: 'Example', lastName: 'Learner', email: 'example@example.test', password: 'Synthetic password for testing' };
const config = { mail: { smtpPort: 1025 }, security: { rateLimits: { registration: { ip: {} } } } };
const duplicateStore = () => {
  let transactions = 0;
  return { canonicalEmail: async value => value.toLowerCase(), admit: async () => {}, insertRegistration: IdentityStore.prototype.insertRegistration,
    transaction: async operation => { transactions++; return operation({ $queryRaw: async () => [] }); },
    get transactions() { return transactions; } };
};
const runtime = store => new IdentityRuntime(config, store, { hash: async () => 'fixture-hash' });

test('registration requires one of the two explicit account roles', async () => {
  for (const accountRole of [undefined, null, '', 'admin', 'Teacher']) {
    const store = duplicateStore();
    await assert.rejects(runtime(store).register({ ...input, ...(accountRole === undefined ? {} : { accountRole }) }, '127.0.0.1'),
      error => error.code === 'VALIDATION_ERROR');
    assert.equal(store.transactions, 0);
  }
});

test('duplicate registrations accept either valid role without modifying the existing account', async () => {
  for (const accountRole of ['teacher', 'student']) {
    const store = duplicateStore();
    await runtime(store).register({ ...input, accountRole }, '127.0.0.1');
    assert.equal(store.transactions, 1);
  }
});

test('public identity exposes the persisted account role', () => {
  for (const accountRole of ['teacher', 'student']) {
    const user = { id: 'fixture', email: input.email, first_name: input.firstName, last_name: input.lastName,
      email_verified_at: new Date(), account_role: accountRole };
    assert.equal(publicUser(user).accountRole, accountRole);
  }
});

const actor = accountRole => ({ id: '11111111-1111-4111-8111-111111111111', account_role: accountRole });
const denied = error => error.code === 'FORBIDDEN';

test('student cannot create a classroom draft', async () => {
  let writes = 0;
  const tx = { query: async () => { writes++; return [{ id: 'draft', revision: 0n, payload: {}, published_classroom_id: null }]; } };
  const service = new DraftService({ run: async (_request, _write, operation) => operation(tx, actor('student')),
    classroom: async () => {}, ports: {} });
  await assert.rejects(service.createDraft({}), denied);
  assert.equal(writes, 0);
});

test('teacher cannot enroll in a classroom', async () => {
  let queries = 0;
  const tx = { query: async () => { queries++; return [{ id: 'existing' }]; } };
  const service = new MembershipService({ run: async () => {}, classroom: async () => {}, tokens: {} }, { newCode: async () => '' });
  await assert.rejects(service.enroll(tx, actor('teacher'), '22222222-2222-4222-8222-222222222222', null), denied);
  assert.equal(queries, 0);
});



test('persisted roles govern classroom creation and enrollment and survive duplicate registration', { timeout: 120000 }, async () => {
  const { randomUUID } = await import('node:crypto');
  const { withAiDatabase, rollbackCase } = await import('./classroom-ai-database.test.mjs');
  const { ClassroomService } = await import("../.build/api/apps/api/src/bootstrap/academic-composition.js");
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const teacher = randomUUID(), student = randomUUID(), room = randomUUID();
    for (const [id, role] of [[teacher, 'teacher'], [student, 'student']]) {
      await local.pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,'Test','User','fixture',now(),$3)`, [id, `${id}@example.test`, role]);
    }
    await local.pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Class','Subject','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    const store = { canonicalEmail: async value => value.toLowerCase(), admit: async () => {}, insertRegistration: IdentityStore.prototype.insertRegistration,
      transaction: async operation => operation({ $queryRaw: async (parts, ...values) => {
        const sql = parts.reduce((text, part, i) => text + part + (i < values.length ? `$${i + 1}` : ''), '');
        return (await local.pool.query(sql, values)).rows;
      } }) };
    for (const [id, opposite] of [[teacher, 'student'], [student, 'teacher']]) {
      await runtime(store).register({ ...input, email: `${id}@example.test`, accountRole: opposite }, '127.0.0.1');
    }
    const roles = await local.pool.query('SELECT id,account_role FROM users WHERE id=ANY($1::uuid[])', [[teacher, student]]);
    assert.deepEqual(Object.fromEntries(roles.rows.map(row => [row.id, row.account_role])), { [teacher]: 'teacher', [student]: 'student' });
    const authenticate = async (_tx, request) => request.actor;
    const service = new ClassroomService({ database: local.database, authenticate, files: {load(){assert.fail('Unexpected file read');},loadAuthorized(){assert.fail('Unexpected authorized file read');},promoteDraftPlanInTransaction(){assert.fail('Unexpected file promotion');}},
      classroomQuotaBytes: 100000000n, signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher }, S = { actor: student };
    assert.ok((await service.createDraft(T)).id);
    await assert.rejects(service.createDraft(S), denied);
    const { code } = await service.rotateCode(T, room);
    await assert.rejects(service.previewCode(T, code), error => error.code === 'ENROLLMENT_UNAVAILABLE' || error.code === 'FORBIDDEN');
    const preview = await service.previewCode(S, code);
    await service.confirmCode(S, preview.confirmation);
    const enrolled = await local.pool.query('SELECT student_id FROM enrollments WHERE classroom_id=$1', [room]);
    assert.deepEqual(enrolled.rows.map(row => row.student_id), [student]);
  }));
});
