import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/web/src/application/academic-client.ts';
test('UI client obtains CSRF per mutation, preserves file gating and reports service errors', async () => {
  const requests = [];
  let csrfCount = 0;
  const client = createClassroomClient({
    csrfToken: async () => {
      csrfCount++;
      return 'fixture-csrf';
    },
    fetch: async (path, options) => {
      requests.push({ path, ...options });
      if (path === '/classrooms/failure')
        return new Response('{"error":{"code":"ENROLLMENT_UNAVAILABLE"}}', {
          status: 409,
        });
      if (path === '/files') return Response.json({ id: 'file' });
      if (path === '/files/file/content')
        return Response.json({
          id: 'file',
          ready: false,
          scan: 'ERROR',
          name: 'plan.pdf',
        });
      return Response.json({ ok: true });
    },
  });
  await client.call('');
  assert.equal(csrfCount, 0);
  await client.call('/codes/preview', 'POST', { code: 'typed-code' });
  assert.equal(requests.at(-1).headers['X-CSRF-Token'], 'fixture-csrf');
  assert.equal(requests.at(-1).credentials, 'same-origin');
  const result = await client.upload('draft', new File(['test'], 'plan.pdf'));
  assert.equal(result.ready, false);
  assert.equal(result.scan, 'ERROR');
  assert.equal(csrfCount, 3);
  await assert.rejects(
    client.upload('draft', new File(['x'], 'cover.png')),
    (e) => e.code === 'FILE_TYPE_NOT_ALLOWED',
  );
  await assert.rejects(
    client.call('/failure'),
    (e) => e.code === 'ENROLLMENT_UNAVAILABLE' && e.message.includes('cuenta'),
  );
  assert.equal(
    client.fileUrl('file', true),
    '/files/file/content?mode=preview',
  );
});
