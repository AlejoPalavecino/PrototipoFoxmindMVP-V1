import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnection } from 'node:net';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, readFile, writeFile, realpath, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { withP4Services, P4_IMAGES, P4_SCANNER_START } from '../scripts/p4-services.mjs';
import { createOwnedServiceControls } from '../scripts/p9-runtime-controls.mjs';

const expectedSha256 = '87c87df114bc78e95430afc0e8b16d54b2ce27708162f8155a319e1ae084c9fd';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const safeError = error => ({ name: error?.name ?? 'Error', code: error?.code ?? 'DIAGNOSTIC_UNAVAILABLE' });
const safeOutput = value => /(?:password|secret|token|https?:|@)/i.test(value) ? '[redacted diagnostic text]' : value.slice(0, 4096);

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

// All synchronous commands are confined to preparation or after the payload scan.
function ownedCommand(id, args, timeout = 10000, maxBuffer = 262144) {
  assert.match(id, /^[a-f0-9]{64}$/);
  const start = Date.now(), result = spawnSync('docker', [...args, id], {
    encoding: 'utf8', windowsHide: true, timeout, maxBuffer,
  });
  return { status: result.status, error: result.error?.code, elapsedMs: Date.now() - start,
    stdout: result.stdout ?? '', stderr: safeOutput(result.stderr ?? '') };
}

function execRead(id, command, timeout = 10000) {
  assert.match(id, /^[a-f0-9]{64}$/);
  const start = Date.now(), result = spawnSync('docker', ['exec', id, 'sh', '-c', command], {
    encoding: 'utf8', windowsHide: true, timeout, maxBuffer: 262144,
  });
  return { status: result.status, error: result.error?.code, elapsedMs: Date.now() - start,
    stdout: result.stdout ?? '', stderr: safeOutput(result.stderr ?? '') };
}

async function controlCommand(endpoint, command, timeoutMs = 3000) {
  assert.ok(['PING', 'VERSION'].includes(command)); assert.equal(endpoint.host, '127.0.0.1');
  const start = Date.now();
  return new Promise(resolveResult => {
    const socket = createConnection({ host: endpoint.host, port: endpoint.port });
    let settled = false, response = Buffer.alloc(0);
    const finish = result => {
      if (settled) return; settled = true; clearTimeout(timer); socket.destroy();
      resolveResult({ command, elapsedMs: Date.now() - start, ...result });
    };
    const timer = setTimeout(() => finish({ unavailable: 'CONTROL_TIMEOUT' }), timeoutMs);
    socket.on('error', error => finish({ unavailable: safeError(error) }));
    socket.on('close', () => { if (!settled) finish({ unavailable: 'CONTROL_CLOSED' }); });
    socket.on('connect', () => socket.write(`z${command}\0`));
    socket.on('data', chunk => {
      response = Buffer.concat([response, chunk]);
      if (response.length > 4096) return finish({ unavailable: 'CONTROL_BOUND' });
      const end = response.indexOf(0);
      if (end >= 0) finish({ text: safeOutput(response.subarray(0, end).toString('utf8')) });
    });
  });
}

