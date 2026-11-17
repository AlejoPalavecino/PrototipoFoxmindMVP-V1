import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyCitationService } from './citation-service.ts';
const ownerId = '10000000-0000-4000-8000-000000000001', conversationId = '10000000-0000-4000-8000-000000000002';
const turnId = '10000000-0000-4000-8000-000000000003', attachmentId = '10000000-0000-4000-8000-000000000004';
function fixture({ available = true, linked = true, forbidden = false } = {}) {
  const events = [], tx = { query() { throw new Error('application must not issue SQL'); } };
  const citations = {
    async loadTurn(received, owner, conversation, turn) { assert.equal(received, tx); assert.equal(owner, ownerId); assert.equal(conversation, conversationId); assert.equal(turn, turnId); events.push('authorized-turn'); if (forbidden) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' }); return { classroom_id: null, answer: {}, snapshot: { context: { kind: 'GENERAL' } } }; },
    map() { return [{ citationKey: 'c1', sourceId: 'attachment:' + attachmentId, sourceKind: 'ATTACHMENT', sourceTitle: 'Private ' + attachmentId, documentKey: null, page: null, available, file: null }]; },
    async attachment(received, input) { assert.equal(received, tx); assert.deepEqual(input, { attachmentId, ownerId, conversationId }); events.push('linked-attachment'); return linked; },
  };
  const uow = { run(request, write, run) { assert.equal(write, false); return run(tx, { id: ownerId }); } };
  return { service: createFoxyCitationService({ uow, citations }), events };
}

test('attachment citation uses its scoped repository port within the authorized caller transaction', async () => {
  const { service, events } = fixture(); const [citation] = await service.list({}, conversationId, turnId);
  assert.equal(citation.availability, 'TEXT_ONLY'); assert.equal(citation.href, null);
  assert.equal(citation.sourceTitle, 'Private [identificador]');
  assert.deepEqual(events, ['authorized-turn', 'linked-attachment']);
});

test('unlinked or unavailable attachment citations never become readable', async () => {
  for (const options of [{ linked: false }, { available: false }]) {
    const { service, events } = fixture(options), [citation] = await service.list({}, conversationId, turnId);
    assert.equal(citation.availability, 'UNAVAILABLE'); assert.equal(citation.href, null);
    assert.deepEqual(events, options.available === false ? ['authorized-turn'] : ['authorized-turn', 'linked-attachment']);
  }
});

test('an unauthorized turn stops before resolving any attachment', async () => {
  const { service, events } = fixture({ forbidden: true });
  await assert.rejects(service.list({}, conversationId, turnId), { code: 'NOT_FOUND' });
  assert.deepEqual(events, ['authorized-turn']);
});
