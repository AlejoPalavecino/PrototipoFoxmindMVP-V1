import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyResourceService } from './resource-service.ts';

const owner = '10000000-0000-4000-8000-000000000001', id = '10000000-0000-4000-8000-000000000002';
const requestId = '10000000-0000-4000-8000-000000000003';
function fixture() {
  const events = [], tx = {}, uow = { async run(request, write, operation) { assert.equal(write, true); events.push('authorized-tx'); return operation(tx, { id: owner }); } };
  const resources = { async edit(received, actor, resource, command) { assert.equal(received, tx); assert.equal(actor, owner); assert.equal(resource, id); events.push('edit'); return command; } };
  return { events, service: createFoxyResourceService({ uow, resources, prepareActivity() {} }) };
}

test('resource application rejects oversized editorial content before invoking its persistence port', async () => {
  const { service, events } = fixture();
  await assert.rejects(service.edit({}, id, { requestId, revision: '0', title: 'Title', markdown: 'x'.repeat(50001) }), { code: 'INVALID_INPUT' });
  assert.deepEqual(events, ['authorized-tx']);
});

test('resource application keeps accepted spelling and codepoint limits when forwarding a command', async () => {
  const { service, events } = fixture(), input = { requestId, revision: '0', title: '  Title  ', markdown: '\u{1f98a}'.repeat(50000) };
  assert.deepEqual(await service.edit({}, id, input), input);
  assert.deepEqual(events, ['authorized-tx', 'edit']);
});
