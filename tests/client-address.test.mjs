import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { clientAddress, clientProof, readClientAddressKey } from '../.build/api/apps/api/src/platform/http/client-address.js';

const key = randomBytes(32), now = 1_700_000_000_000, seconds = now / 1000;
const request = (socket, ip, proof) => ({ socket: { remoteAddress: socket },
  headers: { ...(ip ? { 'x-foxmind-client-address': ip } : {}), ...(proof ? { 'x-foxmind-client-proof': proof } : {}) } });

test('valid proof from loopback yields the signed address', () => {
  for (const socket of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
    assert.equal(clientAddress(request(socket, '203.0.113.9', clientProof(key, '203.0.113.9', seconds)), key, now), '203.0.113.9');
  }
  assert.equal(clientAddress(request('127.0.0.1', '2001:db8::1', clientProof(key, '2001:db8::1', seconds - 59)), key, now), '2001:db8::1');
});
test('anything unverifiable falls back to the socket address', () => {
  const good = clientProof(key, '203.0.113.9', seconds);
  const cases = {
    'bad signature': request('127.0.0.1', '203.0.113.10', good),
    'other key': request('127.0.0.1', '203.0.113.9', clientProof(randomBytes(32), '203.0.113.9', seconds)),
    'stale': request('127.0.0.1', '203.0.113.9', clientProof(key, '203.0.113.9', seconds - 61)),
    'future': request('127.0.0.1', '203.0.113.9', clientProof(key, '203.0.113.9', seconds + 61)),
    'non-loopback socket': request('198.51.100.7', '203.0.113.9', good),
    'malformed ip': request('127.0.0.1', 'not-an-ip', clientProof(key, 'not-an-ip', seconds)),
    'no proof': request('127.0.0.1', '203.0.113.9'),
    'malformed proof': request('127.0.0.1', '203.0.113.9', 'x.y'),
  };
  for (const [name, value] of Object.entries(cases)) {
    assert.equal(clientAddress(value, key, now), value.socket.remoteAddress, name);
  }
  assert.equal(clientAddress(request('127.0.0.1', '203.0.113.9', good), undefined, now), '127.0.0.1', 'missing key');
  assert.equal(clientAddress({ socket: {}, headers: {} }, key, now), undefined);
});
test('key must be base64url of at least 32 bytes when set', () => {
  assert.equal(readClientAddressKey(undefined), undefined);
  assert.ok(readClientAddressKey(randomBytes(32).toString('base64url')));
  for (const bad of ['short', randomBytes(16).toString('base64url'), 'a+b/', randomBytes(32).toString('base64')]) {
    assert.throws(() => readClientAddressKey(bad), bad);
  }
});
test('a signed unresolved sentinel from the web yields no address so the API fails closed', () => {
  assert.equal(clientAddress(request('127.0.0.1', 'unresolved', clientProof(key, 'unresolved', seconds)), key, now), undefined);
  assert.equal(clientAddress(request('127.0.0.1', 'unresolved', clientProof(randomBytes(32), 'unresolved', seconds)), key, now), '127.0.0.1');
});
