import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeUnitOfWork } from '../apps/api/src/modules/home/dashboard/infrastructure/unit-of-work.ts';

const failingDatabase = error => ({ async $transaction(callback) {
  return callback({ async $queryRawUnsafe() { throw error; } });
} });
const authenticate = async tx => { await tx.query('SELECT 1'); return 'a1111111-1111-4111-8111-111111111111'; };

test('an unexpected Home database failure answers SERVICE_UNAVAILABLE and records only its error code', async () => {
  const events = [];
  const uow = createHomeUnitOfWork(failingDatabase(Object.assign(new Error('deadlock CANARY_PRIVATE_SQL'),
    { code: 'P2010', meta: { code: '40P01', message: 'CANARY_PRIVATE_SQL' } })), authenticate, { record: event => events.push(event) });
  await assert.rejects(uow.run({}, false, async () => 'never'), error => error.code === 'SERVICE_UNAVAILABLE');
  assert.equal(events.length, 1);
  const [event] = events;
  assert.deepEqual({ operation: event.operation, code: event.code, outcome: event.outcome, cause: event.cause },
    { operation: 'home.read', code: 'UNEXPECTED', outcome: 'failure', cause: '40P01' });
  assert.match(event.correlationId, /^[0-9a-f-]{36}$/);
  assert.doesNotMatch(JSON.stringify(event), /CANARY/);
});
test('public Home errors are not reported as unexpected failures', async () => {
  const events = [];
  const uow = createHomeUnitOfWork(failingDatabase(Object.assign(new Error('auth'), { code: 'AUTH_REQUIRED' })), authenticate,
    { record: event => events.push(event) });
  await assert.rejects(uow.run({}, false, async () => 'never'), error => error.code === 'AUTH_REQUIRED');
  assert.equal(events.length, 0);
});
