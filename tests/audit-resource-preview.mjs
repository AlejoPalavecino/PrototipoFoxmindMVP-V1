import { createServer } from 'node:http';
import { createServer as createVite } from 'vite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/tests/audit-resource-preview.jsx"></script></body></html>';

export async function withAuditResourcePreview(run) {
  const cacheDir = await mkdtemp(join(tmpdir(), 'foxmind-audit-vite-'));
  let vite, server, result, failure;
  try {
    vite = await createVite({ configFile: false, root: process.cwd(), cacheDir, server: { middlewareMode: true, hmr: false } });
    server = createServer((req, res) => {
      if (new URL(req.url, 'http://localhost').pathname === '/') {
        res.setHeader('content-type', 'text/html'); res.end(html); return;
      }
      vite.middlewares(req, res, () => { res.writeHead(404); res.end(); });
    });
    await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
    result = await run({ origin: `http://127.0.0.1:${server.address().port}` });
  } catch (error) { failure = error; }
  const errors = failure ? [failure] : [];
  for (const cleanup of [
    async () => { if (server?.listening) await new Promise((ok, fail) => server.close(error => error ? fail(error) : ok())); },
    async () => { if (vite) await vite.close(); },
    async () => {
      if (dirname(resolve(cacheDir)) !== resolve(tmpdir()) || !basename(cacheDir).startsWith('foxmind-audit-vite-')) {
        throw new Error('Unsafe preview cache path');
      }
      await rm(cacheDir, { recursive: true, force: true });
    },
  ]) {
    try { await cleanup(); } catch (error) { errors.push(error); }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length) throw new AggregateError(errors, 'Preview or cleanup failed');
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await withAuditResourcePreview(async ({ origin }) => {
    console.log(`PREVIEW ${origin}/`);
    await new Promise(resolve => {
      for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, resolve);
    });
  });
}
