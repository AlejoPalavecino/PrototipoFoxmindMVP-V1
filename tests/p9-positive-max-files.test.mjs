import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import { representativeMaximumZip } from './p9-positive-max-files.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
function checkZip(bytes, size) {
  assert.equal(bytes.length, size);
  const payload = bytes.subarray(38, size - 76), central = size - 76, end = size - 22;
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  assert.equal(bytes.readUInt16LE(6), 0); assert.equal(bytes.readUInt16LE(8), 0);
  assert.equal(bytes.readUInt32LE(14), crc32(payload));
  assert.equal(bytes.readUInt32LE(18), size - 114); assert.equal(bytes.readUInt32LE(22), size - 114);
  assert.equal(bytes.readUInt16LE(26), 8); assert.equal(bytes.readUInt16LE(28), 0);
  assert.equal(bytes.subarray(30, 38).toString('ascii'), 'work.txt');
  assert.equal(bytes.readUInt32LE(central), 0x02014b50);
  assert.equal(bytes.readUInt16LE(central + 8), 0); assert.equal(bytes.readUInt16LE(central + 10), 0);
  assert.equal(bytes.readUInt32LE(central + 16), crc32(payload));
  assert.equal(bytes.readUInt32LE(central + 20), payload.length); assert.equal(bytes.readUInt32LE(central + 24), payload.length);
  assert.equal(bytes.readUInt16LE(central + 28), 8); assert.equal(bytes.readUInt16LE(central + 30), 0);
  assert.equal(bytes.readUInt16LE(central + 32), 0); assert.equal(bytes.readUInt32LE(central + 42), 0);
  assert.equal(bytes.subarray(central + 46, end).toString('ascii'), 'work.txt');
  assert.equal(bytes.readUInt32LE(end), 0x06054b50);
  assert.equal(bytes.readUInt16LE(end + 4), 0); assert.equal(bytes.readUInt16LE(end + 6), 0);
  assert.equal(bytes.readUInt16LE(end + 8), 1); assert.equal(bytes.readUInt16LE(end + 10), 1);
  assert.equal(bytes.readUInt32LE(end + 12), 54); assert.equal(bytes.readUInt32LE(end + 16), central);
  assert.equal(bytes.readUInt16LE(end + 20), 0);
  let line = 0, lines = 0;
  for (const byte of payload) {
    assert.ok(byte === 10 || (byte >= 32 && byte <= 126), 'Payload is benign printable ASCII or LF');
    line++;
    assert.ok(line <= 80, 'Representative text lines include LF within 80 bytes');
    if (byte === 10) { line = 0; lines++; }
  }
  assert.equal(line, 0, 'Last nonempty line ends with LF');
  assert.ok(lines > 0 || payload.length === 0);
  if (payload.length >= 160) assert.notDeepEqual(payload.subarray(0, 80), payload.subarray(80, 160), 'Successive records vary');
  return sha(bytes);
}

test('five representative maximum ZIPs have exact50M layout/CRC, bounded varied ASCII and distinct deterministic hashes', () => {
  const hashes = new Set(); let first;
  for (let index = 0; index < 5; index++) {
    const hash = checkZip(representativeMaximumZip(index), 50_000_000);
    hashes.add(hash); if (index === 0) first = hash;
  }
  assert.equal(hashes.size, 5);
  assert.equal(sha(representativeMaximumZip(0)), first);
});

test('sixth small ZIP uses the same valid stored-entry construction without changing production sizes', () => {
  const hash = checkZip(representativeMaximumZip(0, 4096), 4096);
  assert.equal(hash, sha(representativeMaximumZip(0, 4096)));
  checkZip(representativeMaximumZip(0, 114), 114);
  for (const size of [115, 193, 194, 195]) checkZip(representativeMaximumZip(0, size), size);
  assert.throws(() => representativeMaximumZip(5)); assert.throws(() => representativeMaximumZip(-1));
  assert.throws(() => representativeMaximumZip(0, 113)); assert.throws(() => representativeMaximumZip(0, 114.5));
});

test('original stress generator and fixed-SHA diagnostic preserve bytes except canonical worker addresses and explicit actor role', () => {
  for (const [path, expected] of [
    ['p9-journey-helpers.mjs', 'dc34cbcb6a786a3225ffc15301c56ddf3b486424b67601b3a9f23f11213d7093'],
    ['p9-max-file-diagnostic-integration.test.mjs', 'e8d4aae3a9916b9b8294af09186672b3b78f85d2838d582ff733fb56f3a0539e'],
  ]) {
    let bytes = readFileSync(new URL(path, import.meta.url));
    if (path === 'p9-max-file-diagnostic-integration.test.mjs') {
      // Normalize only the relocated worker addresses and explicit actor role; every other byte
      // remains protected by the original SHA, including payloads and resource limits.
      let source = bytes.toString('utf8');
      for (const prefix of ['../', '']) {
        const canonical = `"${prefix}.build/api/apps/api/src/modules/files/infrastructure/content-worker.js"`;
        assert.equal(source.split(canonical).length - 1, 1, 'exactly one worker address per literal');
        source = source.replace(canonical, `'${prefix}.build/api/apps/api/src/files/content-worker.js'`);
      }
      const account = 'await account(page, runtime.origin, runtime.inbox, `p9-max-diagnostic-${role}-${Date.now()}@example.test`, undefined, role);';
      assert.equal(source.split(account).length - 1, 1, 'exactly one explicit role adaptation');
      source = source.replace(account, account.replace(', undefined, role', ''));
      bytes = Buffer.from(source);
    }
    assert.equal(sha(bytes), expected, path);
  }
});
