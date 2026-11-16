import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/web/src/application/academic-client.ts';

test('Library client uploads every approved material format with material scope and fresh CSRF', async () => {
  const calls = []; let tokens = 0;
  const api = createClassroomClient({ prefix: '/api/v1', csrfToken: async () => String(++tokens), fetch: async (path, options) => {
    calls.push({ path, ...options });
    return Response.json(path === '/api/v1/files' ? { id: 'file' } : { id: 'file', ready: true });
  } });
  for (const extension of ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xlsx', 'jpg', 'jpeg', 'png', 'zip']) {
    assert.equal((await api.uploadClassroom('room', new File(['bytes'], `guide.${extension}`), 'material')).ready, true);
    assert.deepEqual(JSON.parse(calls.at(-2).body), { scope: { kind: 'classroom', id: 'room' }, purpose: 'material', name: `guide.${extension}`, bytes: 5 });
    assert.equal(calls.at(-1).headers['X-CSRF-Token'], String(tokens));
  }
  await assert.rejects(api.uploadClassroom('room', new File(['x'], 'guide.docm'), 'material'), { code: 'MATERIAL_FILE_TYPE_NOT_ALLOWED' });
  for (const extension of ['pdf', 'doc', 'docx', 'ppt', 'pptx']) {
    const name = `plan.${extension}`;
    assert.equal((await api.uploadClassroom('room', new File(['bytes'], name), 'plan')).ready, true);
    assert.deepEqual(JSON.parse(calls.at(-2).body), { scope: { kind: 'classroom', id: 'room' }, purpose: 'plan', name, bytes: 5 });
    assert.equal(calls.at(-1).headers['X-CSRF-Token'], String(tokens));
  }
  const before = calls.length;
  await assert.rejects(api.uploadClassroom('room', new File(['x'], 'plan.xlsx'), 'plan'), { code: 'FILE_TYPE_NOT_ALLOWED' });
  await assert.rejects(api.uploadClassroom('room', new File([new Uint8Array(20_000_001)], 'guide.pdf'), 'material'), { code: 'MATERIAL_FILE_TOO_LARGE' });
  await assert.rejects(api.uploadClassroom('room', new File([new Uint8Array(50_000_001)], 'guide.zip'), 'material'), { code: 'MATERIAL_FILE_TOO_LARGE' });
  assert.equal(calls.length, before);
  await api.call('/room/library', 'POST', { revision: '1', operation: { action: 'delete', id: 'material', confirm: true } });
  assert.equal(calls.at(-1).path, '/api/v1/classrooms/room/library');
  assert.equal(calls.at(-1).headers['X-CSRF-Token'], String(tokens));
  assert.equal(api.fileUrl('file', true), '/api/v1/files/file/content?mode=preview');
});

test('Library preview only permits ready PDF/images and never implies a custom Office/ZIP viewer', async () => {
  const { canPreviewMaterial } = await import('../apps/web/src/features/materials/api.ts');
  for (const extension of ['pdf', 'jpg', 'jpeg', 'png']) assert.equal(canPreviewMaterial({ extension, ready: true, deleted: false }), true);
  for (const extension of ['docx', 'pptx', 'xlsx', 'zip']) assert.equal(canPreviewMaterial({ extension, ready: true, deleted: false }), false);
  assert.equal(canPreviewMaterial({ extension: 'pdf', ready: false, deleted: false }), false);
  assert.equal(canPreviewMaterial({ extension: 'pdf', ready: true, deleted: true }), false);
});

test('Library server security rejection keeps material copy while draft plan behavior stays unchanged', async () => {
  const api = createClassroomClient({ csrfToken: async () => 'csrf', fetch: async () =>
    Response.json({ error: { code: 'FILE_REJECTED' } }, { status: 422 }) });
  await assert.rejects(api.uploadClassroom('room', new File(['unsafe'], 'guide.zip'), 'material'), e =>
    e.code === 'MATERIAL_FILE_REJECTED' && e.status === 422 && !e.message.includes('DOCX'));
  await assert.rejects(api.upload('draft', new File(['unsafe'], 'plan.pdf')), { code: 'FILE_REJECTED' });
});
