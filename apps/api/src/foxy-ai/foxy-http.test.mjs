import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { randomUUID } from 'node:crypto';

const id = randomUUID(), turnId = randomUUID(), base = '/api/v1/foxy-ai', conversation = { id, title: 'Chat', context: { kind: 'GENERAL' }, revision: '0' };
const creation = { requestId: randomUUID(), title: 'Chat', context: { kind: 'GENERAL' } };
const message = { requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Hola', selection: { topicIds: [], sourceIds: [] } };
async function fixture(run) {
  const api = await import('./index.ts'); assert.equal(typeof api.createFoxyHandler, 'function');
  const calls = [], admissions = []; let created = true, sent = true;
  const record = (name, value) => async (...args) => { calls.push([name, ...args.slice(1)]); return typeof value === 'function' ? value() : value; };
  const conversations = { create: record('create', () => { const result = { created, conversation }; created = false; return result; }),
    list: record('list', { items: [conversation], next: null }), get: record('get', conversation), rename: record('rename', conversation), remove: record('remove') };
  const turns = { send: record('send', () => { const result = { created: sent, turn: { id: turnId, sequence: 1, state: 'QUEUED' }, conversationRevision: '1' }; sent = false; return result; }),
    get: record('getTurn', { id: turnId, sequence: 1, state: 'QUEUED' }), list: record('listTurns', { items:[], nextAfterSequence:null }) };
  const catalog = { curriculum: record('curriculum', { units: [] }), sources: record('sources', { items: [], next: null }) };
  const capabilities = record('capabilities', { text: true });
  const citations = { list: record('citationList', [{ id:'c1', sourceTitle:'Actividad', sourceKind:'ACTIVITY', documentTitle:'guia.pdf', page:1, availability:'AVAILABLE', href:`${base}/conversations/${id}/turns/${turnId}/citations/c1/file` }]), readFile: record('citationFile', { bytes:Buffer.from('%PDF-synthetic'), headers:{ 'Content-Type':'application/pdf', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' } }) };
  const handler = api.createFoxyHandler({ conversations, turns, catalog, capabilities, citations }, { admit: async (req, write) => {
    admissions.push(write); if (req.headers.cookie !== 'session=synthetic') throw Object.assign(Error('private'), { code: 'AUTH_REQUIRED' });
    if (write && req.headers.origin !== 'http://web.test') throw Object.assign(Error('private'), { code: 'ORIGIN_NOT_ALLOWED' });
    if (write && req.headers['x-csrf-token'] !== 'bound') throw Object.assign(Error('private'), { code: 'CSRF_INVALID' });
  } });
  const server = createServer((req, res) => void handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const send = (path, method = 'GET', body, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}${base}${path}`, {
    method, headers: { 'content-type': 'application/json', cookie: 'session=synthetic', origin: 'http://web.test', 'x-csrf-token': 'bound', ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' || body instanceof Uint8Array ? body : JSON.stringify(body) }),
  });
  try { await run({ send, calls, admissions, port: server.address().port }); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('HTTP exposes CRUD, turns, context and capabilities with idempotent statuses', async () => fixture(async ({ send, calls }) => {
  for (const [path, method, body, status] of [
    ['/capabilities','GET',undefined,200], ['/conversations','POST',creation,201], ['/conversations','POST',creation,200],
    ['/conversations?limit=10','GET',undefined,200], [`/conversations/${id}`,'GET',undefined,200],
    [`/conversations/${id}`,'PATCH',{ revision:'0', title:'Cambio' },200],
    [`/conversations/${id}/turns`,'POST',message,202], [`/conversations/${id}/turns`,'POST',message,200],
    [`/conversations/${id}/turns?afterSequence=0&limit=10`,'GET',undefined,200], [`/conversations/${id}/turns/${turnId}`,'GET',undefined,200],
    [`/conversations/${id}/curriculum`,'GET',undefined,200], [`/conversations/${id}/sources?kind=PLAN&limit=10`,'GET',undefined,200],
    [`/conversations/${id}`,'DELETE',{ revision:'1', confirm:true },204]]) {
    const response = await send(path, method, body); assert.equal(response.status, status, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  assert.deepEqual(calls.map(c => c[0]), ['capabilities','create','create','list','get','rename','send','send','listTurns','getTurn','curriculum','sources','remove']);
}));

test('authentication covers capabilities and origin/CSRF reject writes before service', async () => fixture(async ({ send, calls }) => {
  assert.equal((await send('/capabilities', 'GET', undefined, { cookie: '' })).status, 401);
  for (const headers of [{ origin: 'http://evil.test' }, { 'x-csrf-token': 'bad' }])
    assert.equal((await send('/conversations','POST',creation,headers)).status, 403);
  assert.deepEqual(calls, []);
}));

test('HTTP rejects malformed IDs, duplicated or unknown query keys, invalid bodies and content types', async () => fixture(async ({ send, calls }) => {
  for (const [path, method, body, headers] of [
    ['/conversations/not-uuid','GET'], ['/conversations?limit=1&limit=2','GET'], ['/conversations?ownerId=other','GET'],
    [`/conversations/${id}/turns?limit=1&limit=2`,'GET'], ['/conversations','POST','{bad'],
    ['/conversations','POST',creation,{'content-type':'text/plain'}], ['/conversations','POST','x'.repeat(1048577)]
  ]) { const response = await send(path,method,body,headers); assert.ok(response.status >= 400 && response.status < 500, `${method} ${path} => ${response.status}`); }
  assert.equal(calls.length, 0);
}));

test('HTTP sanitizes unexpected exceptions while mapping known domain errors', async () => {
  const api = await import('./index.ts'); assert.equal(typeof api.createFoxyHandler, 'function');
  for (const [code, status] of [['NOT_FOUND',404],['CONFLICT',409],['INVALID_INPUT',400],['AI_UNAVAILABLE',503],['XX000',503]]) {
    const handler = api.createFoxyHandler({ capabilities: async () => { throw Object.assign(Error('sensitive synthetic detail'), { code }); } }, { admit: async () => {} });
    const server = createServer((req,res) => handler(req,res,()=>res.end())); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    try { const response = await fetch(`http://127.0.0.1:${server.address().port}${base}/capabilities`);
      assert.equal(response.status, status); assert.equal((await response.text()).includes('sensitive synthetic detail'), false);
    } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
});

test('invalid UTF-8 and unsupported content-encoding are rejected before service', async () => fixture(async ({ send, calls }) => {
  const prefix = Buffer.from(JSON.stringify(creation).replace('Chat', ''));
  const offset = prefix.indexOf(Buffer.from('"title":"')) + Buffer.byteLength('"title":"');
  const invalid = Buffer.concat([prefix.subarray(0, offset), Buffer.from([0xc3, 0x28]), prefix.subarray(offset)]);
  const badUtf8 = await send('/conversations','POST',invalid);
  assert.ok(badUtf8.status >= 400 && badUtf8.status < 500);
  const encoded = await send('/conversations','POST',creation,{'content-encoding':'gzip'});
  assert.ok(encoded.status >= 400 && encoded.status < 500);
  assert.equal(calls.length, 0);
}));

test('EMPTY_CONTENT remains a client domain error without leaking details', async () => {
  const api = await import('./index.ts');
  const handler = api.createFoxyHandler({ capabilities: async () => { throw Object.assign(Error('synthetic private detail'), { code: 'EMPTY_CONTENT' }); } }, { admit: async () => {} });
  const server = createServer((req,res) => handler(req,res,()=>res.end())); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try { const response = await fetch(`http://127.0.0.1:${server.address().port}${base}/capabilities`);
    assert.ok(response.status >= 400 && response.status < 500); assert.equal((await response.json()).error.code, 'EMPTY_CONTENT');
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('incomplete slow bodies time out and release all admission slots', { timeout: 20000 }, async () => fixture(async ({ send, port }) => {
  const sockets = []; let admitted = 0;
  try {
    for (let i = 0; i < 16; i++) {
      const socket = connect(port, '127.0.0.1'); sockets.push(socket); socket.on('error', () => {});
      await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('error', reject); });
      socket.write(`POST ${base}/conversations HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 100\r\nCookie: session=synthetic\r\nOrigin: http://web.test\r\nX-CSRF-Token: bound\r\n\r\n{`);
    }
    await new Promise(resolve => setTimeout(resolve, 11000));
    const response = await send('/capabilities'); assert.equal(response.status, 200, 'body deadline should release all handler slots');
  } finally { for (const socket of sockets) socket.destroy(); }
}));

test('unsupported content-encoding is rejected before service', async () => fixture(async ({ send, calls }) => {
  const response = await send('/conversations', 'POST', creation, { 'content-encoding': 'gzip' });
  assert.ok(response.status >= 400 && response.status < 500); assert.equal(calls.length, 0);
}));

test('malformed absolute request target returns sanitized 400 without throwing', async () => {
  const api = await import('./index.ts');
  const handler = api.createFoxyHandler({}, { admit: async () => {} });
  const headers = {}, response = { statusCode: 200, writableEnded: false, destroyed: false,
    setHeader(name, value) { headers[name.toLowerCase()] = value; },
    end(value) { this.body = value; this.writableEnded = true; } };
  assert.doesNotThrow(() => handler({ url: 'http://[', method: 'GET', headers: {} }, response, () => {}));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(response.statusCode, 400); assert.equal(JSON.parse(response.body).error.code, 'INVALID_INPUT');
  assert.equal(String(response.body).includes('http://['), false);
});

test('citation list and binary file routes use opaque references and safe headers', async () => fixture(async ({ send, calls }) => {
  const path = `/conversations/${id}/turns/${turnId}/citations`;
  const list = await send(path); assert.equal(list.status, 200);
  const [citation] = await list.json(); assert.equal(citation.id,'c1'); assert.equal(citation.availability,'AVAILABLE');
  assert.equal(citation.href, `${base}${path}/c1/file`);
  const file = await send(`${path}/c1/file?mode=preview`); assert.equal(file.status,200);
  assert.equal(file.headers.get('content-type'),'application/pdf'); assert.equal(file.headers.get('cache-control'),'no-store');
  assert.equal(file.headers.get('x-content-type-options'),'nosniff'); assert.equal(file.headers.get('location'),null);
  assert.deepEqual(Buffer.from(await file.arrayBuffer()),Buffer.from('%PDF-synthetic'));
  assert.deepEqual(calls.map(call => call[0]),['citationList','citationFile']);
  assert.deepEqual(calls[0].slice(1),[id,turnId]); assert.deepEqual(calls[1].slice(1),[id,turnId,'c1','preview']);
  assert.equal((await send(path,'GET',undefined,{ cookie:'' })).status,401);
  const before = calls.length; assert.ok((await send(`${path}/${randomUUID()}/file`)).status >= 400); assert.equal(calls.length,before);
}));

test('turn page response preserves cursor envelope', async () => fixture(async ({ send }) => {
  const response = await send(`/conversations/${id}/turns?afterSequence=0&limit=2`);
  assert.equal(response.status,200); assert.deepEqual(await response.json(),{items:[],nextAfterSequence:null});
}));

test('RESPONSE_TOO_LARGE is an explicit sanitized 413 response', async () => {
  const api = await import('./index.ts');
  const handler = api.createFoxyHandler({ capabilities: async () => { throw Object.assign(Error('synthetic private detail'), { code:'RESPONSE_TOO_LARGE' }); } }, { admit:async () => {} });
  const server=createServer((req,res)=>handler(req,res,()=>res.end())); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try { const response=await fetch(`http://127.0.0.1:${server.address().port}${base}/capabilities`);
    assert.equal(response.status,413); const data=await response.json(); assert.equal(data.error.code,'RESPONSE_TOO_LARGE');
    assert.equal(JSON.stringify(data).includes('synthetic private detail'),false);
    assert.equal(response.headers.get('cache-control'),'no-store'); assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
});
