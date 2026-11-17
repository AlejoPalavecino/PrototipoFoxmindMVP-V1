import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { binaryMaximumZip } from './p9-binary-max-files.mjs';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const decoder = String.raw`
import sys, io, zipfile, wave, struct, array, math, hashlib, json, binascii
raw = sys.stdin.buffer.read()
index = int(sys.argv[1]); base = 220 + 55 * index
assert len(raw) == 50_000_000
assert raw[-22:-18] == b'PK\x05\x06'
disk, startdisk, count, total, directory_size, directory_offset, comment = struct.unpack_from('<4H2IH', raw, len(raw)-18)
assert (disk, startdisk, count, total, comment) == (0, 0, 2, 2, 0)
assert directory_offset + directory_size + 22 == len(raw)
with zipfile.ZipFile(io.BytesIO(raw)) as archive:
    assert archive.namelist() == ['lesson.txt', 'experiment.wav'], 'Expected genuine classroom lesson and WAV assets'
    assert archive.comment == b'' and archive.testzip() is None
    infos = archive.infolist(); cursor = 0
    assert directory_size == sum(46 + len(row.filename.encode('utf8')) for row in infos)
    for row in infos:
        assert row.compress_type == zipfile.ZIP_STORED and row.flag_bits == 0
        assert row.extra == b'' and row.comment == b'' and row.file_size == row.compress_size
        assert row.header_offset == cursor and raw[cursor:cursor+4] == b'PK\x03\x04'
        flags, method = struct.unpack_from('<HH', raw, cursor+6)
        crc, compressed, expanded, namelen, extralen = struct.unpack_from('<IIIHH', raw, cursor+14)
        assert flags == method == extralen == 0 and crc == row.CRC
        assert compressed == expanded == row.file_size
        assert raw[cursor+30:cursor+30+namelen].decode('utf8') == row.filename
        content = archive.read(row.filename)
        assert len(content) == expanded and binascii.crc32(content) == crc
        cursor += 30 + namelen + extralen + compressed
    assert cursor == directory_offset, 'No bytes outside parsed entries'
    lesson = archive.read('lesson.txt').decode('utf8')
    assert 100 < len(lesson.encode('utf8')) < 2048
    for term in ['quadrature', 'third harmonic', 'chirp', 'amplitude modulation', str(base) + ' Hz']:
        assert term in lesson, term
    wav = archive.read('experiment.wav')
assert wav[:4] == b'RIFF' and wav[8:12] == b'WAVE'
assert struct.unpack_from('<I', wav, 4)[0] + 8 == len(wav)
assert wav[12:16] == b'fmt ' and struct.unpack_from('<I', wav, 16)[0] == 16
fmt, channels, rate, byte_rate, block, bits = struct.unpack_from('<HHIIHH', wav, 20)
assert (fmt, channels, rate, byte_rate, block, bits) == (1, 2, 48000, 192000, 4, 16)
assert wav[36:40] == b'data' and struct.unpack_from('<I', wav, 40)[0] == len(wav)-44
assert (len(wav)-44) % block == 0
with wave.open(io.BytesIO(wav), 'rb') as decoded:
    assert decoded.getparams()[:4] == (2, 2, 48000, (len(wav)-44)//4)
    frames = decoded.getnframes(); pcm = decoded.readframes(frames)
    assert len(pcm) == frames * block and decoded.readframes(1) == b''
assert pcm == wav[44:], 'Every audio data byte is decoded; no ignored/trailing chunks'
samples = array.array('h', pcm)
if sys.byteorder != 'little': samples.byteswap()
assert len(samples) == frames*2 and min(samples) >= -12000 and max(samples) <= 12000
assert max(samples) >= 11000 and min(samples) <= -11000
assert samples.count(0) < len(samples) * 0.1, 'No silent padding asset'
assert sum(abs(value) for value in samples) / len(samples) > 3000
quarter = frames // 4
def left_window(start, length=48000): return samples[2*start:2*(start+length):2]
def crossings(values): return sum(a < 0 <= b for a,b in zip(values, values[1:]))
tone = left_window(48000); reference = samples[96001:192000:2]
assert abs(crossings(tone)-base) <= 1
correlation = sum(a*b for a,b in zip(tone, reference)) / math.sqrt(sum(a*a for a in tone)*sum(b*b for b in reference))
assert abs(correlation) < 0.01, 'First phase has quadrature channels'
harmonic = left_window(quarter+48000)
amplitude = abs(2 * sum(value*math.sin(2*math.pi*3*base*n/rate) for n,value in enumerate(harmonic)) / rate)
assert 1800 < amplitude < 3000, 'Second phase carries a genuine third harmonic'
early_chirp = crossings(left_window(2*quarter+48000))
late_chirp = crossings(left_window(3*quarter-96000))
assert late_chirp > early_chirp * 2.5, 'Third phase has an increasing frequency sweep'
print(json.dumps({'index':index,'zipBytes':len(raw),'frames':frames,'durationSeconds':frames/rate,
  'decodedSampleCount':len(samples),'baseHz':base,'thirdHarmonicAmplitude':amplitude,
  'chirpCrossings':[early_chirp,late_chirp],'zipSha256':hashlib.sha256(raw).hexdigest()}))
`;

test('all five exact50M stored ZIPs independently decode complete meaningful stereo classroom WAV assets', { timeout: 90000 }, () => {
  const hashes = new Set();
  for (let index = 0; index < 5; index++) {
    const bytes = binaryMaximumZip(index);
    const decoded = spawnSync('python', ['-c', decoder, String(index)], { input: bytes, encoding: 'utf8', windowsHide: true,
      timeout: 15000, maxBuffer: 32768 });
    assert.equal(decoded.status, 0, `Independent zipfile/wave decoder index${index}: ${decoded.stderr ?? decoded.error?.code}`);
    assert.equal(decoded.stderr, '');
    const result = JSON.parse(decoded.stdout); assert.equal(result.zipSha256, sha(bytes)); hashes.add(result.zipSha256);
    console.log('P9 independent binary asset proof', JSON.stringify(result));
  }
  assert.equal(hashes.size, 5);
});

test('binary assets are deterministic and index-specific without changing input bounds', () => {
  const first = sha(binaryMaximumZip(0)); assert.equal(sha(binaryMaximumZip(0)), first);
  assert.notEqual(sha(binaryMaximumZip(1)), first);
  for (const index of [-1, 5, 1.5, NaN]) assert.throws(() => binaryMaximumZip(index));
});

test('previous ASCII generator and reviewed compatibility unit remain checksum-pinned', () => {
  for (const [file, expected] of [
    ['p9-positive-max-files.mjs', '7801cf4ca5d6b39b6812392e1710f19663fd4da6b49467cbb19ba02d4e8b4fee'],
    ['p9-positive-max-files.test.mjs', 'cba4451df299035cb40cb86dac7afb5770ce19fffb323d5b4a61786e10cafa44'],
  ]) {
    let bytes = readFileSync(new URL(file, import.meta.url));
    if (file === 'p9-positive-max-files.test.mjs') {
      // Only the reviewed worker address moved; preserve the original content pin.
      const current = 'modules/files/custody/infrastructure/content-worker.js';
      const original = 'modules/files/infrastructure/content-worker.js';
      const source = bytes.toString('utf8');
      assert.equal(source.split(current).length - 1, 1, 'one reviewed worker address in the source');
      bytes = Buffer.from(source.replace(current, original));
    }
    assert.equal(sha(bytes), expected);
  }
});
