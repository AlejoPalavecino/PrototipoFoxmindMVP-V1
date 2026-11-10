import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { readFileSync } from 'node:fs';
import { ClamdScanner } from '../apps/api/src/modules/files/infrastructure/scanner.ts';

// A tiny protocol peer, never ClamAV or an application upload.
async function withPeer(reply, timeoutMs, run) {
  const sockets = new Set(); let received;
  const sent = new Promise(resolve => { received = resolve; });
  const server = createServer(socket => {
    sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket));
    let bytes = Buffer.alloc(0), completed = false;
    socket.on('data', chunk => {
      bytes = Buffer.concat([bytes, chunk]);
      if (!completed && bytes.length >= 17 && bytes.subarray(-4).equals(Buffer.alloc(4))) {
        completed = true; received(bytes);
        if (reply !== null) socket.end(reply);
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try { await run(new ClamdScanner('127.0.0.1', server.address().port, timeoutMs), sent); }
  finally { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); }
}

async function assertDeadline(t, timeoutMs, expected) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  await withPeer(null, timeoutMs, async (scanner, sent) => {
    assert.equal(scanner.timeoutMs, expected);
    let state = 'pending';
    const result = scanner.scan(Buffer.from('test')).then(() => { state = 'clean'; }, error => { state = error.code; });
    const wire = await sent;
    assert.equal(wire.subarray(0, 10).toString(), 'zINSTREAM\0');
    t.mock.timers.tick(expected - 1); await Promise.resolve(); assert.equal(state, 'pending');
    t.mock.timers.tick(1); await result; assert.equal(state, 'SERVICE_UNAVAILABLE');
  });
}

test('scanner defaults to30s and silence still fails closed at the exact absolute deadline', { timeout: 5000 }, async t => {
  assert.equal(new ClamdScanner('127.0.0.1', 3310).timeoutMs, 30000);
  await assertDeadline(t, undefined, 30000);
});

test('custom scanner deadlines and the existing1..30000 constructor bounds remain unchanged', { timeout: 5000 }, async t => {
  for (const value of [1, 15000, 30000]) assert.equal(new ClamdScanner('127.0.0.1', 3310, value).timeoutMs, value);
  for (const value of [0, -1, 30001, 1.5, NaN, Infinity]) {
    assert.throws(() => new ClamdScanner('127.0.0.1', 3310, value), { code: 'SERVICE_UNAVAILABLE' });
  }
  await assertDeadline(t, 37, 37);
});

test('clean, virus, limit, malformed and truncated protocol responses retain their prior outcomes', { timeout: 5000 }, async () => {
  for (const [reply, expected] of [['stream: OK\0', 'clean'], ['stream: Eicar-Signature FOUND\0', 'FILE_REJECTED'],
    ['stream: Heuristics.Limits.Exceeded.MaxScanTime FOUND\0', 'FILE_REJECTED'],
    ['stream: size limit exceeded ERROR\0', 'SERVICE_UNAVAILABLE'], ['stream: OK\0junk', 'SERVICE_UNAVAILABLE'],
    ['stream: OK', 'SERVICE_UNAVAILABLE']]) {
    await withPeer(reply, 150, async scanner => {
      if (expected === 'clean') await scanner.scan(Buffer.from('test'));
      else await assert.rejects(scanner.scan(Buffer.from('test')), { code: expected, message: expected });
    });
  }
  await assert.rejects(new ClamdScanner('127.0.0.1', 3310).scan(Buffer.alloc(0)), { code: 'INVALID_UPLOAD' });
});

test('the owned scanner configuration changes only its requested25s budget and keeps every protection', () => {
  const source = readFileSync(new URL('../scripts/p4-services.mjs', import.meta.url), 'utf8');
  const block = source.match(/await writeFile\(config, \[([\s\S]*?)\]\.join/);
  assert.ok(block);
  const lines = [...block[1].matchAll(/'([^']*)'/g)].map(match => match[1]);
  assert.deepEqual(lines, ['Foreground yes', 'User clamav', 'DatabaseDirectory /var/lib/clamav', 'TCPSocket 3310', 'TCPAddr 0.0.0.0',
    'MaxThreads 2', 'MaxQueue 4', 'ReadTimeout 15', 'CommandReadTimeout 5', 'SendBufTimeout 1000',
    'StreamMaxLength 50000000', 'MaxFileSize 100000000', 'MaxScanSize 200000000', 'MaxRecursion 8',
    'MaxFiles 1000', 'MaxScanTime 25000', 'AlertExceedsMax yes', 'AlertEncrypted yes', 'AlertOLE2Macros yes',
    'ScanArchive yes', 'ScanPDF yes', 'ScanXMLDOCS yes', 'AlertBrokenMedia yes', 'FailIfCvdOlderThan 7']);
});
