import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomTransactionRunner } from './context-run.ts';
import { isVerifiedRead } from '../application/transaction-mode.ts';
import type { ClassroomPorts } from '../application/runtime-ports.ts';
const id = '11111111-1111-4111-8111-111111111111';
function fixture(write: boolean, revoked = false) {
 const events: string[] = []; let authenticated = 0;
 const ports = { authenticate: async () => { events.push('authenticate'); return revoked && ++authenticated > 1 ? null : id; },
 database: { async $transaction(operation: (raw: unknown) => Promise<unknown>, options: unknown) {
  assert.deepEqual(options, { maxWait: 2000, timeout: 6000 });
  return operation({ async $queryRawUnsafe(sql: string) {
   if (sql.includes('FROM users')) { events.push('user-lock'); return [{ id, email_verified_at: new Date(), account_role: 'teacher' }]; }
   if (sql.includes('clock_timestamp() AS now')) { events.push('clock'); return [{ now: new Date('2026-11-10T12:00:00Z') }]; }
   if (sql.includes('account_action_controls')) { events.push('budget'); return [{ request_count: 1 }]; }
   throw new Error('Unexpected SQL');
  } });
 } } } as unknown as ClassroomPorts;
 return { runner: new ClassroomTransactionRunner(ports), events, write };
}
test('classroom UoW preserves user lock, repeated authentication, clock and mutation budget order', async () => {
 for (const write of [false, true]) {
  const { runner, events } = fixture(write);
  const result = await runner.run({}, write, async (tx, actor) => {
   events.push('operation'); assert.equal(isVerifiedRead(tx), !write); assert.equal(actor.id,id); return 'same-unit';
  });
  assert.equal(result, 'same-unit');
  assert.deepEqual(events, ['authenticate','user-lock','authenticate','clock', ...(write ? ['budget'] : []),'operation']);
 }
});
test('revocation after waiting for the user lock prevents the academic operation', async () => {
 const { runner, events } = fixture(true,true);
 await assert.rejects(runner.run({},true,async () => { throw new Error('Operation must not run'); }), { code: 'FORBIDDEN' });
 assert.deepEqual(events,['authenticate','user-lock','authenticate']);
});
