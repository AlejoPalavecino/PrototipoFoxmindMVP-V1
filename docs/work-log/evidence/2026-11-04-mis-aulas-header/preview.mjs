import { createServer } from 'vite';
const server = await createServer({ configFile: false, root: process.cwd(), publicDir: 'apps/web/public', cacheDir: 'node_modules/.vite-mis-aulas-header', server: { host: '127.0.0.1', port: 4317, strictPort: true }, esbuild: { jsx: 'automatic' } });
await server.listen(); console.log('Mis aulas synthetic preview http://127.0.0.1:4317/docs/work-log/evidence/2026-11-04-mis-aulas-header/preview.html');
