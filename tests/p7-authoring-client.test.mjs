import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/web/src/application/academic-client.ts';

test('authoring client retains plan/material transport after retiring the unused instruction-upload helper', async () => {
  const calls = [];
  const api = createClassroomClient({ csrfToken: async () => 'fresh', fetch: async (path, options) => {
    calls.push({ path, ...options }); return Response.json({ id: 'file', ready: true });
  } });
  assert.equal(api.uploadInstruction, undefined);
  await api.upload('draft', new File(['x'], 'plan.docx'));
  assert.deepEqual(JSON.parse(calls.at(-2).body), { scope: { kind: 'draft', id: 'draft' }, purpose: 'plan', name: 'plan.docx', bytes: 1 });
  assert.equal(calls.at(-1).method, 'PUT');assert.equal(calls.at(-1).headers['X-CSRF-Token'],'fresh');
  await api.uploadClassroom('room', new File(['x'], 'material.zip'), 'material');
  assert.deepEqual(JSON.parse(calls.at(-2).body), { scope: { kind: 'classroom', id: 'room' }, purpose: 'material', name: 'material.zip', bytes: 1 });
});
