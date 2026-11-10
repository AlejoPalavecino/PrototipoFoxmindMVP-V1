import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHomeHandler } from '../apps/api/src/modules/home/presentation/http.ts';
import { proxyHomeRequest } from '../apps/web/src/application/server/home-proxy.ts';

const subjectId = '11111111-1111-4111-8111-111111111111';
const page = () => ({ status: 'ready', items: [], totalItems: 0, nextCursor: null });
const payload = () => ({ version: 1, subjectId, generatedAt: '2026-10-25T12:00:00.000Z', timeZone: 'UTC',
  participation: 'none', memberships: { study: 0, teach: 0, archived: 0 }, setup: { drafts: 0, invitations: 0 },
  modules: Object.fromEntries(['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'].map(name => [name, page()])) });
async function server(handler, run) {
  const host = createServer(handler); await new Promise(resolve => host.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${host.address().port}`); }
  finally { host.closeAllConnections(); await new Promise(resolve => host.close(resolve)); }
}

test('D9 HTTP route admits read-only requests, rejects repeated/unknown authority and exposes no home/open', async () => {
  const calls = [], admissions = [], home = { read: async (_req, query) => { calls.push(query); return payload(); },
    page: async (_req, query) => { calls.push(query); return { subjectId, generatedAt: payload().generatedAt, module: query.module, page: page() }; } };
  const handler = createHomeHandler(home, { admit: async (_req, write) => admissions.push(write) });
  await server((req, res) => handler(req, res, () => { res.writeHead(404); res.end(); }), async origin => {
    const good = await fetch(`${origin}/home?timeZone=UTC`); assert.equal(good.status, 200); assert.equal(good.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await good.json(), payload());
    for (const suffix of ['?timeZone=UTC&timeZone=UTC', '?timeZone=UTC&role=teacher', '?timeZone=UTC&actor=forged'])
      assert.equal((await fetch(`${origin}/home${suffix}`)).status, 400);
    assert.equal((await fetch(`${origin}/home/open`)).status, 404);
    assert.equal((await fetch(`${origin}/home?timeZone=UTC`, { method: 'POST' })).status, 405);
    const retry = await fetch(`${origin}/home/modules/pending?timeZone=UTC&cursor=opaque`); assert.equal(retry.status, 200);
    assert.deepEqual(calls, [{ timeZone: 'UTC' }, { timeZone: 'UTC', cursor: 'opaque', module: 'pending' }]);
    assert.ok(admissions.every(write => write === false));
  });
});

test('D9 HTTP global identity errors preserve status/code and conceal unrecognized server exceptions', async () => {
  for (const [code, status] of [['AUTH_REQUIRED', 401], ['EMAIL_VERIFICATION_REQUIRED', 403], ['PRIVATE_SQL_FAILURE', 503]]) {
    const handler = createHomeHandler({ read: async () => { throw Object.assign(new Error('private SQL detail'), { code }); } }, { admit: async () => {} });
    await server((req, res) => handler(req, res, () => res.end()), async origin => {
      const result = await fetch(`${origin}/home?timeZone=UTC`); assert.equal(result.status, status);
      assert.deepEqual(await result.json(), { error: { code: code === 'PRIVATE_SQL_FAILURE' ? 'SERVICE_UNAVAILABLE' : code } });
    });
  }
});

test('D9 proxy forwards only necessary headers and validates returned success contracts', async () => {
  const observed = []; let bad = false;
  await server((req, res) => {
    observed.push(req.headers); res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'synthetic=session; HttpOnly; SameSite=Lax' });
    res.end(JSON.stringify(bad ? { ...payload(), editorToken: 'private' } : payload()));
  }, async apiOrigin => server((req, res) => void proxyHomeRequest(req, res, apiOrigin), async webOrigin => {
    const result = await fetch(`${webOrigin}/api/v1/home?timeZone=UTC`, { headers: { Cookie: 'synthetic=fixture', Authorization: 'must-not-forward', 'X-Actor': subjectId } });
    assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.equal(observed[0].cookie, 'synthetic=fixture'); assert.equal(observed[0].authorization, undefined); assert.equal(observed[0]['x-actor'], undefined);
    bad = true; const invalid = await fetch(`${webOrigin}/api/v1/home?timeZone=UTC`);
    assert.equal(invalid.status, 503); assert.doesNotMatch(await invalid.text(), /editorToken|private/);
  }));
});
