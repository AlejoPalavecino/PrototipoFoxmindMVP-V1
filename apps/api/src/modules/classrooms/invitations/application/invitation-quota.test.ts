import test from 'node:test';
import assert from 'node:assert/strict';
import { createInvitationIssueOperations, INVITATION_DELIVERY_BUDGETS } from './invitations-operations.ts';

function fixture(admit: (actorId: string) => Promise<void>) {
  const events: string[] = [], tx = {};
  const repository = {
    normalizeMailbox: async () => [{ normalized: 'alumno@example.test' }], findActiveMember: async () => [],
    findOpenInvitation: async () => [], advanceGeneration: async () => [{ generation: 2n }],
    createInvitation: async () => { events.push('create'); return [{ generation: 1n }]; },
    enqueueDelivery: async () => { events.push('enqueue'); return [{ id: 'job' }]; },
  };
  const actor = { id: 'teacher-1', email_normalized: 'docente@example.test', first_name: 'Docente', last_name: 'Sintético' };
  const capability = {
    run: async (_request: unknown, _write: boolean, action: Function) => action(tx, actor),
    classroom: async () => ({ name: 'Aula sintética' }),
    ports: { validateMailbox: (value: unknown) => String(value), deliveryKey: Buffer.alloc(32), webOrigin: 'http://127.0.0.1:3005',
      admitInvitationDelivery: async (actorId: string) => { events.push(`admit:${actorId}`); await admit(actorId); } },
  };
  const operations = createInvitationIssueOperations(repository as never, { randomUUID: () => '11111111-1111-4111-8111-111111111111', sealMessage: () => 'sealed' });
  return { events, invite: () => operations.inviteOperation(capability as never, {}, 'room', 'alumno@example.test') };
}

test('S6 each queued invitation is charged to the teacher before it is enqueued', async () => {
  const f = fixture(async () => {});
  assert.equal((await f.invite()).delivery, 'queued');
  assert.deepEqual(f.events, ['create', 'admit:teacher-1', 'enqueue']);
});

test('S6 a teacher over the invitation quota gets RATE_LIMITED with the wait and nothing is enqueued', async () => {
  const f = fixture(async () => { throw Object.assign(new Error('limited'), { code: 'RATE_LIMITED', retryAfter: 120 }); });
  await assert.rejects(f.invite(), (error: { code?: string; retryAfter?: number }) => error.code === 'RATE_LIMITED' && error.retryAfter === 120);
  assert.ok(!f.events.includes('enqueue'));
});

test('S6 an unavailable admission store fails closed', async () => {
  const f = fixture(async () => { throw new Error('database down'); });
  await assert.rejects(f.invite(), { code: 'SERVICE_UNAVAILABLE' });
  assert.ok(!f.events.includes('enqueue'));
});

test('S6 the approved quota is 200 recipients per day and 60 per hour for each teacher', () => {
  assert.deepEqual(INVITATION_DELIVERY_BUDGETS, { day: { limit: 200, windowSeconds: 86400 }, hour: { limit: 60, windowSeconds: 3600 } });
});
