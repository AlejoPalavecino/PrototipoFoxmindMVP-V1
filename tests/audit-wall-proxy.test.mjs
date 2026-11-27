import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

const room = 'a1111111-1111-4111-8111-111111111111';
const post = 'b1111111-1111-4111-8111-111111111111';
const reply = 'c1111111-1111-4111-8111-111111111111';
async function server(handler) {
  const s = createServer(handler);
  await new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${s.address().port}`, close: () => new Promise(resolve => { s.closeAllConnections(); s.close(resolve); }) };
}
async function fixture(run) {
  const calls = [];
  const upstream = await server((req, res) => { calls.push({ url: req.url, cookie: req.headers.cookie }); res.setHeader('content-type', 'application/json'); res.end('{}'); });
  const web = await server((req, res) => void proxyClassroomRequest(req, res, upstream.origin));
  try { await run(web.origin + `/api/v1/classrooms/${room}/wall`, calls); }
  finally { await web.close(); await upstream.close(); }
}

test('proxy forwards only the paginated wall and targeted thread query contract', async () => {
  await fixture(async (root, calls) => {
    const paths = ['?limit=10&cursor=opaque', `/${post}`, `/${post}/replies?limit=20&cursor=opaque`, `/${post}?replyId=${reply}`];
    for (const path of paths) {
      const res = await fetch(root + path, { headers: { cookie: 'fixture=session' } });
      assert.equal(res.status, 200, path);
      assert.equal(calls.at(-1).url, `/api/v1/classrooms/${room}/wall${path}`);
      assert.equal(calls.at(-1).cookie, 'fixture=session');
    }
  });
});

test('proxy forwards invalid limits, duplicate and foreign query keys intact so the API rejects them (F2)', async () => {
  await fixture(async (root, calls) => {
    for (const path of ['?limit=0', '?limit=11', '?limit=1.5', '?limit=1&limit=2', '?actor=other', `/${post}/replies?limit=21`, `/${post}?replyId=invalid`]) {
      const res = await fetch(root + path);
      assert.equal(res.status, 200, path);
      assert.equal(calls.at(-1).url, `/api/v1/classrooms/${room}/wall${path}`, path);
    }
  });
});
