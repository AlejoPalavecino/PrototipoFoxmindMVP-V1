import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createOfficeConverterBroker, converterArguments } from '../scripts/office-converter-broker.mjs';

const token = 't'.repeat(43);
async function broker(run) {
  const server = createOfficeConverterBroker({ token, run });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise(resolve => server.close(resolve)) };
}
const post = (url, path, body, headers = {}) => fetch(url + path, { method: 'POST', body,
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream', ...headers } });

test('S12 the broker runs the fixed disposable converter, without network, for each document', () => {
  const args = converterArguments('doc', 'foxmind-office-x');
  for (const flag of ['--rm', '--pull=never', '--network=none', '--read-only', '--user=65534:65534', '--security-opt=no-new-privileges',
    '--cap-drop=ALL', '--pids-limit=32', '--memory=512m'])
    assert.ok(args.includes(flag), flag);
  assert.deepEqual(args.slice(-2), ['foxmind-office-converter:local', 'doc']);
  assert.throws(() => converterArguments('exe', 'x'));
});

test('S12 the broker converts authorized requests and maps converter outcomes', async () => {
  const seen = [];
  const b = await broker(async (extension, bytes) => {
    seen.push([extension, bytes.length]);
    if (bytes[0] === 1) throw Object.assign(new Error('rejected'), { rejected: true });
    if (bytes[0] === 2) throw new Error('docker down');
    return Buffer.from(`converted-${extension}`);
  });
  try {
    const ok = await post(b.url, '/convert/doc', Buffer.from([0, 0, 0]));
    assert.equal(ok.status, 200); assert.equal(await ok.text(), 'converted-doc');
    assert.equal((await post(b.url, '/convert/ppt', Buffer.from([1]))).status, 422);
    assert.equal((await post(b.url, '/convert/ppt', Buffer.from([2]))).status, 503);
    assert.deepEqual(seen, [['doc', 3], ['ppt', 1], ['ppt', 1]]);
  } finally { await b.close(); }
});

test('S12 the broker refuses anything outside its single operation', async () => {
  let calls = 0;
  const b = await broker(async () => { calls++; return Buffer.from('x'); });
  try {
    assert.equal((await post(b.url, '/convert/doc', Buffer.from('x'), { authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await fetch(b.url + '/convert/doc', { method: 'POST', body: 'x' })).status, 401);
    assert.equal((await post(b.url, '/convert/exe', Buffer.from('x'))).status, 404);
    assert.equal((await fetch(b.url + '/convert/doc', { headers: { authorization: `Bearer ${token}` } })).status, 405);
    assert.equal((await post(b.url, '/convert/doc', Buffer.alloc(20_000_001))).status, 413);
    assert.equal(calls, 0);
  } finally { await b.close(); }
});

test('S12 the broker keeps at most two conversions at once', async () => {
  const release = [];
  const b = await broker(() => new Promise(resolve => release.push(() => resolve(Buffer.from('ok')))));
  try {
    const first = post(b.url, '/convert/doc', Buffer.from('a')), second = post(b.url, '/convert/doc', Buffer.from('b'));
    while (release.length < 2) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal((await post(b.url, '/convert/doc', Buffer.from('c'))).status, 503);
    for (const done of release) done();
    assert.deepEqual([(await first).status, (await second).status], [200, 200]);
  } finally { await b.close(); }
});

test('S12 the broker requires a strong token', () => {
  for (const bad of [undefined, '', 'short']) assert.throws(() => createOfficeConverterBroker({ token: bad, run: async () => Buffer.alloc(0) }));
});
