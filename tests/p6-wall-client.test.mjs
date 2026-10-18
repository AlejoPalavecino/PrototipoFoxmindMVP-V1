import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';
import { proxyClassroomRequest } from '../apps/web/src/lib/classroom-proxy.ts';
import { createClassroomsHandler } from '../.build/api/apps/api/src/classrooms/http.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const room = 'a1111111-1111-4111-8111-111111111111';
async function server(handler) {
  const value = createServer(handler);
  await new Promise(resolve => value.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${value.address().port}`, close: () => new Promise(resolve => { value.closeAllConnections(); value.close(resolve); }) };
}
test('Muro and notifications use explicit proxy/API routes with current admission and exact envelopes', async () => {
  const calls = []; let admitted = 0;
  const service = {
    listWall: async (_req, id) => { calls.push(['wall', id]); return { revision: '0', posts: [] }; },
    changeWall: async (_req, id, body) => { calls.push(['change', id, body]); return { revision: '1' }; },
    listNotifications: async () => { calls.push(['notifications']); return []; },
    readNotification: async (_req, id) => { calls.push(['read', id]); return { read: true }; },
    openNotification: async (_req, id) => { calls.push(['open', id]); return { classroomId: room, postId: room, replyId: null }; },
    mine: async () => ({ teach: [], study: [] }),
  };
  const handler = createClassroomsHandler(service, { admit: async (req, write) => {
    admitted++; assert.equal(req.headers.cookie, 'session=controlled');
    if (write) assert.equal(req.headers['x-csrf-token'], 'fresh-csrf');
  } });
  const api = await server((req, res) => {
    req.url = req.url.replace(/^\/api\/v1/, '');
    handler(req, res, () => { res.writeHead(404); res.end('{}'); });
  });
  const web = await server((req, res) => void proxyClassroomRequest(req, res, api.origin));
  const request = async (path, method = 'GET', body) => fetch(web.origin + '/api/v1/classrooms' + path, { method,
    headers: { cookie: 'session=controlled', 'x-csrf-token': 'fresh-csrf', ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try {
    for (const [path, method, body] of [
      [`/${room}/wall`, 'GET'], [`/${room}/wall`, 'POST', { revision: '0', operation: { action: 'publish', body: 'Multi\nline' } }],
      ['/notifications', 'GET'], [`/notifications/${room}/read`, 'POST', {}], [`/notifications/${room}/open`, 'POST', {}],
    ]) assert.equal((await request(path, method, body)).status, 200, path);
    assert.deepEqual(calls.map(c => c[0]), ['wall', 'change', 'notifications', 'read', 'open']);
    assert.equal(admitted, 5);
    const before = calls.length;
    for (const [path, method, body] of [
      [`/${room}/wall`, 'POST', { revision: '0', operation: null }],
      [`/${room}/wall`, 'POST', { revision: '0', operation: { action: 'publish', body: 'Bad', authorId: room } }],
      [`/${room}/wall`, 'POST', { revision: '0', operation: { action: 'removePost', id: room, confirm: 'yes' } }],
      [`/${room}/wall`, 'POST', { revision: '0', operation: { action: 'reply', postId: room } }],
      [`/${room}/wall`, 'POST', { revision: '0', operation: { action: 'toString', body: 'Bad action' } }],
      [`/${room}/wall`, 'POST', { revision: '0', operation: { action: '__proto__', body: 'Bad action' } }],
      [`/notifications/${room}/open`, 'POST', { recipientId: room }],
      [`/${room}/wall?actor=other`, 'GET'],
    ]) assert.equal((await request(path, method, body)).status, 400, path);
    assert.equal(calls.length, before);
    for (const action of ['toString', '__proto__', 'constructor', 'unknown']) {
      const response = await fetch(`${api.origin}/api/v1/classrooms/${room}/wall`, { method: 'POST',
        headers: { cookie: 'session=controlled', 'x-csrf-token': 'fresh-csrf', 'content-type': 'application/json' },
        body: JSON.stringify({ revision: '0', operation: { action, body: 'Bad action' } }) });
      assert.equal(response.status, 400, `direct API invalid action ${action}`);
    }
    assert.equal(calls.length, before);
    // Existing class listing is still consumed through the same shared transport.
    assert.deepEqual(await (await request('')).json(), { teach: [], study: [] });
  } finally { await web.close(); await api.close(); }
});

test('classroom client carries Unicode/multiline body intact, fresh CSRF and current notification open errors', async () => {
  const calls = []; let tokens = 0;
  const api = createClassroomClient({ prefix: '/api/v1', csrfToken: async () => `token-${++tokens}`, fetch: async (path, options) => {
    calls.push({ path, ...options });
    if (path.endsWith('/open')) return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
    return Response.json({ revision: '1' });
  } });
  const body = { revision: '0', operation: { action: 'publish', body: '<script>literal</script>\n😀'.repeat(12) } };
  await api.call(`/${room}/wall`, 'POST', body);
  assert.deepEqual(JSON.parse(calls[0].body), body);
  assert.equal(calls[0].credentials, 'same-origin');
  await api.call(`/notifications/${room}/read`, 'POST', {});
  await assert.rejects(api.call(`/notifications/${room}/open`, 'POST', {}), { code: 'FORBIDDEN', status: 403 });
  assert.deepEqual(calls.map(c => c.headers['X-CSRF-Token']), ['token-1', 'token-2', 'token-3']);
  assert.equal(calls[0].path, `/api/v1/classrooms/${room}/wall`);
});

test('actual Muro content renderer escapes markup and renders removed markers rather than hidden original text', () => {
  // Compile the actual trusted TSX modules in memory; no emitted workspace files or synthetic renderer.
  const require = createRequire(import.meta.url), cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} }; cache.set(path, module);
    const { outputText } = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023,
    } });
    new Function('require', 'module', 'exports', outputText)(specifier => specifier.startsWith('.')
      ? load(resolve(dirname(path), specifier)) : require(specifier), module, module.exports);
    return module.exports;
  }
  const { WallContentView } = load(resolve('apps/classrooms-ui/Wall.tsx'));
  const content = { id: room, authorName: '<img src=x onerror=alert(1)>', initials: '<>',
    body: '<script>alert(1)</script>\nPlain & safe', createdAt: '2026-10-18T12:00:00Z', editedAt: null, removedAt: null, canEdit: false, canRemove: false };
  const html = renderToStaticMarkup(React.createElement(WallContentView, { content }));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;\nPlain &amp; safe/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script|<img|dangerouslySetInnerHTML/);
  const removed = renderToStaticMarkup(React.createElement(WallContentView, { content: { ...content, removedAt: '2026-10-18T13:00:00Z' } }));
  assert.match(removed, /Contenido eliminado/);
  assert.doesNotMatch(removed, /Plain &amp; safe|&lt;script&gt;/);
});
