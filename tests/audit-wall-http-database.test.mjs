import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { withGradingFixture } from './p8-grading-helpers.mjs';
import { createClassroomsHandler } from '../.build/api/apps/api/src/classrooms/http.js';
import { proxyClassroomRequest } from '../apps/web/src/lib/classroom-proxy.ts';
async function server(handler) { const s = createServer(handler); await new Promise(resolve => s.listen(0, '127.0.0.1', resolve)); return { url: `http://127.0.0.1:${s.address().port}`, close: () => new Promise(resolve => { s.closeAllConnections(); s.close(resolve); }) }; }
test('HTTP proxy and API traverse wall exceeding proxy limit via bounded database pages', { timeout: 120000 }, async () => {
  await withGradingFixture(async f => {
    await f.pool.query(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body,created_at)
      SELECT gen_random_uuid(),now(),$1::uuid,$2::uuid,'NOTICE',repeat('x',5000),
      '2026-01-01T00:00:00Z'::timestamptz + ((n / 3) * interval '1 microsecond') FROM generate_series(1,430) n`, [f.room, f.teacher]);
    const expected = (await f.pool.query('SELECT id FROM wall_posts WHERE classroom_id=$1 ORDER BY created_at DESC,id', [f.room])).rows.map(r => r.id);
    const handler = createClassroomsHandler(f.service, { admit: async () => {} });
    const api = await server((req, res) => { req.actor = f.student; req.url = req.url.replace(/^\/api\/v1/, ''); handler(req, res, () => { res.writeHead(404); res.end('{}'); }); });
    const web = await server((req, res) => void proxyClassroomRequest(req, res, api.url));
    try {
      const found = []; let cursor;
      do {
        const suffix = cursor ? `?limit=10&cursor=${encodeURIComponent(cursor)}` : '?limit=10';
        const response = await fetch(`${web.url}/api/v1/classrooms/${f.room}/wall${suffix}`, { headers: { cookie: 'fixture=session' } });
        assert.equal(response.status, 200); const body = await response.text(); assert.ok(Buffer.byteLength(body) < 2 * 1024 * 1024);
        const page = JSON.parse(body); assert.ok(page.posts.length <= 10); found.push(...page.posts.map(post => post.id));
        cursor = page.nextCursor; assert.ok(found.length <= expected.length);
      } while (cursor);
      assert.deepEqual(found, expected);
      const target = await fetch(`${web.url}/api/v1/classrooms/${f.room}/wall/${expected.at(-1)}`, { headers: { cookie: 'fixture=session' } });
      assert.equal(target.status, 200); assert.equal((await target.json()).post.id, expected.at(-1));
    } finally { await web.close(); await api.close(); }
  });
});
