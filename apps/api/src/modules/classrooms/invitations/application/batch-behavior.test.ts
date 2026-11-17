import test from 'node:test';
import assert from 'node:assert/strict';
import { InvitationBatchOperations } from './invitation-batches.ts';
const requestId = '11111111-1111-4111-8111-111111111111';
function fixture(archived = false, status = 'pending') {
 const tx = {}, events: string[] = [];
 const receipt = { requestId, recipients: [{ email: 'test@example.test', status }] };
 const repository = { distinctMailboxes: async (seen: unknown) => { assert.equal(seen, tx); return [{ email: 'test@example.test' }]; },
  readReceipt: async (seen: unknown) => { assert.equal(seen, tx); return [{ receipt_envelope: JSON.stringify(receipt) }]; },
  createReceipt: async () => { throw Error('Replay cannot recreate receipt'); },
  updateReceipt: async (seen: unknown) => { assert.equal(seen, tx); events.push('store'); },
  normalizeMailbox: async (seen: unknown) => { assert.equal(seen, tx); return [{ normalized: 'test@example.test' }]; } };
 const access = { run: async (_: unknown, _write: boolean, action: Function) => action(tx, { email_normalized: 'teacher@example.test' }),
  classroom: async (...args: unknown[]) => { assert.deepEqual(args.slice(2), ['room', false, true]); return { name: 'Room', archived_at: archived ? new Date() : null }; },
  ports: { validateMailbox: (value: string) => value, deliveryKey: Buffer.alloc(32) } };
 const issue = { hasActiveMember: async () => false, findOpenInvitation: async () => undefined,
  createInvitation: async (seen: unknown) => { assert.equal(seen, tx); events.push('issue'); return { id: 'invitation', generation: '1' }; },
  enqueueInvitation: async (seen: unknown) => { assert.equal(seen, tx); events.push('enqueue'); } };
 const service = new InvitationBatchOperations(access as any, repository as any, issue as any,
  { sealReceipt: (_key, value) => JSON.stringify(value), openReceipt: (_key, value) => JSON.parse(value) });
 return { service, events, receipt };
}
test('batch reserve replay keeps the original receipt even after classroom archive', async () => {
 const f = fixture(true); assert.deepEqual(await f.service.reserve({}, 'room', { requestId, emails: ['test@example.test'] }), f.receipt); assert.deepEqual(f.events, []);
});
test('batch emit issues and queues exactly once before storing receipt in the same tx', async () => {
 const f = fixture(); assert.deepEqual(await f.service.emit({}, 'room', requestId, 0), { email: 'test@example.test', status: 'created', invitationId: 'invitation' });
 assert.deepEqual(f.events, ['issue', 'enqueue', 'store']);
});
test('terminal batch recipient replay never reissues or rewrites receipt', async () => {
 const f = fixture(false, 'already_member'); assert.deepEqual(await f.service.emit({}, 'room', requestId, 0), f.receipt.recipients[0]); assert.deepEqual(f.events, []);
});
test('archive fails pending batch recipient without creating an invitation', async () => {
 const f = fixture(true); assert.deepEqual(await f.service.emit({}, 'room', requestId, 0), { email: 'test@example.test', status: 'failed', code: 'CONFLICT' }); assert.deepEqual(f.events, ['store']);
});
