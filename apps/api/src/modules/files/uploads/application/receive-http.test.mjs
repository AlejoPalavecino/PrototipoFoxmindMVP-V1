import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { EventEmitter } from 'node:events';
import { createFilesHandler } from '../presentation/http.ts';
import { FileError } from '../../domain/errors.ts';

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
