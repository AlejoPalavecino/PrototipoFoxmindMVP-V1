import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { withP4Services, P4_IMAGES, P4_SCANNER_START } from '../scripts/p4-services.mjs';
import { createOwnedServiceControls } from '../scripts/p9-runtime-controls.mjs';

const expectedSha256 = '87c87df114bc78e95430afc0e8b16d54b2ce27708162f8155a319e1ae084c9fd';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const safeError = error => ({ name: error?.name ?? 'Error', code: error?.code ?? 'DIAGNOSTIC_UNAVAILABLE' });
const safeOutput = value => /(?:password|secret|token|https?:|@)/i.test(value) ? '[redacted diagnostic text]' : value.slice(0, 4096);

// Preserved INSTREAM algorithm with the current authorized30s client bound and retained input.
async function scanOnce(endpoint, bytes) {
  assert.equal(endpoint.host, '127.0.0.1'); assert.equal(endpoint.paused, false);
  const start = Date.now();
  return new Promise(resolve => {
    let response = Buffer.alloc(0), settled = false, sent = false, offset = 0;
    const socket = createConnection({ host: endpoint.host, port: endpoint.port });
    const finish = result => {
      if (settled) return; settled = true; clearTimeout(timer); socket.destroy();
      resolve({ protocol: 'zINSTREAM', timeoutMs: 30000, elapsedMs: Date.now() - start, bytesSent: offset, sent, ...result });
    };
    const timer = setTimeout(() => finish({ outcome: 'timeout' }), 30000);
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

// At most six low-frequency asynchronous samples of this exact owned scanner only.
async function observeOwnedResources(id, record, signal) {
  assert.match(id, /^[a-f0-9]{64}$/);
  const started = Date.now();
  record.command = ['stats', '--no-stream', '--no-trunc', '--format', '{{json .}}', id];
  record.maxSamples = 6; record.spacingMs = 5000; record.childTimeoutMs = 3500; record.samples = [];
  for (let index = 0; index < record.maxSamples && !signal.aborted; index++) {
    const remaining = started + index * record.spacingMs - Date.now();
    if (remaining > 0) {
      try { await delay(remaining, undefined, { signal }); } catch { break; }
    }
    if (signal.aborted) break;
    const sampleStart = Date.now();
    const sample = await new Promise(resolveSample => {
      let stdout = '', stderr = '', errorCode, timedOut = false, outputLimit = false;
      const child = spawn('docker', record.command, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const stop = () => { child.kill(); };
      signal.addEventListener('abort', stop, { once: true });
      const timer = setTimeout(() => { timedOut = true; stop(); }, record.childTimeoutMs);
      child.stdout.on('data', chunk => {
        stdout += chunk.toString();
        if (stdout.length > 8192) { stdout = stdout.slice(0, 8192); outputLimit = true; stop(); }
      });
      child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(0, 1024); });
      child.once('error', error => { errorCode = error.code ?? 'STATS_UNAVAILABLE'; });
      child.once('close', (status, childSignal) => {
        clearTimeout(timer); signal.removeEventListener('abort', stop);
        const row = { index, startOffsetMs: sampleStart - started, elapsedMs: Date.now() - sampleStart,
          status, signal: childSignal, errorCode, timedOut, aborted: signal.aborted, outputLimit };
        if (status === 0 && !outputLimit) {
          try {
            const raw = JSON.parse(stdout.trim());
            if (raw.ID !== id && raw.Container !== id) throw new Error('OWNED_STATS_ID_MISMATCH');
            row.resource = Object.fromEntries(['ID', 'Container', 'Name', 'CPUPerc', 'MemUsage', 'MemPerc', 'PIDs', 'NetIO', 'BlockIO']
              .filter(key => typeof raw[key] === 'string').map(key => [key, raw[key]]));
          } catch { row.parseUnavailable = true; }
        }
        if (stderr) row.stderr = safeOutput(stderr);
        resolveSample(row);
      });
    });
    record.samples.push(sample);
  }
  record.wallElapsedMs = Date.now() - started;
  record.childWallTotalMs = record.samples.reduce((sum, row) => sum + row.elapsedMs, 0);
  record.successfulSamples = record.samples.filter(row => row.resource).length;
}

test('P9 retained exact50M current25s/30s scanner verdict and owned resource diagnosis, not capacity acceptance', { timeout: 330000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p9-scanner-resource-diagnostic-'));
  console.log('P9 scanner resource diagnostic retained evidence:', scratch);
  const evidence = { diagnosticOnly: true, capacityAcceptance: false, nativeScanCount: 0,
    limits: { testMs: 330000, childMs: 360000, clientMs: 30000, chunkBytes: 65536 }, snapshots: {} };
  const flush = () => writeFile(join(scratch, 'safe-resource-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  await flush();
  try {
    const input = process.env.FOXMIND_P9_RESOURCE_DIAGNOSTIC_INPUT;
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
          'MaxFiles 1000', 'MaxScanTime 25000', 'AlertExceedsMax yes', 'AlertEncrypted yes', 'AlertOLE2Macros yes',
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
        evidence.monitor = {};
        const controller = new AbortController(), setupStart = performance.now();
        const monitor = observeOwnedResources(endpoint.id, evidence.monitor, controller.signal);
        evidence.monitor.setupMs = performance.now() - setupStart;
        try { evidence.nativeScan = await scanOnce(endpoint, bytes); }
        finally {
          const stopStart = performance.now(); controller.abort(); await monitor;
          evidence.monitor.stopWaitMs = performance.now() - stopStart; await flush();
        }
        assert.equal(evidence.nativeScanCount, 1);
        assert.ok(['clean', 'found'].includes(evidence.nativeScan.outcome), 'A complete native verdict is required');
        assert.equal(evidence.nativeScan.sent, true); assert.equal(evidence.nativeScan.bytesSent, 50_000_000);
        assert.ok(evidence.monitor.successfulSamples > 0, 'Owned resource observations must be available');
        assert.equal(sha256(await readFile(input)), expectedSha256, 'Retained file must remain unchanged');
        evidence.outcome = 'SCANNER_RESOURCE_DIAGNOSIS_CAPTURED_NOT_CAPACITY_ACCEPTANCE'; await flush();
        console.log('P9 scanner resource diagnostic outcome', evidence.outcome);
        console.log('P9 scanner resource native verdict', JSON.stringify(evidence.nativeScan));
        console.log('P9 scanner resource monitor', JSON.stringify(evidence.monitor));
      } finally {
        try { evidence.snapshots.beforeOwnedCleanup = controls.inspectServices(); }
        catch (error) { evidence.snapshots.beforeOwnedCleanup = { unavailable: safeError(error) }; }
        if (evidence.snapshots.provenance) {
          const owned = evidence.snapshots.ownedServices.scanner;
          const format = '{"id":{{json .Id}},"image":{{json .Image}},"memory":{{json .HostConfig.Memory}},"nanoCpus":{{json .HostConfig.NanoCpus}}}';
          // The scan and async monitor have finished before this read-only provenance call.
          const after = spawnSync('docker', ['inspect', '--format', format, owned.id], {
            encoding: 'utf8', windowsHide: true, timeout: 5000,
          });
          evidence.snapshots.afterResources = after.status === 0 ? JSON.parse(after.stdout)
            : { unavailable: { status: after.status, code: after.error?.code ?? 'AFTER_RESOURCE_UNAVAILABLE' } };
          await flush();
          assert.deepEqual(evidence.snapshots.afterResources, { id: owned.id, image: evidence.snapshots.provenance.image.image,
            memory: 4 * 1024 ** 3, nanoCpus: 1_500_000_000 });
        }
        await flush();
      }
    });
  } catch (error) { evidence.failure = safeError(error); await flush(); throw error; }
  finally { await flush(); }
});
