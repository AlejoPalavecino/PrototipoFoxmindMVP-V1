import test from 'node:test';
import assert from 'node:assert/strict';
import { createFileClient, FileClientError, parseFileContext, fileState } from '../apps/web/src/features/files/api/client.ts';

const id = '11111111-1111-4111-8111-111111111111';
test('processing unavailability remains retryable pending while genuine rejection blocks use', () => {
  assert.equal(fileState({ ready: false, rejectionCode: 'PROCESSING_UNAVAILABLE', validation: 'APPROVED', scan: 'ERROR' }), 'pending');
  assert.equal(fileState({ ready: false, rejectionCode: 'FILE_REJECTED', validation: 'REJECTED', scan: 'REJECTED' }), 'rejected');
  assert.equal(fileState({ ready: false, rejectionCode: null, validation: 'APPROVED', scan: 'CLEAN' }), 'pending');
  assert.equal(fileState({ ready: true, rejectionCode: null, validation: 'APPROVED', scan: 'CLEAN' }), 'ready');
});
test('context requires exact singular kind/id/purpose and never invents a permission', () => {
  assert.deepEqual(parseFileContext({ kind: 'draft', id, purpose: 'plan' }), { kind: 'draft', id, purpose: 'plan' });
  for (const query of [{ kind: 'draft', id }, { kind: ['draft'], id, purpose: 'plan' }, { kind: 'draft', id, purpose: 'material' }, { kind: 'classroom', id: '../x', purpose: 'material' }]) assert.equal(parseFileContext(query), null);
});
test('metadata and bytes use distinct fresh CSRF bindings and real cookie transport', async () => {
  const calls = []; let csrf = 0;
  const pending = { id, ready: false, upload: 'pending', name: 'plan.pdf', sizeBytes: 3 };
  const client = createFileClient(async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/csrf')) return Response.json({ csrfToken: `binding-${++csrf}` });
    return Response.json(pending);
  });
  const file = new File(['abc'], 'plan.pdf');
  const result = await client.upload({ kind: 'draft', id, purpose: 'plan' }, file);
  assert.equal(result.ready, false);
  assert.deepEqual(calls.map(call => call.url), ['/api/v1/auth/csrf', '/api/v1/files', '/api/v1/auth/csrf', `/api/v1/files/${id}/content`]);
  assert.equal(calls[1].init.headers['X-CSRF-Token'], 'binding-1');
  assert.equal(calls[3].init.headers['X-CSRF-Token'], 'binding-2');
  assert.equal(calls[3].init.body, file);
  assert.equal(calls[3].init.headers['Content-Type'], 'application/octet-stream');
  assert.equal(calls[3].init.credentials, 'same-origin');
  assert.equal(calls[3].init.headers['Content-Length'], undefined);
});
test('safe errors retain quota and retry details; failed CSRF never uploads', async () => {
  let calls = 0;
  const client = createFileClient(async () => { calls++; return Response.json({ error: { code: 'QUOTA_EXCEEDED', detail: 'private' } }, { status: 409, headers: { 'retry-after': '3' } }); });
  await assert.rejects(client.upload({ kind: 'draft', id, purpose: 'plan' }, new File(['a'], 'a.pdf')), error => error instanceof FileClientError && error.code === 'QUOTA_EXCEEDED' && error.retryAfter === 3 && !error.message.includes('private'));
  assert.equal(calls, 1);
});
