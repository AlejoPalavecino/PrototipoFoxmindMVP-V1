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
