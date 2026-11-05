import test from 'node:test';
import assert from 'node:assert/strict';

const resource = { id: 'a1111111-1111-4111-8111-111111111111', revision: '2', title: 'Recurso', markdown: 'Consigna revisable.' };
const room = { id: 'b1111111-1111-4111-8111-111111111111', role: 'teacher', archived: false, revision: '4', units: [{ id: 'c1111111-1111-4111-8111-111111111111', topics: [{ id: 'd1111111-1111-4111-8111-111111111111' }] }] };
const payload = { title: 'Actividad revisada', objective: 'Comprender.', teacherComment: '', instructions: 'Explicá el concepto.', unitId: room.units[0].id, topicIds: [room.units[0].topics[0].id], evaluationRubric: [{ name: 'Conceptos', description: 'Relaciona.', weight: 100 }] };

test('Foxy handoff requires saved clean source and explicit review; retry reuses the same request', async () => {
  const { createFoxyActivityHandoff } = await import('../apps/web/src/lib/foxy-activity-handoff.ts');
  let dirty = false, attempts = 0; const calls = [];
  const controller = createFoxyActivityHandoff({ source: () => ({ resource, dirty, busy: false, pending: null }),
    prepare: async (id, input) => { calls.push({ id, input }); if (++attempts === 1) throw new Error('network'); return { activityId: resource.id, classroomId: room.id, revision: '5' }; },
    onChange: () => {}, uuid: () => 'e1111111-1111-4111-8111-111111111111' });
  dirty = true; assert.equal(controller.review(room, payload), false); assert.equal(calls.length, 0);
  dirty = false; assert.equal(controller.review(room, payload), true); assert.equal(calls.length, 0);
  await controller.confirm(); assert.equal(controller.getState().receipt, null); assert.equal(controller.getState().pending, true);
  await controller.retry(); assert.equal(calls.length, 2); assert.deepEqual(calls[0], calls[1]);
  assert.equal(controller.getState().receipt.activityId, resource.id);
});

test('Foxy handoff refuses invalid criteria, archived destinations and changed source after review', async () => {
  const { createFoxyActivityHandoff } = await import('../apps/web/src/lib/foxy-activity-handoff.ts');
  let current = resource; const calls = [];
  const controller = createFoxyActivityHandoff({ source: () => ({ resource: current, dirty: false, busy: false, pending: null }),
    prepare: async (...args) => { calls.push(args); }, onChange: () => {} });
  assert.equal(controller.review({ ...room, archived: true }, payload), false);
  assert.equal(controller.review(room, { ...payload, evaluationRubric: [{ ...payload.evaluationRubric[0], weight: 80 }] }), false);
  assert.equal(controller.review(room, payload), true); current = { ...resource, revision: '3' };
  await controller.confirm(); assert.equal(calls.length, 0);
});

test('Foxy handoff discard fences a late receipt from the abandoned review', async () => {
  const { createFoxyActivityHandoff } = await import('../apps/web/src/lib/foxy-activity-handoff.ts');
  let resolve;
  const controller = createFoxyActivityHandoff({ source: () => ({ resource, dirty: false, busy: false, pending: null }),
    prepare: () => new Promise(done => { resolve = done; }), onChange: () => {} });
  controller.review(room, payload); const saving = controller.confirm();
  controller.discard(); resolve({ classroomId: room.id, activityId: resource.id, revision: '5' }); await saving;
  assert.equal(controller.getState().receipt, null); assert.equal(controller.getState().pending, false);
});
