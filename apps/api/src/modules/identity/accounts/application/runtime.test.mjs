import test from 'node:test';
import assert from 'node:assert/strict';
import { IdentityRuntime } from './runtime.ts';

const password = 'a'.repeat(16);
function registrationFixture(beforeRegistrationCommit) {
  const events = [], tx = { accountToken: { create: async () => events.push('token') } };
  const store = {
    canonicalEmail: async value => value.toLowerCase(), admit: async () => {},
    transaction: async run => { events.push('begin'); try { const result = await run(tx); events.push('commit'); return result; }
      catch (error) { events.push('rollback'); throw error; } },
    insertRegistration: async received => { assert.equal(received, tx); events.push('insert'); return [{ id: 'user' }]; },
    lockUsers: async received => { assert.equal(received, tx); events.push('lock'); }, now: async () => new Date(0),
  };
  const runtime = new IdentityRuntime({ security: { rateLimits: { registration: { ip: {} } } } }, store,
    { hash: async () => { events.push('hash'); return 'encoded'; } }, {
      tokens: { randomUUID: () => 'id', generateVerifier: () => 'verifier', accountTokenDigest: () => 'digest' },
      validateMailbox: value => value,
      mailOutbox: { enqueue: async received => { assert.equal(received, tx); events.push('outbox'); } },
      mail: { start() {}, stop: async () => {}, close: async () => {} },
    }, { beforeRegistrationCommit });
  return { runtime, events };
}
const input = { firstName: 'First', lastName: 'Last', email: 'Synthetic@example.test', accountRole: 'student', password };
test('registration hashes before transaction and enqueues in the same transaction after user/token locks', async () => {
  const { runtime, events } = registrationFixture();
  await runtime.register(input, '127.0.0.1');
  assert.deepEqual(events, ['hash', 'begin', 'insert', 'lock', 'token', 'outbox', 'commit']);
});
test('registration failure after enqueue propagates to caller-owned rollback', async () => {
  const failure = new Error('synthetic rollback');
  const { runtime, events } = registrationFixture(async () => { throw failure; });
  await assert.rejects(runtime.register(input, '127.0.0.1'), error => error === failure);
  assert.equal(events.at(-1), 'rollback');
  assert.equal(events.includes('commit'), false);
});
test('invalid registration role fails before hashing or starting a transaction', async () => {
  const { runtime, events } = registrationFixture();
  await assert.rejects(runtime.register({ ...input, accountRole: 'admin' }, '127.0.0.1'), { code: 'VALIDATION_ERROR' });
  assert.deepEqual(events, []);
});

function releaseFixture() {
  const events = [], user = { id: 'user', email_normalized: 'victim@example.test', password_hash: 'old' };
  const tx = {
    user: { findUnique: async () => user, update: async () => ({}) },
    session: { create: async () => events.push('session'), updateMany: async () => {} },
    accountToken: { findUnique: async () => ({ id: 'token', user_id: 'user' }), findMany: async () => [], update: async () => {} },
  };
  const store = {
    canonicalEmail: async value => value.toLowerCase(), admit: async () => {},
    findUser: async () => user, lockUsers: async () => {}, now: async () => new Date(0),
    consumeToken: async () => [{ id: 'token' }],
    transaction: async run => { const result = await run(tx); events.push('commit'); return result; },
    releaseIdentifierBuckets: async (received, config, actions, canonical, ip) => { assert.equal(received, tx); events.push(['release', actions, canonical, ip]); },
  };
  const runtime = new IdentityRuntime({ security: { rateLimits: { login: { ip: {}, identifier: {} }, 'token-redemption': { ip: {} } } } }, store,
    { verify: async () => true, hash: async () => 'new', dummyCheck: async () => false }, {
      tokens: { randomUUID: () => 'id', generateVerifier: () => 'verifier', accountTokenDigest: () => 'digest', sessionTokenDigest: () => 'digest' },
      validateMailbox: value => value, mailOutbox: { cancel: async () => {}, enqueue: async () => {} },
    });
  return { runtime, events };
}
test('successful password login releases the identifier login bucket inside the session transaction', async () => {
  const { runtime, events } = releaseFixture();
  await runtime.login({ email: 'Victim@example.test', password }, '127.0.0.1', null);
  assert.deepEqual(events, ['session', ['release', ['login'], 'victim@example.test', '127.0.0.1'], 'commit']);
});
test('failed password login never releases the identifier bucket', async () => {
  const { runtime, events } = releaseFixture();
  runtime.passwords = { verify: async () => false, dummyCheck: async () => false };
  await assert.rejects(runtime.login({ email: 'Victim@example.test', password }, '127.0.0.1', null), { code: 'AUTHENTICATION_FAILED' });
  assert.deepEqual(events, []);
});
test('completed password reset releases login and recovery identifier buckets of that account in the same transaction', async () => {
  const { runtime, events } = releaseFixture();
  await runtime.confirmPasswordRecovery({ token: 'x', newPassword: password }, '127.0.0.1', null);
  // First 'commit' is the token lookup transaction; the release must land before the mutation transaction commits.
  assert.deepEqual(events, ['commit', ['release', ['login', 'recovery-request'], 'victim@example.test', '127.0.0.1'], 'commit']);
});

test('login and recovery charge the address of each attempt separately from a wider per-identifier ceiling', async () => {
  const budgets = { ip: { limit: 300, windowSeconds: 900 }, identifierPerIp: { limit: 10, windowSeconds: 900 }, identifier: { limit: 100, windowSeconds: 900 } };
  const admitted = [];
  const store = { canonicalEmail: async value => value.toLowerCase(), admit: async (_config, buckets) => { admitted.push(buckets); throw Object.assign(new Error('stop'), { code: 'RATE_LIMITED' }); } };
  const runtime = new IdentityRuntime({ security: { rateLimits: { login: budgets, 'recovery-request': { ...budgets, cooldownSeconds: 60 } } } }, store,
    { verify: async () => true, dummyCheck: async () => false }, { validateMailbox: value => value, tokens: {} });
  await assert.rejects(runtime.login({ email: 'Victim@example.test', password }, '203.0.113.7', null), { code: 'RATE_LIMITED' });
  await assert.rejects(runtime.requestPasswordRecovery({ email: 'Victim@example.test' }, '203.0.113.7'), { code: 'RATE_LIMITED' });
  for (const [index, action] of ['login', 'recovery-request'].entries()) assert.deepEqual(admitted[index], [
    { action, namespace: 'ip', subject: '203.0.113.7', budget: budgets.ip },
    { action, namespace: 'identifier-ip', subject: 'victim@example.test\u0000203.0.113.7', budget: budgets.identifierPerIp },
    { action, namespace: 'identifier', subject: 'victim@example.test', budget: budgets.identifier },
  ]);
});
