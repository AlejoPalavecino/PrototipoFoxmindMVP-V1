import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
test('P5 opt-in HTTP validates admission, request shape and private response headers', async (t) => {
  const { createClassroomsHandler } =
    await import("../.build/api/apps/api/src/bootstrap/academic-http.js");
  assert.throws(() => createClassroomsHandler({}, {}));
  const calls = [];
  const service = {
    mine: async () => ({ teach: [], study: [] }),
    previewCode: async (req, code) => {
      calls.push(code);
      return { confirmation: 'server-confirmation' };
    },
  };
  const handler = createClassroomsHandler(service, {
    admit: async (req, write) => {
      if (req.headers['x-fixture-csrf'] !== 'valid' && write)
        throw new Error('deny');
    },
  });
  const server = createServer((req, res) =>
    handler(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await t.test(
      'private reads set no-store/nosniff and return real service output',
      async () => {
        const res = await fetch(url + '/classrooms');
        assert.equal(res.status, 200);
        assert.equal(res.headers.get('cache-control'), 'no-store');
        assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
        assert.deepEqual(await res.json(), { teach: [], study: [] });
      },
    );
    await t.test(
      'mutation without admission is rejected before service invocation',
      async () => {
        const res = await fetch(url + '/classrooms/codes/preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"code":"example"}',
        });
        assert.equal(res.status, 403);
        assert.equal(calls.length, 0);
      },
    );
    await t.test(
      'JSON shape rejects forged authority and valid preview stays read-only enrollment',
      async () => {
        for (const body of [
          '{"code":"example","ownerId":"forged"}',
          '[]',
          '{invalid',
        ]) {
          const res = await fetch(url + '/classrooms/codes/preview', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-fixture-csrf': 'valid',
            },
            body,
          });
          assert.equal(res.status, 400);
        }
        const res = await fetch(url + '/classrooms/codes/preview', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-fixture-csrf': 'valid',
          },
          body: '{"code":"example"}',
        });
        assert.equal(res.status, 200);
        assert.deepEqual(await res.json(), {
          confirmation: 'server-confirmation',
        });
        assert.deepEqual(calls, ['example']);
      },
    );
    await t.test(
      'unsupported methods, foreign paths and non-JSON bodies are rejected',
      async () => {
        assert.equal(
          (await fetch(url + '/classrooms', { method: 'DELETE' })).status,
          405,
        );
        assert.equal((await fetch(url + '/unrelated')).status, 404);
        assert.equal(
          (
            await fetch(url + '/classrooms/codes/preview', {
              method: 'POST',
              headers: { 'x-fixture-csrf': 'valid' },
              body: '{}',
            })
          ).status,
          400,
        );
      },
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
