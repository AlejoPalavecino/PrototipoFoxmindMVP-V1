import { createServer } from 'node:http';
import { build } from 'vite';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function withAuditResourcePreview(run) {
  const cacheDir = await mkdtemp(join(tmpdir(), 'foxmind-audit-vite-'));
  const outputDir = join(cacheDir, 'fixture');
  let server, result, failure;
  try {
    // The fixture bundles the same real component/CSS graph before browser readiness starts.
    // Its output and cache belong only to this disposable Temp directory.
    const began = Date.now();
    const bundled = await build({ configFile: false, root: process.cwd(), publicDir: resolve('apps/web/public'), cacheDir, logLevel: 'warn',
      build: { outDir: outputDir, emptyOutDir: false, cssMinify: false, rolldownOptions: {
        input: resolve('tests/audit-resource-preview.jsx'), output: { entryFileNames: 'fixture.js', assetFileNames: 'assets/[name][extname]' },
      } } });
    const outputs = (Array.isArray(bundled) ? bundled : [bundled]).flatMap(bundle => bundle.output);
    const styles = outputs.filter(item => item.type === 'asset' && item.fileName.endsWith('.css'))
      .map(item => `<link rel="stylesheet" href="/${item.fileName}">`).join('');
    const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>`;
    console.log(`Audit synthetic entry build: ${Date.now() - began}ms; ${outputs.length} outputs`);
    server = createServer(async (req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (pathname === '/') { res.setHeader('content-type', 'text/html'); res.end(html); return; }
        const file = resolve(outputDir, pathname.slice(1)), within = relative(outputDir, file);
        if (within.startsWith('..') || isAbsolute(within)) { res.writeHead(403); res.end(); return; }
        const body = await readFile(file);
        res.setHeader('content-type', ({ '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2' })[extname(file)] ?? 'application/octet-stream');
        res.end(body);
      } catch (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(); }
    });
    await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
    result = await run({ origin: `http://127.0.0.1:${server.address().port}` });
  } catch (error) { failure = error; }
  const errors = failure ? [failure] : [];
  for (const cleanup of [
    async () => { if (server?.listening) await new Promise((ok, fail) => server.close(error => error ? fail(error) : ok())); },
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
