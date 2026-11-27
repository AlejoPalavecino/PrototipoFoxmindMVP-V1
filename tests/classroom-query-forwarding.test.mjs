import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createServer } from 'node:http';
import { loadTsModule } from './helpers/load-ts-module.mjs';

// F2 (TASK-007): the classroom proxy forwards query strings unvalidated; the API owns the rejection.
const { createClassroomsHandler } = loadTsModule('apps/api/src/bootstrap/academic-http.ts');
const { searchClassrooms } = loadTsModule('apps/api/src/modules/classrooms/catalog/infrastructure/brujula-search.ts');
const { proxyClassroomRequest } = loadTsModule('apps/web/src/application/server/classroom-proxy.ts');

const room = 'a1111111-1111-4111-8111-111111111111';
const post = 'b1111111-1111-4111-8111-111111111111';
const member = 'c1111111-1111-4111-8111-111111111111';
const wall = `/${room}/wall`;

// Every case the proxy used to reject on its own, plus the parser contracts it duplicated.
const invalid = [
  ...['q=a&q=b', 'actor=foreign', 'cursor=forged', 'limit=100', 'q=' + 'x'.repeat(121), 'q=%00'].map(q => ['GET', `/search?${q}`]),
  ...['?limit=0', '?limit=11', '?limit=1.5', '?limit=1&limit=2', '?actor=other', `/${post}/replies?limit=21`, `/${post}?replyId=invalid`, `/${post}?limit=1`]
    .map(path => ['GET', wall + path]),
  ...['limit=0', 'limit=51', 'limit=1.5', 'limit=1&limit=2', 'unread=yes', 'unread=true&unread=false', 'cursor=', 'actor=other',
    `cursor=${'a'.repeat(2049)}`, 'kind=admin', 'kind=agenda&kind=classroom', 'kind=', 'recipient=another-user']
    .map(q => ['GET', `/notifications/page?${q}`]),
  ...['page=0', 'page=1&page=2', `teacherId=${room}`, 'classroomId=x'].map(q => ['GET', `/teacher-support?${q}`]),
  // Query strings on routes whose contract has none.
  ['GET', `/${room}/members/${member}/support?page=1`], ['GET', '/drafts?forged=1'], ['GET', '/notifications?unread=true'],
  ['GET', '?actor=other'], ['GET', `/${room}/progress?studentId=${member}`], ['GET', `/${room}/members/${member}/progress?studentId=${member}`],
  ['GET', `/${room}/attempts/${post}/grading?publish=true`], ['GET', `/${room}/attempts/${post}/result?private=true`],
  ['GET', `/${room}/attempts/${post}/grade-corrections?private=true`], ['GET', `/${room}/activity-generations/${post}?actor=${room}`],
  ['GET', `/${room}/activity-generations/sources?teacher=${room}`], ['GET', `/drafts/${room}/curriculum-extractions/${post}?actor=${room}`],
  ['POST', '/notifications/read-all?actor=other'],
  // A valid body, so only the query is out of contract while the proxy still checks wall bodies (TASK-008).
  ['POST', `${wall}?limit=1`, { revision: '1', operation: { action: 'publish', body: 'Texto' } }],
];

function exchange(handler, path, method, body = {}) {
  const req = Object.assign(new EventEmitter(), {
    url: '/classrooms' + path, method, complete: true,
    headers: method === 'GET' ? {} : { 'content-type': 'application/json' },
    pause() {}, destroy() {},
  });
  return new Promise(resolve => {
    const res = Object.assign(new EventEmitter(), {
      headers: {}, statusCode: 200, destroyed: false, writableEnded: false,
      setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
      getHeader(key) { return this.headers[key.toLowerCase()]; },
      end(value) { this.writableEnded = true; this.body = value; resolve(this); },
    });
    handler(req, res, () => { res.statusCode = 404; res.end(); });
    if (method !== 'GET') setImmediate(() => { req.emit('data', Buffer.from(JSON.stringify(body))); req.emit('end'); });
  });
}

test('the API rejects every classroom query the proxy no longer checks with 400 INVALID_INPUT before the service runs', async () => {
  const calls = [];
  let queries = 0;
  const access = {
    ports: { signingKey: Buffer.alloc(32, 7) },
    run: async (_request, _write, work) => work({ query: async () => { queries++; return []; } }, { id: member }),
  };
  const service = new Proxy({ search: (request, query) => searchClassrooms(access, request, query) },
    { get: (target, name) => target[name] ?? (async () => { calls.push(name); return {}; }) });
  const handler = createClassroomsHandler(service, { admit: async () => {} });
  for (const [method, path, body] of invalid) {
    const res = await exchange(handler, path, method, body);
    assert.equal(res.statusCode, 400, `${method} ${path}`);
    assert.deepEqual(JSON.parse(res.body), { error: { code: 'INVALID_INPUT' } }, `${method} ${path}`);
  }
  assert.deepEqual(calls, []);
  assert.equal(queries, 0);
});

async function serve(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}

test('the classroom proxy forwards those queries intact and relays the API rejection', async () => {
  const seen = [];
  const upstream = await serve((req, res) => {
    seen.push(req.url);
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end('{"error":{"code":"INVALID_INPUT","source":"api"}}');
  });
  const web = await serve((req, res) => void proxyClassroomRequest(req, res, upstream.origin));
  try {
    for (const [method, path, body = {}] of invalid) {
      const response = await fetch(`${web.origin}/api/v1/classrooms${path}`, {
        method, headers: method === 'GET' ? {} : { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : JSON.stringify(body),
      });
      assert.equal(response.status, 400, `${method} ${path}`);
      assert.deepEqual(await response.json(), { error: { code: 'INVALID_INPUT', source: 'api' } }, `${method} ${path}`);
      const sent = new URL(`/api/v1/classrooms${path}`, 'http://web.invalid');
      assert.equal(seen.at(-1), sent.pathname + sent.search, `${method} ${path}`);
    }
    assert.equal(seen.length, invalid.length);
  } finally { await web.close(); await upstream.close(); }
});
