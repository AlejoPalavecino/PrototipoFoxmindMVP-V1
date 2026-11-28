import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { createFilesHandler } from '../presentation/http.ts';
import { FileError } from '../../domain/errors.ts';
import { createTransferGate } from '../../../../platform/http/transfer-gate.ts';

const id = '00000000-0000-0000-0000-000000000001';
function fixture(service, size = '3') {
  const request = new PassThrough();
  Object.assign(request, { method: 'PUT', url: `/files/${id}/content`, complete: true,
    headers: { 'content-type': 'application/octet-stream', 'content-length': size } });
  const response = new EventEmitter(), headers = new Map();
  const finished = new Promise(resolve => {
    Object.assign(response, { destroyed: false, headersSent: false,
      setHeader: (name, value) => headers.set(name, value), getHeader: name => headers.get(name),
      end: value => { response.body = JSON.parse(value); response.emit('finish'); resolve(); } });
  });
  createFilesHandler(service)(request, response, () => assert.fail('unexpected next'));
  return { request, response, finished };
}

test('HTTP waits for receive authorization before subscribing to bytes and exposes no store', async () => {
  let release;
  const authorization = new Promise(resolve => { release = resolve; });
  const calls = [];
  const service = {
    get store() { assert.fail('transport must not access custody store'); },
    async authorizeReceive(request, fileId) { calls.push(fileId); return authorization; },
    async receive(request, fileId, bytes) { calls.push(bytes.toString()); return { id: fileId }; },
  };
  const { request, response, finished } = fixture(service);
  assert.equal(request.listenerCount('data'), 0);
  release({ expectedBytes: 3 });
  await new Promise(resolve => setImmediate(resolve));
  request.end(Buffer.from('abc'));
  await finished;
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [id, 'abc']);
});

test('HTTP rejects unauthorized reception before consuming the body', async () => {
  const { request, response, finished } = fixture({
    async authorizeReceive() { throw new FileError('FORBIDDEN'); },
    async receive() { assert.fail('unauthorized mutation'); },
  });
  await finished;
  assert.equal(request.listenerCount('data'), 0);
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error.code, 'FORBIDDEN');
});

test('HTTP rejects mismatching declared length without consuming bytes or mutating', async () => {
  const { request, response, finished } = fixture({
    async authorizeReceive() { return { expectedBytes: 3 }; },
    async receive() { assert.fail('invalid length mutation'); },
  }, '4');
  await finished;
  assert.equal(request.listenerCount('data'), 0);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error.code, 'INVALID_UPLOAD');
});

function gatedFixture(service, gate, owner, options = {}) {
  const request = new PassThrough();
  Object.assign(request, { method: 'PUT', url: `/files/${id}/content`, complete: true, owner,
    headers: { 'content-type': 'application/octet-stream', 'content-length': '3' } });
  const response = new EventEmitter(), headers = new Map();
  const finished = new Promise(resolve => {
    Object.assign(response, { destroyed: false, headersSent: false,
      setHeader: (name, value) => headers.set(name, value), getHeader: name => headers.get(name),
      end: value => { response.body = JSON.parse(value); response.emit('finish'); resolve(); } });
  });
  createFilesHandler(service, { gate, owner: incoming => incoming.owner, ...options })(request, response, () => assert.fail('unexpected next'));
  return { request, response, finished };
}

test('transfer gate bounds the platform and each owner and releases exactly once', () => {
  const gate = createTransferGate({ total: 3, perOwner: 2 });
  const a1 = gate.acquire('a'), a2 = gate.acquire('a');
  assert.ok(a1 && a2);
  assert.equal(gate.acquire('a'), undefined, 'an owner cannot take a third slot');
  const b1 = gate.acquire('b');
  assert.ok(b1);
  assert.equal(gate.acquire('c'), undefined, 'the platform ceiling holds');
  a1(); a1();
  assert.ok(gate.acquire('c'), 'a released slot is reusable once');
  assert.equal(gate.acquire('d'), undefined);
});

