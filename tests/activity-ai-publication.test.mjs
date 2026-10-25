import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';

test('A3 AI-disabled module composition still rejects publication of a generated draft with changed curriculum', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await import('../apps/api/src/classrooms/activity-ai/index.ts');
  const { ClassroomsModule } = await import('../.build/api/apps/api/src/classrooms/classrooms.module.js');
  const { FileService } = await import('../.build/api/apps/api/src/files/index.js');
  await withAiDatabase(async local => {
    const f = await fixture(local), service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    await new ActivityAiWorker(f.options).runOnce();
    assert.equal((await service.get(f.T, f.room, view.id)).state, 'READY');
    const applied = await service.apply(f.T, f.room, view.id, { revision: await f.revision(), requestId: randomUUID(), proposal: f.proposal });
    await f.plan({ action: 'renameTopic', id: f.topicIds[0], name: 'Curriculum changed after applying' });
    const files = new FileService({ database: local.database, draftQuotaBytes: 100000000n,
      access: { authenticate: async (_tx, req) => req.actor, authorize: async () => {} },
      storage: { get: async () => { throw new Error('Publication must not read document bytes'); } }, scanner: { scan: async () => {} } });
    const config = { signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' };
    const module = ClassroomsModule.integrated({}, {}, {}, config, { send: async () => {}, close() {} }, undefined);
    const serviceFactory = module.providers.find(provider => provider.provide?.name === 'InvitationService');
    assert.ok(serviceFactory?.useFactory);
    const restarted = serviceFactory.useFactory(local.database, { configuration: { security: {} } }, files);
    // Synthetic identity port isolates composition/provenance from unrelated password/session issuance.
    restarted.ports.authenticate = async (_tx, req) => req.actor;
    const calls = [...f.calls];
    await assert.rejects(restarted.changeActivities(f.T, f.room, { revision: await f.revision(), operation: { action: 'publish', id: applied.activityId } }), { code: 'CONFLICT' });
    assert.deepEqual(f.calls, calls, 'Disabling AI never constructs or dispatches a generation provider for validation');
    assert.equal((await f.classrooms.activityDetail(f.T, f.room, applied.activityId, true)).activity.status, 'DRAFT');
    assert.equal((await f.classrooms.listActivities(f.S, f.room)).activities.length, 0);
  });
});
