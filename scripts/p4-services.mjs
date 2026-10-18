import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { createConnection, createServer } from 'node:net';
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
import pg from 'pg';

export const P4_IMAGES = {
  storage: 'chrislusf/seaweedfs:4.48@sha256:4e61d15fd35994cb1e43e1e553dff106794841fd9a99ade2fc8c8bfce4d7872d',
  scanner: 'clamav/clamav:1.5.4@sha256:638d90201ee7ee6a82d249a2fc23b132e578673b5f1f2766852b127676ca1ef6',
  database: 'postgres:17.10-bookworm',
};
export const P4_SCANNER_START = 'freshclam --stdout --config-file=/etc/clamav/p4-freshclam.conf || true; exec clamd --foreground --config-file=/etc/clamav/clamd.conf';
/** Own all fixture resources. Never attach to existing development containers/volumes. */
export async function withP4Services(run, { persistent = false } = {}) {
  const tag = randomBytes(8).toString('hex'), prefix = `foxmind-p4-${tag}`;
  const folder = resolve('.test-artifacts', prefix);
  await mkdir(folder, { recursive: true });
  const secret = randomBytes(32).toString('hex'), accessKeyId = randomBytes(16).toString('hex');
  const auth = resolve(folder, 's3.json'), config = resolve(folder, 'clamd.conf');
  await writeFile(auth, JSON.stringify({ identities: [{ name: 'p4-backend',
    credentials: [{ accessKey: accessKeyId, secretKey: secret }], actions: ['Admin', 'Read', 'Write', 'List'] }] }));
  await writeFile(config, [
    'Foreground yes', 'User clamav', 'DatabaseDirectory /var/lib/clamav', 'TCPSocket 3310', 'TCPAddr 0.0.0.0',
    'MaxThreads 2', 'MaxQueue 4', 'ReadTimeout 15', 'CommandReadTimeout 5', 'SendBufTimeout 1000',
    'StreamMaxLength 50000000', 'MaxFileSize 100000000', 'MaxScanSize 200000000', 'MaxRecursion 8',
    'MaxFiles 1000', 'MaxScanTime 12000', 'AlertExceedsMax yes', 'AlertEncrypted yes', 'AlertOLE2Macros yes',
    'ScanArchive yes', 'ScanPDF yes', 'ScanXMLDOCS yes', 'AlertBrokenMedia yes', 'FailIfCvdOlderThan 7',
  ].join('\n') + '\n');
  const names = [], volumes = [];
  const docker = (...args) => {
    const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 15000,
      env: { ...process.env, POSTGRES_PASSWORD: secret } });
    if (result.error || result.status !== 0) throw new Error(`P4 Docker ${args[0]} unavailable`);
    return result.stdout.trim();
  };
  const start = (suffix, image, args, command) => {
    const name = `${prefix}-${suffix}`; names.push(name);
    docker('run', '--detach', '--rm', '--pull=never', '--name', name, '--label', `foxmind.p4.owner=${tag}`,
      '--network', prefix, ...args, image, ...command);
    return name;
  };
  const port = (name, internal) => Number(docker('inspect', '--format', `{{(index (index .NetworkSettings.Ports "${internal}/tcp") 0).HostPort}}`, name));
  const dataMount = (suffix, destination) => {
    if (!persistent) return ['--tmpfs', destination];
    const name = `${prefix}-${suffix}`;
    docker('volume', 'create', '--label', `foxmind.p4.owner=${tag}`, name); volumes.push(name);
    return ['--mount', `type=volume,source=${name},target=${destination}`];
  };
  let network = false, s3;
  try {
    // Docker reallocates randomly published ports on restart. Persistent fixtures
    // need explicit loopback bindings so existing application connections stay valid.
    const publish = async internal => {
      if (!persistent) return `127.0.0.1::${internal}`;
      const server = createServer();
      await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
      const selected = server.address().port;
      await new Promise(resolve => server.close(resolve));
      return `127.0.0.1:${selected}:${internal}`;
    };
    docker('network', 'create', '--label', `foxmind.p4.owner=${tag}`, prefix); network = true;
    const db = start('db', P4_IMAGES.database, ['--memory=512m', '--cpus=0.75', '--pids-limit=128',
      '--publish', await publish(5432), ...dataMount('db-data', '/var/lib/postgresql/data'), '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=p4'], []);
    const storage = start('s3', P4_IMAGES.storage, ['--memory=768m', '--cpus=1', '--pids-limit=128',
      '--publish', await publish(8333), '--mount', `type=bind,source=${auth},target=/config/s3.json,readonly`, ...dataMount('s3-data', '/data')],
      ['mini', '-dir=/data', '-s3.config=/config/s3.json', '-bucket=foxmind-private', '-admin.ui=false', '-webdav=false']);
    const scanner = start('scan', P4_IMAGES.scanner, ['--memory=4g', '--cpus=1.5', '--pids-limit=256',
      '--publish', '127.0.0.1::3310', '--mount', `type=bind,source=${config},target=/etc/clamav/clamd.conf,readonly`,
      '--mount', `type=bind,source=${resolve('config/p4-freshclam.conf')},target=/etc/clamav/p4-freshclam.conf,readonly`, '--entrypoint=/bin/sh'],
      ['-c', P4_SCANNER_START]);
    const databasePort = port(db, 5432), s3Port = port(storage, 8333), scannerPort = port(scanner, 3310);
    const databaseUrl = `postgresql://postgres:${secret}@127.0.0.1:${databasePort}/p4`;
    const endpoint = `http://127.0.0.1:${s3Port}`;
    s3 = new S3Client({ endpoint, region: 'us-east-1', credentials: { accessKeyId, secretAccessKey: secret },
      forcePathStyle: true, maxAttempts: 1, requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
    const ready = async () => {
    const deadline = Date.now() + 180000;
    let dbReady = false, s3Ready = false, scanReady = false;
    while (Date.now() < deadline) {
      if (!dbReady) {
        const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 1000, query_timeout: 1000 });
        try { await client.connect(); await client.query('SELECT 1'); dbReady = true; } catch {} finally { await client.end().catch(() => {}); }
      }
      if (!s3Ready) { try { await s3.send(new ListBucketsCommand({}), { abortSignal: AbortSignal.timeout(1000) }); s3Ready = true; } catch {} }
      if (!scanReady) scanReady = await new Promise(resolveReady => {
        const socket = createConnection({ host: '127.0.0.1', port: scannerPort }); let response = '';
        const finish = value => { socket.destroy(); resolveReady(value); };
        socket.setTimeout(1000, () => finish(false)); socket.on('error', () => finish(false));
        socket.on('connect', () => socket.write('zPING\0'));
        socket.on('data', chunk => { response += chunk.toString(); if (response.includes('\0')) finish(response === 'PONG\0'); });
        socket.on('close', () => finish(false));
      });
      if (dbReady && s3Ready && scanReady) break;
      await pause(250);
    }
    if (!dbReady || !s3Ready || !scanReady) throw new Error(`P4 readiness unavailable: db=${dbReady},s3=${s3Ready},scan=${scanReady}`);
    };
    await ready();
    console.log('P4 isolated database/storage/scanner ready');
    // Trusted composition-only configuration; callers must never print credentials.
    const infrastructure = { endpoint, region: 'us-east-1', bucket: 'foxmind-private', accessKeyId,
      secretAccessKey: secret, scannerHost: '127.0.0.1', scannerPort };
    return await run({ databaseUrl, s3, endpoint, scannerHost: '127.0.0.1', scannerPort, names, owner: tag, infrastructure,
      async restartData() {
        if (!persistent) throw new Error('Data restart requires owned persistent fixtures');
        docker('restart', db, storage);
        if (port(db, 5432) !== databasePort || port(storage, 8333) !== s3Port) throw new Error('Persistent fixture port binding changed');
        await ready();
      } });
  } finally {
    s3?.destroy(); let failures = 0;
    for (const name of names.reverse()) {
      // The unguessable tag and label check restrict cleanup to this invocation's resources.
      const inspection = spawnSync('docker', ['inspect', '--format', '{{index .Config.Labels "foxmind.p4.owner"}}', name],
        { encoding: 'utf8', timeout: 5000, windowsHide: true });
      if (inspection.status === 0 && inspection.stdout.trim() === tag) {
        const result = spawnSync('docker', ['rm', '--force', name], { stdio: 'pipe', timeout: 15000, windowsHide: true });
        if (result.status !== 0) failures++;
      } else if (inspection.status !== 1) failures++;
    }
    if (network) { try { docker('network', 'rm', prefix); } catch { failures++; } }
    for (const name of volumes) {
      const inspection = spawnSync('docker', ['volume', 'inspect', '--format', '{{index .Labels "foxmind.p4.owner"}}', name],
        { encoding: 'utf8', timeout: 5000, windowsHide: true });
      if (inspection.status === 0 && inspection.stdout.trim() === tag) {
        const removed = spawnSync('docker', ['volume', 'rm', name], { encoding: 'utf8', timeout: 15000, windowsHide: true });
        if (removed.status !== 0) failures++;
      } else failures++;
    }
    await unlink(auth).catch(() => {}); await unlink(config).catch(() => {});
    console.log(`P4 owned cleanup failures: ${failures}`);
    if (failures) throw new Error('P4 owned cleanup unavailable');
  }
}
