import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { withP4Services, P4_IMAGES, P4_SCANNER_START } from '../scripts/p4-services.mjs';
import { createOwnedServiceControls } from '../scripts/p9-runtime-controls.mjs';

const expectedSha256 = '87c87df114bc78e95430afc0e8b16d54b2ce27708162f8155a319e1ae084c9fd';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const safeError = error => ({ name: error?.name ?? 'Error', code: error?.code ?? 'DIAGNOSTIC_UNAVAILABLE' });
const safeOutput = value => /(?:password|secret|token|https?:|@)/i.test(value) ? '[redacted diagnostic text]' : value.slice(0, 4096);

// Same read-only INSTREAM algorithm as the preserved stress diagnostic; only the retained input differs.
async function scanOnce(endpoint, bytes) {
  assert.equal(endpoint.host, '127.0.0.1'); assert.equal(endpoint.paused, false);
  const start = Date.now();
  return new Promise(resolve => {
    let response = Buffer.alloc(0), settled = false, sent = false, offset = 0;
    const socket = createConnection({ host: endpoint.host, port: endpoint.port });
    const finish = result => {
      if (settled) return; settled = true; clearTimeout(timer); socket.destroy();
      resolve({ protocol: 'zINSTREAM', timeoutMs: 15000, elapsedMs: Date.now() - start, bytesSent: offset, sent, ...result });
    };
    const timer = setTimeout(() => finish({ outcome: 'timeout' }), 15000);
    socket.on('error', error => finish({ outcome: 'connection-error', error: safeError(error) }));
    socket.on('close', () => { if (!settled) finish({ outcome: 'closed-without-verdict' }); });
    socket.on('data', chunk => {
      response = Buffer.concat([response, chunk]);
      if (!sent || response.length > 4096) return finish({ outcome: 'invalid-response' });
      const end = response.indexOf(0); if (end < 0) return;
      if (end !== response.length - 1) return finish({ outcome: 'invalid-response' });
      const verdict = response.subarray(0, end).toString('utf8');
      const outcome = verdict === 'stream: OK' ? 'clean' : /^stream: [^\r\n\u0000]+ FOUND$/.test(verdict) ? 'found' : 'unavailable';
      finish({ outcome, verdict: safeOutput(verdict) });
    });
    socket.once('connect', () => {
      socket.write('zINSTREAM\0');
      const send = () => {
        while (!settled && offset < bytes.length) {
          const chunk = bytes.subarray(offset, offset + 65536); offset += chunk.length;
          const size = Buffer.alloc(4); size.writeUInt32BE(chunk.length); socket.write(size);
          if (!socket.write(chunk)) { socket.once('drain', send); return; }
        }
        if (!settled) { sent = true; socket.write(Buffer.alloc(4)); }
      };
      send();
    });
  });
}

