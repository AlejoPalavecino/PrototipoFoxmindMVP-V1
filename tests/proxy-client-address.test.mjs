import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const key = randomBytes(32).toString('base64url');
const server = 'apps/web/src/application/server';
const { clientAddressHeaders } = loadTsModule(`${server}/client-address.ts`);
const { proxyAccountRequest } = loadTsModule(`${server}/identity-proxy.ts`);
const { aiQuotaPath } = loadTsModule('src/core/contracts/ai-quota.ts');
const proxies = [
  ['agenda', 'agenda-proxy.ts', 'proxyAgendaRequest', '/api/v1/agenda/upcoming'],
  ['ai-quota', 'ai-quota-proxy.ts', 'proxyAiQuotaRequest', aiQuotaPath],
  ['classroom', 'classroom-proxy.ts', 'proxyClassroomRequest', '/api/v1/classrooms/drafts'],
  ['file', 'file-proxy.ts', 'proxyFileRequest', `/api/v1/files/${randomUUID()}`],
  ['foxy', 'foxy-proxy.ts', 'proxyFoxyRequest', '/api/v1/foxy-ai/capabilities'],
  ['home', 'home-proxy.ts', 'proxyHomeRequest', '/api/v1/home?timeZone=UTC'],
  ['study', 'study-proxy.ts', 'proxyStudyRequest', '/api/v1/study-folders'],
];
const verify = (headers, ip) => {
  assert.equal(headers['x-foxmind-client-address'], ip);
  const [seconds, mac] = headers['x-foxmind-client-proof'].split('.');
  assert.ok(Math.abs(Date.now() / 1000 - Number(seconds)) < 30);
  assert.equal(mac, createHmac('sha256', Buffer.from(key, 'base64url')).update(`foxmind-client-address-v1\n${seconds}\n${ip}`).digest('base64url'));
};
const listen = handler => new Promise(resolve => {
  const http = createServer(handler);
  http.listen(0, '127.0.0.1', () => resolve({ origin: `http://127.0.0.1:${http.address().port}`,
    close: () => { http.closeAllConnections(); return new Promise(done => http.close(done)); } }));
});

test('helper signs only the socket address and sends nothing without a valid key or address', () => {
  assert.deepEqual(clientAddressHeaders({ socket: { remoteAddress: '203.0.113.5' }, headers: { 'x-forwarded-for': '1.1.1.1' } }, undefined), {});
  assert.deepEqual(clientAddressHeaders({ socket: { remoteAddress: '203.0.113.5' } }, 'short'), {});
  assert.deepEqual(clientAddressHeaders({ socket: {} }, key), {});
  assert.deepEqual(clientAddressHeaders({ socket: { remoteAddress: 'junk' } }, key), {});
  verify(clientAddressHeaders({ socket: { remoteAddress: '203.0.113.5' }, headers: { 'x-foxmind-client-address': '9.9.9.9' } }, key), '203.0.113.5');
  verify(clientAddressHeaders({ socket: { remoteAddress: '2001:db8::5' } }, key), '2001:db8:0:0::');
});
test('identity proxy forwards given signed headers and drops client-supplied ones', async () => {
  let seen;
  const signed = clientAddressHeaders({ socket: { remoteAddress: '203.0.113.5' } }, key);
  await proxyAccountRequest(new Request('http://localhost:3000/api/v1/auth/session', { headers: {
    'x-foxmind-client-address': '9.9.9.9', 'x-foxmind-client-proof': 'forged' } }), 'http://127.0.0.1:3001',
  async (_url, init) => { seen = init.headers; return new Response('{}'); }, signed);
  verify(Object.fromEntries(seen), '203.0.113.5');
  await proxyAccountRequest(new Request('http://localhost:3000/api/v1/auth/session', { headers: { 'x-foxmind-client-address': '9.9.9.9' } }),
    'http://127.0.0.1:3001', async (_url, init) => { seen = init.headers; return new Response('{}'); });
  assert.equal(seen.has('x-foxmind-client-address'), false);
  assert.equal(seen.has('x-foxmind-client-proof'), false);
});
for (const [name, file, exported, path] of proxies) {
  test(`${name} proxy signs the socket address and never forwards client-supplied client headers`, async () => {
    process.env.FOXMIND_PROXY_CLIENT_KEY = key;
    const proxy = loadTsModule(`${server}/${file}`)[exported];
    const calls = [];
    const upstream = await listen((req, res) => { calls.push(req.headers); res.setHeader('content-type', 'application/json'); res.end('{}'); });
    const web = await listen((req, res) => void proxy(req, res, upstream.origin));
    try {
      const forged = { 'x-foxmind-client-address': '9.9.9.9', 'x-foxmind-client-proof': 'forged', 'x-forwarded-for': '8.8.8.8' };
      await (await fetch(web.origin + path, { headers: { cookie: 'foxmind_session=x', ...forged } })).text();
      assert.equal(calls.length, 1);
      verify(calls[0], '127.0.0.1');
      assert.equal(calls[0]['x-forwarded-for'], undefined);
      delete process.env.FOXMIND_PROXY_CLIENT_KEY;
      await (await fetch(web.origin + path, { headers: { cookie: 'foxmind_session=x', ...forged } })).text();
      assert.equal(calls[1]['x-foxmind-client-address'], undefined);
      assert.equal(calls[1]['x-foxmind-client-proof'], undefined);
    } finally { delete process.env.FOXMIND_PROXY_CLIENT_KEY; await web.close(); await upstream.close(); }
  });
}
test('helper reads X-Forwarded-For only from a trusted edge proxy, right to left', () => {
  const cidrs = '127.0.0.1/32,10.0.0.0/8';
  const behind = (peer, forwarded) => clientAddressHeaders({ socket: { remoteAddress: peer },
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded } }, key, Date.now(), cidrs);
  verify(behind('127.0.0.1', '203.0.113.9'), '203.0.113.9');
  verify(behind('::ffff:127.0.0.1', '198.51.100.1, 203.0.113.9, 10.1.2.3'), '203.0.113.9');
  verify(behind('203.0.113.50', '198.51.100.1'), '203.0.113.50');
  verify(clientAddressHeaders({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '203.0.113.9' } }, key, Date.now(), undefined), '127.0.0.1');
  for (const bad of [undefined, '', 'junk', '203.0.113.9, junk', '10.0.0.1, 127.0.0.1']) verify(behind('127.0.0.1', bad), 'unresolved');
  verify(behind('127.0.0.1', ['203.0.113.7', '203.0.113.9']), '203.0.113.9');
});
test('helper reduces IPv6 clients to their /64 network', () => {
  verify(clientAddressHeaders({ socket: { remoteAddress: '2001:db8:1:2:aaaa:bbbb:cccc:dddd' } }, key), '2001:db8:1:2::');
  verify(clientAddressHeaders({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '2001:db8:1:2::99' } }, key, Date.now(), '127.0.0.1/32'), '2001:db8:1:2::');
});
test('helper rejects malformed trusted proxy configuration by sending nothing trusted', () => {
  verify(clientAddressHeaders({ socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '203.0.113.9' } }, key, Date.now(), 'not-a-cidr'), 'unresolved');
});
