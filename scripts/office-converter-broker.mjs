// S12: the only local process with Docker access for legacy Office conversion.
// It knows one operation: run the fixed disposable converter image, without network, for one .doc/.ppt.
// The API sends bytes over loopback HTTP with a shared token and never executes docker itself.
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAX_BYTES = 20_000_000, MAX_ACTIVE = 2, IMAGE = 'foxmind-office-converter:local';
const extensions = new Set(['doc', 'ppt']);

/** Hardened, fixed `docker run` arguments; only the extension and a random container name vary. */
export function converterArguments(extension, name) {
  if (!extensions.has(extension) || !/^foxmind-office-[A-Za-z0-9-]+$/u.test(name)) throw new Error('Unsupported conversion');
  return ['run', '--rm', '--interactive', '--pull=never', '--name', name, '--network=none',
    '--read-only', '--tmpfs', '/scratch:rw,nosuid,nodev,noexec,size=96m,mode=1777',
    '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777', '--user=65534:65534',
    '--security-opt=no-new-privileges', '--cap-drop=ALL', '--pids-limit=32', '--memory=512m',
    '--memory-swap=512m', '--cpus=1', IMAGE, extension];
}

/** Runs one disposable container. Exit code 2 means the converter rejected the document. */
export function dockerConverter(extension, bytes) {
  const name = `foxmind-office-${randomUUID()}`;
  return new Promise((resolve, reject) => {
    const child = execFile('docker', converterArguments(extension, name),
      { windowsHide: true, encoding: 'buffer', timeout: 14_000, maxBuffer: MAX_BYTES }, (error, stdout) => {
        if (error || !stdout.length) reject(Object.assign(new Error('Conversion failed'), { rejected: error?.code === 2 }));
        else resolve(stdout);
      });
    // Docker may reject the operation before consuming stdin.
    child.stdin?.on('error', () => {});
    child.stdin?.end(bytes);
  }).finally(() => new Promise(resolve => {
    execFile('docker', ['rm', '--force', name], { windowsHide: true, timeout: 3000 }, () => resolve());
  }));
}

const digest = value => createHash('sha256').update(value).digest();

export function createOfficeConverterBroker({ token, run = dockerConverter }) {
  if (typeof token !== 'string' || token.length < 32 || /[^A-Za-z0-9_-]/u.test(token)) throw new Error('Office broker token must be at least 32 base64url characters');
  const expected = digest(`Bearer ${token}`);
  let active = 0;
  return createServer(async (request, response) => {
    const reply = (status, body) => { response.writeHead(status, { 'cache-control': 'no-store' }); response.end(body); };
    if (!timingSafeEqual(digest(request.headers.authorization ?? ''), expected)) { request.resume(); return reply(401); }
    const match = /^\/convert\/([a-z]+)$/u.exec(request.url ?? '');
    if (!match || !extensions.has(match[1])) { request.resume(); return reply(404); }
    if (request.method !== 'POST') { request.resume(); return reply(405); }
    const declared = Number(request.headers['content-length']);
    if (!Number.isSafeInteger(declared) || declared < 1 || declared > MAX_BYTES) { request.resume(); return reply(declared > MAX_BYTES ? 413 : 411); }
    if (active >= MAX_ACTIVE) { request.resume(); return reply(503); }
    active++;
    try {
      const chunks = []; let size = 0;
      for await (const chunk of request) { size += chunk.length; if (size > MAX_BYTES) return reply(413); chunks.push(chunk); }
      const converted = await run(match[1], Buffer.concat(chunks));
      reply(200, converted);
    } catch (error) {
      reply(error?.rejected ? 422 : 503);
    } finally { active--; }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const port = Number(process.env.FOXMIND_OFFICE_BROKER_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('FOXMIND_OFFICE_BROKER_PORT is required');
  const server = createOfficeConverterBroker({ token: process.env.FOXMIND_OFFICE_BROKER_TOKEN });
  server.requestTimeout = 30_000;
  server.listen(port, '127.0.0.1');
  const stop = () => server.close(() => process.exit(0));
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