function startTrace(id, since, scratch) {
  assert.match(id, /^[a-f0-9]{64}$/);
  const started = Date.now(), headCap = 262144, tailCap = 2097152;
  const record = { startedAt: new Date(started).toISOString(), headCap, tailCap, channels: {}, command: ['logs', '--follow', '--timestamps', '--since', since, id] };
  const buffers = {};
  for (const channel of ['stdout', 'stderr']) {
    buffers[channel] = { head: Buffer.alloc(0), tail: Buffer.alloc(0) };
    record.channels[channel] = { totalBytes: 0, newlines: 0 };
  }
  const setup = performance.now(), child = spawn('docker', record.command, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  record.setupMs = performance.now() - setup;
  for (const channel of ['stdout', 'stderr']) child[channel].on('data', chunk => {
    const state = buffers[channel], meta = record.channels[channel]; meta.totalBytes += chunk.length;
    for (const byte of chunk) if (byte === 10) meta.newlines++;
    if (state.head.length < headCap) state.head = Buffer.concat([state.head, chunk.subarray(0, headCap - state.head.length)]);
    state.tail = Buffer.concat([state.tail, chunk]);
    if (state.tail.length > tailCap) state.tail = state.tail.subarray(state.tail.length - tailCap);
  });
  const ready = new Promise((resolveReady, reject) => { child.once('spawn', resolveReady); child.once('error', reject); });
  child.on('error', error => { record.error = safeError(error); });
  const closed = new Promise(resolveClosed => child.once('close', (status, signal) => { record.status = status; record.signal = signal; resolveClosed(); }));
  let stopping;
  return { record, ready, stop() {
    if (stopping) return stopping;
    stopping = (async () => {
      const start = performance.now(); if (child.exitCode === null && child.signalCode === null) child.kill();
      await closed; record.stopWaitMs = performance.now() - start; record.wallMs = Date.now() - started;
      for (const channel of ['stdout', 'stderr']) {
        const state = buffers[channel], meta = record.channels[channel];
        meta.headBytes = state.head.length; meta.tailBytes = state.tail.length;
        meta.overlapBytes = Math.max(0, meta.headBytes + meta.tailBytes - meta.totalBytes);
        meta.droppedBytes = Math.max(0, meta.totalBytes - meta.headBytes - meta.tailBytes);
        meta.truncated = meta.droppedBytes > 0;
        meta.headFile = `debug-${channel}-head.log`; meta.tailFile = `debug-${channel}-tail.log`;
        await writeFile(join(scratch, meta.headFile), state.head); await writeFile(join(scratch, meta.tailFile), state.tail);
      }
    })(); return stopping;
  } };
}

function counterDelta(before, after) {
  const parse = text => Object.fromEntries([...text.matchAll(/^([a-z_]+) (\d+)$/gm)].map(match => [match[1], BigInt(match[2])]));
  const a = parse(before), b = parse(after);
  return Object.fromEntries(Object.keys(a).filter(key => Object.hasOwn(b, key)).map(key => [key, String(b[key] - a[key])]));
}

test('P9 detailed same-file scanner debug/signature/cgroup diagnosis only, not capacity', { timeout: 330000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p9-scanner-detailed-diagnostic-'));
  console.log('P9 detailed scanner evidence:', scratch);
  const evidence = { diagnosticOnly: true, capacityAcceptance: false, scanCount: 0,
    limits: { serverMs: 25000, clientMs: 30000, testMs: 330000, childMs: 360000 }, snapshots: {} };
  const flush = () => writeFile(join(scratch, 'safe-detailed-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  let trace;
  try {
    const input = process.env.FOXMIND_P9_DETAILED_DIAGNOSTIC_INPUT;
    assert.ok(input); const bytes = await readFile(input);
    evidence.input = { path: resolve(input), size: bytes.length, sha256: sha256(bytes) }; await flush();
    assert.equal(bytes.length, 50_000_000); assert.equal(evidence.input.sha256, expectedSha256);
    await withP4Services(async runtime => {
      try {
        assert.match(runtime.owner, /^[a-f0-9]{16}$/);
        const initial = createOwnedServiceControls(runtime).inspectServices(); evidence.snapshots.initial = initial;
        const expectedFolder = resolve('.test-artifacts', `foxmind-p4-${runtime.owner}`), configPath = join(expectedFolder, 'clamd.conf');
        assert.equal(await realpath(expectedFolder), expectedFolder);
        assert.equal(await realpath(configPath), configPath);
        assert.equal(dirname(configPath), expectedFolder); assert.ok((await lstat(configPath)).isFile());
        assert.equal((await lstat(configPath)).isSymbolicLink(), false);
        const before = await readFile(configPath, 'utf8');
        assert.match(before, /^MaxScanTime 25000$/m); assert.equal(/^Debug /m.test(before), false);
        // The only authorized ephemeral configuration change; no source/helper write.
        await writeFile(configPath, before + 'Debug yes\n');
        assert.equal(await readFile(configPath, 'utf8'), before + 'Debug yes\n');
        evidence.config = { path: configPath, before, after: before + 'Debug yes\n', beforeSha256: sha256(Buffer.from(before)),
          afterSha256: sha256(Buffer.from(before + 'Debug yes\n')), soleDelta: 'Debug yes\n' };
        const restartAt = new Date().toISOString();
        evidence.restart = ownedCommand(initial.scanner.id, ['restart'], 15000); await flush();
        assert.equal(evidence.restart.status, 0);
        // Random published port may change on restart. Fresh admission uses its actual new binding.
        const controls = createOwnedServiceControls(runtime); let services, ping;
        const deadline = Date.now() + 120000;
        do {
          services = controls.inspectServices(); ping = await controlCommand(services.scanner, 'PING', 1000);
          if (ping.text === 'PONG') break; await delay(250);
        } while (Date.now() < deadline);
        evidence.snapshots.afterRestart = services; evidence.readiness = ping;
        assert.equal(services.scanner.id, initial.scanner.id); assert.equal(ping.text, 'PONG');
        const endpoint = services.scanner;
        const imageFormat = '{"id":{{json .Id}},"configured":{{json .Config.Image}},"image":{{json .Image}},"memory":{{json .HostConfig.Memory}},"nanoCpus":{{json .HostConfig.NanoCpus}},"cgroupns":{{json .HostConfig.CgroupnsMode}},"entrypoint":{{json .Config.Entrypoint}},"command":{{json .Config.Cmd}}}';
        const inspected = ownedCommand(endpoint.id, ['inspect', '--format', imageFormat]); assert.equal(inspected.status, 0);
        const provenance = JSON.parse(inspected.stdout);
        assert.equal(provenance.configured, P4_IMAGES.scanner); assert.equal(provenance.image, P4_IMAGES.scanner.split('@')[1]);
        assert.equal(provenance.memory, 4 * 1024 ** 3); assert.equal(provenance.nanoCpus, 1_500_000_000);
        assert.deepEqual(provenance.command, ['-c', P4_SCANNER_START]); assert.deepEqual(provenance.entrypoint, ['/bin/sh']);
        evidence.snapshots.provenance = provenance;
        evidence.effectiveConfig = execRead(endpoint.id, 'cat /etc/clamav/clamd.conf');
        assert.equal(evidence.effectiveConfig.status, 0); assert.equal(evidence.effectiveConfig.stdout, evidence.config.after);
        evidence.loadedVersion = await controlCommand(endpoint, 'VERSION'); assert.match(evidence.loadedVersion.text ?? '', /^ClamAV /);
        const dbCommand = `for f in /var/lib/clamav/*.cvd /var/lib/clamav/*.cld /var/lib/clamav/*.cud /var/lib/clamav/*.ldb /var/lib/clamav/*.ndb /var/lib/clamav/*.hdb /var/lib/clamav/*.yar /var/lib/clamav/*.yara; do if [ -f "$f" ]; then printf '\n__DB__%s\n' "$f"; sha256sum "$f"; stat -c 'bytes=%s mtime=%Y' "$f"; case "$f" in *.cvd|*.cld) sigtool --info "$f" 2>&1 ;; esac; fi; done`;
        evidence.databases = execRead(endpoint.id, dbCommand, 20000); assert.equal(evidence.databases.status, 0);
        assert.match(evidence.databases.stdout, /[a-f0-9]{64}/);
        const countersCommand = `printf '__CGROUP__\n'; cat /proc/self/cgroup; for f in cpu.stat cpu.max memory.current memory.peak memory.events memory.max; do printf '\n__FILE__%s\n' "$f"; if [ -r "/sys/fs/cgroup/$f" ]; then cat "/sys/fs/cgroup/$f"; else printf 'UNAVAILABLE\n'; fi; done`;
        trace = startTrace(endpoint.id, restartAt, scratch); await trace.ready;
        evidence.snapshots.cgroupBefore = { at: new Date().toISOString(), ...execRead(endpoint.id, countersCommand) };
        assert.equal(sha256(bytes), expectedSha256); evidence.scanCount++; evidence.scanStartedAt = new Date().toISOString(); await flush();
        try { evidence.nativeScan = await scanOnce(endpoint, bytes); }
        finally { evidence.scanFinishedAt = new Date().toISOString(); await trace.stop(); evidence.trace = trace.record; }
        evidence.snapshots.cgroupAfter = { at: new Date().toISOString(), ...execRead(endpoint.id, countersCommand) };
        const section = (value, name) => value.stdout.split(`__FILE__${name}\n`)[1]?.split('__FILE__')[0] ?? '';
        evidence.counterDeltas = { cpuStat: counterDelta(section(evidence.snapshots.cgroupBefore, 'cpu.stat'), section(evidence.snapshots.cgroupAfter, 'cpu.stat')),
          memoryEvents: counterDelta(section(evidence.snapshots.cgroupBefore, 'memory.events'), section(evidence.snapshots.cgroupAfter, 'memory.events')) };
        evidence.snapshots.beforeOwnedCleanup = controls.inspectServices();
        evidence.snapshots.afterProvenance = ownedCommand(endpoint.id, ['inspect', '--format', imageFormat]);
        assert.equal(evidence.snapshots.afterProvenance.status, 0);
        assert.deepEqual(JSON.parse(evidence.snapshots.afterProvenance.stdout), provenance);
        assert.equal(await readFile(configPath, 'utf8'), evidence.config.after);
        assert.equal(sha256(await readFile(input)), expectedSha256); await flush();
        assert.equal(evidence.scanCount, 1); assert.equal(evidence.nativeScan.bytesSent, 50_000_000); assert.equal(evidence.nativeScan.sent, true);
        assert.ok(['found', 'clean'].includes(evidence.nativeScan.outcome));
        assert.ok(Object.values(evidence.trace.channels).some(channel => channel.totalBytes > 0), 'Debug trace unavailable');
        evidence.outcome = 'DETAILED_DIAGNOSIS_CAPTURED_NOT_CAPACITY_ACCEPTANCE'; await flush();
        console.log('P9 detailed verdict', JSON.stringify(evidence.nativeScan));
        console.log('P9 detailed loaded version', JSON.stringify(evidence.loadedVersion));
        console.log('P9 detailed counters', JSON.stringify(evidence.counterDeltas));
        console.log('P9 detailed trace bounds', JSON.stringify(evidence.trace));
      } finally { if (trace) { await trace.stop(); evidence.trace = trace.record; } await flush(); }
    });
  } catch (error) { evidence.failure = safeError(error); await flush(); throw error; }
  finally { await flush(); }
});
