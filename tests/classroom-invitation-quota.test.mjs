import test from 'node:test';
import assert from 'node:assert/strict';

test('S6 the integrated classroom composition charges invitations to per-teacher day and hour buckets', async () => {
  const { invitationDeliveryAdmission } = await import('../.build/api/apps/api/src/bootstrap/academic-classrooms.module.js');
  const calls = [];
  const admit = invitationDeliveryAdmission({ admitBuckets: async (buckets) => { calls.push(buckets); } });
  await admit('teacher-1');
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], [
    { action: 'general-identity', namespace: 'identifier', subject: 'classroom-invitation:day:teacher-1', budget: { limit: 200, windowSeconds: 86400 } },
    { action: 'general-identity', namespace: 'identifier', subject: 'classroom-invitation:hour:teacher-1', budget: { limit: 60, windowSeconds: 3600 } },
  ]);
});
