import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..'), directory = resolve(root, '.p4-local');
async function readCredentials() {
  const text = await readFile(resolve(directory, 'private.json'), 'utf8');
  let value; try { value = JSON.parse(text); } catch { throw new Error('P4 local credentials invalid'); }
  if (!value || !/^[a-f0-9]{64}$/.test(value.password) || !/^[a-f0-9]{32}$/.test(value.accessKeyId)
    || !/^[a-f0-9]{64}$/.test(value.secretAccessKey)) throw new Error('P4 local credentials invalid');
  return value;
}
export async function p4LocalConfiguration() {
  const credentials = await readCredentials();
  return { endpoint: 'http://127.0.0.1:18334', region: 'us-east-1', bucket: 'foxmind-private',
    accessKeyId: credentials.accessKeyId, secretAccessKey: credentials.secretAccessKey,
    scannerHost: '127.0.0.1', scannerPort: 13311,
    databaseUrl: `postgresql://postgres:${credentials.password}@127.0.0.1:55434/foxmind_p4` };
}
async function docker(args, env, timeout = 200000) {
  return new Promise((resolveRun, reject) => {
    const child = spawn('docker', args, { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    // Driver output may include configuration details; report only sanitized status.
    let output = ''; child.stdout.on('data', data => { if (output.length < 65536) output += data; }); child.stderr.resume();
    const timer = setTimeout(() => { child.kill(); reject(new Error('P4 local command deadline exceeded')); }, timeout);
    child.once('error', () => { clearTimeout(timer); reject(new Error('P4 local Docker unavailable')); });
    child.once('exit', status => { clearTimeout(timer); if (status === 0) resolveRun(output); else reject(new Error('P4 local Docker command failed')); });
  });
}
export async function p4Local(action) {
  if (!['up', 'stop', 'status', 'check', 'migrate', 'drift', 'restart-storage'].includes(action)) throw new Error('Invalid P4 local action');
  if (action === 'up') {
    await mkdir(directory, { recursive: true });
    try { await readCredentials(); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      // Never regenerate secrets against an existing volume whose configuration has been lost.
      await new Promise((resolveAbsent, reject) => {
        const child = spawn('docker', ['volume', 'ls', '--filter', 'label=com.docker.compose.project=foxmind-p4-files', '--format', '{{.Name}}'],
          { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = ''; child.stdout.on('data', data => { output += data; }); child.stderr.resume();
        const timer = setTimeout(() => { child.kill(); reject(new Error('P4 local volume check unavailable')); }, 5000);
        child.once('error', () => { clearTimeout(timer); reject(new Error('P4 local volume check unavailable')); });
        child.once('exit', status => { clearTimeout(timer); if (status === 0 && !output.trim()) resolveAbsent();
          else reject(new Error('Restore P4 local credentials before using retained volumes')); });
      });
      await writeFile(resolve(directory, 'private.json'), JSON.stringify({ password: randomBytes(32).toString('hex'),
        accessKeyId: randomBytes(16).toString('hex'), secretAccessKey: randomBytes(32).toString('hex') }), { flag: 'wx', mode: 0o600 });
    }
    const credentials = await readCredentials();
    await writeFile(resolve(directory, 's3.json'), JSON.stringify({ identities: [{ name: 'p4-backend',
      credentials: [{ accessKey: credentials.accessKeyId, secretKey: credentials.secretAccessKey }], actions: ['Admin', 'Read', 'Write', 'List'] }] }), { mode: 0o600 });
  }
  const credentials = await readCredentials();
  if (action === 'migrate' || action === 'drift') {
    const configuration = await p4LocalConfiguration();
    await new Promise((resolveMigration, reject) => {
      const command = action === 'migrate' ? ['migrate', 'deploy'] : ['migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code'];
      const child = spawn(process.execPath, [resolve(root, 'node_modules/prisma/build/index.js'), ...command],
        { cwd: root, env: { ...process.env, DATABASE_URL: configuration.databaseUrl }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.resume(); child.stderr.resume();
      const timer = setTimeout(() => { child.kill(); reject(new Error('P4 local migration unavailable')); }, 60000);
      child.once('error', () => { clearTimeout(timer); reject(new Error('P4 local migration unavailable')); });
      child.once('exit', status => { clearTimeout(timer); if (status === 0) resolveMigration(); else reject(new Error('P4 local migration unavailable')); });
    });
    console.log(`P4 local ${action}: PASS`); return;
  }
  const args = ['compose', '--project-name', 'foxmind-p4-files', '--file', resolve(root, 'compose.p4.yaml')];
  const commands = { up: ['up', '--detach', '--wait', '--wait-timeout', '180'], stop: ['stop'],
    status: ['ps', '--all', '--format', '{{.Service}} {{.State}} {{.Health}}'], check: ['config', '--quiet'], 'restart-storage': ['restart', 'storage', 'postgres'] };
  const output = await docker([...args, ...commands[action]], { ...process.env, P4_POSTGRES_PASSWORD: credentials.password });
  if (action === 'status') {
    for (const service of ['postgres', 'storage', 'scanner']) {
      const line = output.split(/\r?\n/).find(line => line.startsWith(service + ' '));
      const fields = line?.trim().split(/\s+/);
      console.log(`P4 local ${service}: ${fields && ['running', 'exited', 'created', 'restarting', 'paused'].includes(fields[1]) ? fields[1] : 'unavailable'} ${fields && ['healthy', 'unhealthy', 'starting'].includes(fields[2]) ? fields[2] : ''}`.trim());
    }
  } else console.log(`P4 local ${action}: ${action === 'restart-storage' ? 'command completed; readiness must be checked' : 'PASS'}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') console.log('Usage: node scripts/p4-local.mjs <up|stop|status|check|migrate|drift|restart-storage>');
  else if (args.length !== 1) { console.error('Usage: node scripts/p4-local.mjs <up|stop|status|check|migrate|drift|restart-storage>'); process.exitCode = 2; }
  else { try { await p4Local(args[0]); } catch { console.error('P4 local operation unavailable; check service status and retained local configuration'); process.exitCode = 1; } }
}
