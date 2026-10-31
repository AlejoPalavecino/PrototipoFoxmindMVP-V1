import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const conversationId = randomUUID(), turnId = randomUUID(), root = '/api/v1/foxy-ai';
async function serve(handler) { const server = createServer(handler); await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  return { origin:`http://127.0.0.1:${server.address().port}`, close:async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } }; }
async function fixture(run, responder) {
  const api = await import('./foxy-proxy.ts'); assert.equal(typeof api.proxyFoxyRequest, 'function');
  const calls = [], upstream = await serve(async (req,res) => { const chunks=[]; for await (const chunk of req) chunks.push(chunk);
    calls.push({ url:req.url, method:req.method, headers:req.headers, body:Buffer.concat(chunks) });
    if (responder) return responder(req,res); res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:true })); });
  const web = await serve((req,res) => void api.proxyFoxyRequest(req,res,upstream.origin));
  try { await run({ origin:web.origin, calls }); } finally { await web.close(); await upstream.close(); }
}
const headers = { cookie:'foxmind_session=synthetic', origin:'http://web.test', 'x-csrf-token':'bound', 'content-type':'application/json' };

test('proxy forwards allowlisted Foxy routes and only needed security headers', async () => fixture(async ({origin,calls}) => {
  const path = `${root}/conversations`, body = { requestId:randomUUID(), title:'Chat', context:{kind:'GENERAL'} };
  const response = await fetch(origin+path,{ method:'POST', headers:{...headers,authorization:'private','x-forwarded-host':'evil.test'}, body:JSON.stringify(body) });
  assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'no-store'); assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  assert.equal(calls.length,1); assert.equal(calls[0].url,path); assert.deepEqual(JSON.parse(calls[0].body),body);
  for (const name of ['cookie','origin','x-csrf-token']) assert.equal(calls[0].headers[name],headers[name]);
  assert.equal(calls[0].headers.authorization,undefined); assert.equal(calls[0].headers['x-forwarded-host'],undefined);
}));

test('proxy blocks arbitrary URLs, path traversal, unsupported methods, queries and excessive requests', async () => fixture(async ({origin,calls}) => {
  for (const [path,method,body] of [[`${root}/unknown`,'GET'],[`${root}/conversations/${conversationId}`,'PUT','{}'],
    [`${root}/conversations?ownerId=foreign`,'GET'],[`${root}/conversations?limit=1&limit=2`,'GET'],
    [`${root}/conversations/%2e%2e%2fcapabilities`,'GET'],[`${root}/conversations/${conversationId}/turns/${turnId}/citations/${randomUUID()}/file`,'GET'],
    [`${root}/conversations`,'POST','x'.repeat(1048577)]]) {
    const response = await fetch(origin+path,{method,headers,...(body === undefined ? {} : {body})});
    assert.ok(response.status>=400 && response.status<500,`${method} ${path}: ${response.status}`);
  }
  assert.equal(calls.length,0);
}));

test('citation binary route preserves opaque path and safe response without redirect', async () => {
  const bytes=Buffer.from('%PDF-synthetic');
  await fixture(async ({origin,calls}) => {
    const path=`${root}/conversations/${conversationId}/turns/${turnId}/citations/c1/file?mode=preview`;
    const response=await fetch(origin+path,{headers}); assert.equal(response.status,200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes); assert.equal(response.headers.get('cache-control'),'no-store');
    assert.equal(response.headers.get('x-content-type-options'),'nosniff'); assert.equal(response.headers.get('location'),null);
    assert.equal(calls[0].url,path); assert.equal(calls[0].headers.cookie,headers.cookie);
  }, (_req,res)=>{ res.writeHead(200,{'Content-Type':'application/pdf','Content-Length':String(bytes.length),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(bytes); });
});

test('upstream redirects, oversized or non-JSON replies become sanitized failures', async () => {
  for (const mode of ['redirect','oversized','invalid']) await fixture(async ({origin}) => {
    const response=await fetch(`${origin}${root}/capabilities`,{headers,redirect:'manual'});
    assert.equal(response.status,503); assert.equal((await response.text()).includes('synthetic sensitive detail'),false);
    assert.equal(response.headers.get('location'),null);
  }, (_req,res) => { if (mode==='redirect') { res.writeHead(302,{Location:'http://evil.test'}); res.end(); }
    else if (mode==='oversized') { res.writeHead(200,{'content-type':'application/json','content-length':String(2*1024*1024+1)}); res.end(); }
    else { res.writeHead(200,{'content-type':'text/html'}); res.end('synthetic sensitive detail'); } });
});

test('DOCX citation served as octet-stream remains a safe attachment', async () => {
  const bytes=Buffer.from('synthetic-docx-bytes');
  const disposition = "attachment; filename=\"file.docx\"; filename*=UTF-8''guia.docx";
  await fixture(async ({origin,calls}) => {
    const path=`${root}/conversations/${conversationId}/turns/${turnId}/citations/c1/file?mode=download`;
    const response=await fetch(origin+path,{headers}); assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'application/octet-stream');
    assert.equal(response.headers.get('content-disposition'),disposition);
    assert.equal(response.headers.get('cache-control'),'no-store'); assert.equal(response.headers.get('x-content-type-options'),'nosniff');
    assert.equal(response.headers.get('location'),null); assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
    assert.equal(calls[0].url,path);
  }, (_req,res)=>{ res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':disposition,
    'Content-Length':String(bytes.length),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(bytes); });
});

test('proxy forwards a bounded 2 MiB turn page without truncation', async () => {
  const page={items:Array.from({length:9},(_,i)=>({id:randomUUID(),sequence:i+1,answer:{markdown:'😀'.repeat(50000)}})),nextAfterSequence:9};
  const raw=JSON.stringify(page); assert.ok(Buffer.byteLength(raw,'utf8')<2*1024*1024);
  await fixture(async ({origin}) => { const response=await fetch(`${origin}${root}/conversations/${conversationId}/turns?afterSequence=0&limit=100`,{headers});
    assert.equal(response.status,200); assert.deepEqual(await response.json(),page);
  }, (_req,res)=>{ res.writeHead(200,{'Content-Type':'application/json','Content-Length':String(Buffer.byteLength(raw))}); res.end(raw); });
});
