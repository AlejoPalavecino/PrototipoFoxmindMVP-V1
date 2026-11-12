// Isolated UI acceptance harness: actual components/CSS, synthetic HomeClient, no credentials/provider.
import {createServer} from 'vite';
import {resolve} from 'node:path';
const server=await createServer({root:process.cwd(),publicDir:resolve('apps/web/public'),configFile:false,
  esbuild:{jsx:'automatic'},server:{host:'127.0.0.1',port:4328,strictPort:true},
  plugins:[{name:'home-acceptance',configureServer(server){server.middlewares.use((req,res,next)=>{
  if(req.url?.split('?')[0]!=='/')return next();
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inicio por rol — QA sintético</title></head><body><div id="root"></div><script type="module" src="/tests/fixtures/home-audit-preview.tsx"></script></body></html>');
});}}]});
await server.listen();console.log('Synthetic Home preview: http://127.0.0.1:4328');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