test('P9 retained representative exact50M native scanner diagnosis only, not capacity acceptance', { timeout: 330000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p9-positive-scanner-diagnostic-'));
  console.log('P9 positive scanner diagnostic retained evidence:', scratch);
  const evidence = { diagnosticOnly: true, capacityAcceptance: false, nativeScanCount: 0,
    limits: { testMs: 330000, childMs: 360000, clientMs: 15000, chunkBytes: 65536 }, snapshots: {} };
  const flush = () => writeFile(join(scratch, 'safe-scanner-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  await flush();
  try {
    const input = process.env.FOXMIND_P9_SCANNER_DIAGNOSTIC_INPUT;
    assert.ok(typeof input === 'string' && input.length > 0, 'Explicit retained input path is required');
    const bytes = await readFile(input);
    evidence.input = { path: resolve(input), bytes: bytes.length, sha256: sha256(bytes) }; await flush();
    assert.equal(bytes.length, 50_000_000); assert.equal(evidence.input.sha256, expectedSha256);
    await withP4Services(async runtime => {
      const controls = createOwnedServiceControls(runtime);
      try {
        evidence.snapshots.ownedServices = controls.inspectServices();
        const endpoint = evidence.snapshots.ownedServices.scanner;
        assert.equal(endpoint.host, '127.0.0.1'); assert.equal(endpoint.paused, false);
        assert.equal(endpoint.port, runtime.scannerPort);
        const config = await readFile(resolve('.test-artifacts', 'foxmind-p4-' + runtime.owner, 'clamd.conf'), 'utf8');
        const expectedConfig = ['Foreground yes', 'User clamav', 'DatabaseDirectory /var/lib/clamav', 'TCPSocket 3310', 'TCPAddr 0.0.0.0',
          'MaxThreads 2', 'MaxQueue 4', 'ReadTimeout 15', 'CommandReadTimeout 5', 'SendBufTimeout 1000',
          'StreamMaxLength 50000000', 'MaxFileSize 100000000', 'MaxScanSize 200000000', 'MaxRecursion 8',
          'MaxFiles 1000', 'MaxScanTime 12000', 'AlertExceedsMax yes', 'AlertEncrypted yes', 'AlertOLE2Macros yes',
          'ScanArchive yes', 'ScanPDF yes', 'ScanXMLDOCS yes', 'AlertBrokenMedia yes', 'FailIfCvdOlderThan 7'].join('\n') + '\n';
        assert.equal(config, expectedConfig, 'Existing scanner configuration must remain exact');
        const imageFormat = '{"configured":{{json .Config.Image}},"image":{{json .Image}},"memory":{{json .HostConfig.Memory}},"nanoCpus":{{json .HostConfig.NanoCpus}},"entrypoint":{{json .Config.Entrypoint}},"command":{{json .Config.Cmd}}}';
        const inspected = spawnSync('docker', ['inspect', '--format', imageFormat, endpoint.name], {
          encoding: 'utf8', windowsHide: true, timeout: 5000,
        });
        assert.equal(inspected.status, 0, 'Exact-owned scanner provenance must be available');
        const image = JSON.parse(inspected.stdout);
        assert.equal(image.configured, P4_IMAGES.scanner);
        assert.equal(image.image, P4_IMAGES.scanner.split('@')[1]);
        assert.equal(image.memory, 4 * 1024 ** 3); assert.equal(image.nanoCpus, 1_500_000_000);
        assert.deepEqual(image.entrypoint, ['/bin/sh']); assert.deepEqual(image.command, ['-c', P4_SCANNER_START]);
        evidence.snapshots.provenance = { image, config, configSha256: sha256(Buffer.from(config)),
          freshclamConfigSha256: sha256(await readFile('config/p4-freshclam.conf')), owner: runtime.owner,
          ownerFolder: '.test-artifacts/foxmind-p4-' + runtime.owner };
        await flush();
        // Identity was checked before provisioning and is checked again immediately before the only native scan.
        assert.equal(sha256(bytes), expectedSha256); assert.equal(bytes.length, 50_000_000);
        evidence.nativeScanCount++; await flush();
        evidence.nativeScan = await scanOnce(endpoint, bytes); await flush();
        assert.equal(evidence.nativeScanCount, 1);
        assert.ok(['clean', 'found'].includes(evidence.nativeScan.outcome), 'A complete native verdict is required');
        assert.equal(evidence.nativeScan.sent, true); assert.equal(evidence.nativeScan.bytesSent, 50_000_000);
        assert.equal(sha256(await readFile(input)), expectedSha256, 'Retained file must remain unchanged');
        evidence.outcome = 'SCANNER_DIAGNOSIS_CAPTURED_NOT_CAPACITY_ACCEPTANCE'; await flush();
        console.log('P9 positive scanner diagnostic outcome', evidence.outcome);
        console.log('P9 positive scanner native verdict', JSON.stringify(evidence.nativeScan));
      } finally {
        try { evidence.snapshots.beforeOwnedCleanup = controls.inspectServices(); }
        catch (error) { evidence.snapshots.beforeOwnedCleanup = { unavailable: safeError(error) }; }
        await flush();
      }
    });
  } catch (error) { evidence.failure = safeError(error); await flush(); throw error; }
  finally { await flush(); }
});
