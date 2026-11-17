import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProposal } from './apply.ts';

test('replayed apply returns the persisted receipt without creating another draft', async () => {
  const tx = { synthetic: true };
  const row = { id: 'job', state: 'APPLIED', applied_activity_id: 'activity', applied_revision: 7n };
  const ports = { replay: async transaction => { assert.equal(transaction, tx); return 'job'; } };
  assert.deepEqual(await applyProposal(ports, {}, tx, {}, row, { id: 'teacher' }, 99n,
    { requestId: 'receipt', revision: '0' }, 'hash'), { generationId: 'job', activityId: 'activity', revision: '7' });
});

for (const [name, row, replay, revision, body] of [
  ['receipt belongs to another job', { id: 'job', state: 'APPLIED' }, 'other', 2n, { revision: '2' }],
  ['receipt has no applied result', { id: 'job', state: 'READY' }, 'job', 2n, { revision: '2' }],
  ['classroom revision changed', { id: 'job', state: 'READY' }, null, 3n, { revision: '2' }],
  ['generated proposal revision changed', { id: 'job', state: 'READY', base_revision: 1n,
    input_payload: { teacherBrief: 'brief' } }, null, 2n, { revision: '2' }],
]) {
  test(`apply rejects ${name} before writing`, async () => {
    const ports = { replay: async () => replay, createDraft: async () => { throw Error('unexpected write'); } };
    await assert.rejects(applyProposal(ports, {}, {}, {}, row, { id: 'teacher' }, revision, body, 'hash'), { code: 'CONFLICT' });
  });
}