test('one account cannot hold every file transfer while another account still transfers', async () => {
  const gate = createTransferGate({ total: 8, perOwner: 2 }), pending = [], authorized = [];
  const service = {
    async authorizeReceive(request) { authorized.push(request.owner); return new Promise(resolve => pending.push(() => resolve({ expectedBytes: 3 }))); },
    async receive(_request, fileId) { return { id: fileId }; },
  };
  const first = gatedFixture(service, gate, 'a'), second = gatedFixture(service, gate, 'a');
  const third = gatedFixture(service, gate, 'a');
  await third.finished;
  assert.equal(third.response.statusCode, 503);
  const other = gatedFixture(service, gate, 'b');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(authorized, ['a', 'a', 'b']);
  for (const release of pending) release();
  await new Promise(resolve => setImmediate(resolve));
  for (const transfer of [first, second, other]) transfer.request.end(Buffer.from('abc'));
  await Promise.all([first.finished, second.finished, other.finished]);
  assert.deepEqual([first, second, other].map(transfer => transfer.response.statusCode), [200, 200, 200]);
  await new Promise(resolve => setImmediate(resolve));
  const again = gatedFixture(service, gate, 'a');
  await new Promise(resolve => setImmediate(resolve));
  pending.at(-1)(); await new Promise(resolve => setImmediate(resolve));
  again.request.end(Buffer.from('abc')); await again.finished;
  assert.equal(again.response.statusCode, 200, 'finished transfers return their slots');
});

test('a body that stops sending data is cut after the idle window and frees its slot', async () => {
  const gate = createTransferGate({ total: 1, perOwner: 1 });
  const service = { async authorizeReceive() { return { expectedBytes: 3 }; }, async receive() { assert.fail('incomplete body'); } };
  const stalled = gatedFixture(service, gate, 'a', { idleMs: 50 });
  await new Promise(resolve => setImmediate(resolve));
  stalled.request.write(Buffer.from('a'));
  await stalled.finished;
  assert.equal(stalled.response.statusCode, 503);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(gate.acquire('b'), 'the stalled transfer released its slot');
});

// F8: the total upload deadline follows the declared size at a minimum average rate, not a fixed 10 s.
function sizedFixture(service, size) {
  const request = new PassThrough();
  Object.assign(request, { method: 'PUT', url: `/files/${id}/content`, complete: true,
    headers: { 'content-type': 'application/octet-stream', 'content-length': String(size) } });
  const response = new EventEmitter(), headers = new Map();
  const finished = new Promise(resolve => {
    Object.assign(response, { destroyed: false, headersSent: false,
      setHeader: (name, value) => headers.set(name, value), getHeader: name => headers.get(name),
      end: value => { response.body = JSON.parse(value); response.emit('finish'); resolve(); } });
  });
  createFilesHandler(service)(request, response, () => assert.fail('unexpected next'));
  return { request, response, finished };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('an upload that keeps sending data past 10 s completes within its size-based deadline', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const size = 2_000_000, received = [];
  const { request, response, finished } = sizedFixture({
    async authorizeReceive() { return { expectedBytes: size }; },
    async receive(_request, fileId, bytes) { received.push(bytes.length); return { id: fileId }; },
  }, size);
  await flush();
  // Four 500 kB chunks, one every 4 s: never idle for 5 s, 16 s in total, under the 20 s allowed for 2 MB.
  for (let chunk = 0; chunk < 4; chunk++) {
    t.mock.timers.tick(4000); await flush();
    if (chunk === 3) request.end(Buffer.alloc(500_000)); else request.write(Buffer.alloc(500_000));
    await flush();
  }
  await finished;
  assert.equal(response.statusCode, 200, JSON.stringify(response.body));
  assert.deepEqual(received, [size]);
});

test('an upload that is still sending when its size-based deadline expires is cut', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const size = 2_400_000;
  const { request, response, finished } = sizedFixture({
    async authorizeReceive() { return { expectedBytes: size }; },
    async receive() { assert.fail('an expired upload must not be stored'); },
  }, size);
  await flush();
  // 100 kB every 4 s cannot finish 2.4 MB within the 24 s it is allowed.
  for (let elapsed = 0; elapsed < 28_000 && !response.statusCode; elapsed += 4000) {
    t.mock.timers.tick(4000); await flush();
    if (!response.statusCode) { request.write(Buffer.alloc(100_000)); await flush(); }
  }
  await finished;
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error.code, 'SERVICE_UNAVAILABLE');
});
