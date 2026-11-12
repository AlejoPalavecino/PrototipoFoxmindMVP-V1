import { createServer } from 'vite';
import { resolve } from 'node:path';
const server = await createServer({ root: process.cwd(), publicDir: resolve('apps/web/public'), configFile: false,
  esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 4327, strictPort: true },
  plugins: [{ name: 'agenda-ux-acceptance', configureServer(server) { server.middlewares.use((req, res, next) => {
    if (req.url?.split('?')[0] !== '/') return next();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agenda — QA sintético</title></head><body><div id="root"></div><script type="module" src="/tests/fixtures/agenda-ux-preview.tsx"></script></body></html>');
  }); } }],
});
await server.listen(); console.log('Agenda synthetic QA: http://127.0.0.1:4327');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await server.close(); process.exit(0); });
