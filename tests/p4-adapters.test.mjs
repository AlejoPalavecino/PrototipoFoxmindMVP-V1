import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { S3Storage } from '../apps/api/src/modules/files/infrastructure/storage.ts';
import { ClamdScanner } from '../apps/api/src/modules/files/infrastructure/scanner.ts';

const key = 'p4/00000000-0000-4000-8000-000000000001/blob';
const code = value => ({ code: value });
test('S3 uploads cannot overwrite a stored object and carry bounded request deadlines', async () => {
  let observed;
  const store = new S3Storage({ send: async (command, options) => { observed = { command, options }; } }, 'private-files');
  await store.put(key, Buffer.from('bytes'));
  assert.equal(observed.command.input.IfNoneMatch, '*');
  assert.equal(observed.command.input.Bucket, 'private-files');
  assert.equal(observed.command.input.ContentLength, 5);
  assert.ok(observed.options.abortSignal);
});
test('S3 reads reject oversized or truncated streams, and sanitize provider failures', async () => {
  for (const response of [
    { ContentLength: 5, Body: (async function* () { yield Buffer.from('12345'); })() },
    { ContentLength: 3, Body: (async function* () { yield Buffer.from('12'); })() },
    { ContentLength: 3, Body: (async function* () { yield Buffer.from('1234'); })() },
  ]) {
    const store = new S3Storage({ send: async () => response }, 'private-files');
    await assert.rejects(store.get(key, 3), code('SERVICE_UNAVAILABLE'));
  }
  const store = new S3Storage({ send: async () => { throw new Error('private credential text'); } }, 'private-files');
  await assert.rejects(store.remove(key), { message: 'SERVICE_UNAVAILABLE', code: 'SERVICE_UNAVAILABLE' });
});
test('S3 returns exact bounded bytes and refuses invalid keys', async () => {
  const store = new S3Storage({ send: async () => ({ ContentLength: 3,
    Body: (async function* () { yield Buffer.from('abc'); })() }) }, 'private-files');
  assert.deepEqual(await store.get(key, 3), Buffer.from('abc'));
  for (const bad of ['../blob', 'https://example.com/blob', 'p4/../blob', 'unowned/blob']) {
    await assert.rejects(store.put(bad, Buffer.from('a')), code('INVALID_UPLOAD'));
  }
});

async function withDaemon(reply, run, { premature = false } = {}) {
  const sockets = new Set();
  const server = createServer(socket => {
    sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket));
    let input = Buffer.alloc(0);
    socket.on('data', chunk => {
      input = Buffer.concat([input, chunk]);
      if (premature || (input.length >= 14 && input.subarray(-4).equals(Buffer.alloc(4)))) {
        if (reply !== null) socket.end(reply);
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(new ClamdScanner('127.0.0.1', server.address().port, 150)); }
  finally { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); }
}
test('ClamD INSTREAM accepts only a complete clean response', async () => {
  await withDaemon('stream: OK\0', scanner => scanner.scan(Buffer.from('clean')));
});
test('infected or inspection-limit verdicts block the file without exposing signature details', async () => {
  for (const response of ['stream: Eicar-Signature FOUND\0', 'stream: Heuristics.Limits.Exceeded FOUND\0']) {
    await withDaemon(response, scanner => assert.rejects(scanner.scan(Buffer.from('bad')),
      { code: 'FILE_REJECTED', message: 'FILE_REJECTED' }));
  }
});
test('scanner silence, malformed/truncated/error responses all fail closed', async () => {
  for (const response of [null, 'stream: OK', 'stream: OK\0junk', 'stream: size limit exceeded ERROR\0', 'OK\0', 'x'.repeat(5000)]) {
    await withDaemon(response, scanner => assert.rejects(scanner.scan(Buffer.from('test')), code('SERVICE_UNAVAILABLE')));
  }
});
