import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';

test('instruction upload uses its classroom/activity target without altering old plan/material requests', async () => {
  const calls = [];
  const api = createClassroomClient({ csrfToken: async () => 'fresh', fetch: async (path, options) => {
    calls.push({ path, ...options }); return Response.json({ id: 'file', ready: true });
  } });
  assert.equal(typeof api.uploadInstruction, 'function');
  await api.uploadInstruction('room', 'activity', new File(['bytes'], 'instruction.pdf'));
  assert.deepEqual(JSON.parse(calls[0].body), { scope: { kind: 'classroom', id: 'room' }, purpose: 'instructions', targetId: 'activity', name: 'instruction.pdf', bytes: 5 });
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].headers['X-CSRF-Token'], 'fresh');
  const count = calls.length;
  await assert.rejects(api.uploadInstruction('room', 'activity', new File(['x'], 'instruction.zip')), { code: 'FILE_TYPE_NOT_ALLOWED' });
  await assert.rejects(api.uploadInstruction('room', 'activity', new File([new Uint8Array(20_000_001)], 'instruction.pdf')), { code: 'FILE_TOO_LARGE' });
  assert.equal(calls.length, count);
  await api.upload('draft', new File(['x'], 'plan.docx'));
  assert.deepEqual(JSON.parse(calls.at(-2).body), { scope: { kind: 'draft', id: 'draft' }, purpose: 'plan', name: 'plan.docx', bytes: 1 });
  await api.uploadClassroom('room', new File(['x'], 'material.zip'), 'material');
  assert.deepEqual(JSON.parse(calls.at(-2).body), { scope: { kind: 'classroom', id: 'room' }, purpose: 'material', name: 'material.zip', bytes: 1 });
});
