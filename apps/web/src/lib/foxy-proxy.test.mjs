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

test('invalid session clear-cookie reaches browser without forwarding unrelated cookies', async () => {
  const clear='foxmind_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0';
  await fixture(async ({origin}) => {
    const response=await fetch(`${origin}${root}/capabilities`,{headers}); assert.equal(response.status,401);
    const cookies=response.headers.getSetCookie(); assert.deepEqual(cookies,[clear]);
    assert.equal(response.headers.get('cache-control'),'no-store'); assert.equal(response.headers.get('x-content-type-options'),'nosniff');
  }, (_req,res)=>{res.writeHead(401,{'Content-Type':'application/json','Set-Cookie':[clear,'unrelated=secret; Path=/; HttpOnly']}); res.end(JSON.stringify({error:{code:'AUTH_REQUIRED'}}));});
});

test('proxy forwards exactly the resource and publication routes with security context',async()=>fixture(async({origin,calls})=>{
 const resourceId=randomUUID(),publicationId=randomUUID(),cases=[
  [`${root}/conversations/${conversationId}/turns/${turnId}/resource`,'POST'],[`${root}/resources/${resourceId}`,'GET'],[`${root}/resources/${resourceId}`,'PATCH'],
  [`${root}/resources/${resourceId}/publications`,'POST'],[`${root}/publications/${publicationId}`,'GET'],[`${root}/publications/${publicationId}/confirm`,'POST']];
 for(const [path,method] of cases){const response=await fetch(origin+path,{method,headers,...(method==='GET'?{}:{body:'{}'})});assert.equal(response.status,200,`${method} ${path}`);}
 assert.deepEqual(calls.map(c=>[c.url,c.method]),cases);for(const call of calls)for(const key of ['cookie','origin','x-csrf-token'])assert.equal(call.headers[key],headers[key]);
}));

test('proxy rejects wrong publication paths, methods and queries before upstream',async()=>fixture(async({origin,calls})=>{
 const r=randomUUID(),p=randomUUID();for(const [path,method] of [[`${root}/resources/${r}`,'DELETE'],
  [`${root}/publications/${p}/confirm`,'GET'],[`${root}/publications/${p}`,'PATCH'],[`${root}/publications/${p}?x=1`,'GET'],
  [`${root}/resources/${r}/publications?x=1`,'POST'],[`${root}/resources/not-uuid`,'GET'],[`${root}/publications/${p}/confirm/extra`,'POST'],
  [`${root}/conversations/${conversationId}/turns/${turnId}/resource/extra`,'POST']]){
  const response=await fetch(origin+path,{method,headers,...(['POST','PATCH'].includes(method)?{body:'{}'}:{})});assert.ok(response.status>=400&&response.status<500,`${method} ${path}`);
 }assert.equal(calls.length,0);
}));

test('proxy forwards private publication PDF path as bounded binary with safe headers',async()=>{
 const publicationId=randomUUID(),bytes=Buffer.from('%PDF-synthetic');
 await fixture(async({origin,calls})=>{for(const mode of ['preview','download']){const path=`${root}/publications/${publicationId}/file?mode=${mode}`,response=await fetch(origin+path,{headers});
  assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);assert.equal(response.headers.get('content-type'),'application/pdf');
  assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('location'),null);}
  const implicit=await fetch(`${origin}${root}/publications/${publicationId}/file`,{headers});assert.equal(implicit.status,200);assert.deepEqual(Buffer.from(await implicit.arrayBuffer()),bytes);
  assert.deepEqual(calls.map(c=>c.url),[...['preview','download'].map(m=>`${root}/publications/${publicationId}/file?mode=${m}`),`${root}/publications/${publicationId}/file`]);
 },(_req,res)=>{res.writeHead(200,{'content-type':'application/pdf','content-length':String(bytes.length),'content-disposition':'attachment','cross-origin-resource-policy':'same-origin','content-security-policy':"sandbox; default-src 'none'"});res.end(bytes);});
});

test('proxy rejects invalid publication PDF mode, children, method and oversized response',async()=>{
 const p=randomUUID();await fixture(async({origin,calls})=>{for(const [suffix,method] of [['?mode=invalid','GET'],['?mode=preview&mode=download','GET'],['?mode=preview&fileId=x','GET'],['/extra?mode=preview','GET'],['?mode=preview','POST']]){
  const response=await fetch(`${origin}${root}/publications/${p}/file${suffix}`,{method,headers,...(method==='POST'?{body:'{}'}:{})});assert.ok(response.status>=400&&response.status<500);}
  assert.equal(calls.length,0);
 });
 await fixture(async({origin})=>{const response=await fetch(`${origin}${root}/publications/${p}/file?mode=download`,{headers});assert.equal(response.status,503);},
 (_req,res)=>{res.writeHead(200,{'content-type':'application/pdf','content-length':String(50*1024*1024+1)});res.end();});
});


test('proxy forwards bounded resource publication listing and cursor unchanged',async()=>fixture(async({origin,calls})=>{
 const r=randomUUID(),cursor=randomUUID();for(const suffix of ['',`?limit=50&afterId=${cursor}`]){const path=`${root}/resources/${r}/publications${suffix}`,response=await fetch(origin+path,{headers});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});assert.equal(calls.at(-1).url,path);assert.equal(calls.at(-1).headers.cookie,headers.cookie);}
}));

test('proxy rejects invalid publication listing queries before upstream',async()=>fixture(async({origin,calls})=>{
 const r=randomUUID();for(const suffix of ['?limit=0','?limit=51','?limit=1&limit=2','?afterId=invalid','?other=1']){const response=await fetch(`${origin}${root}/resources/${r}/publications${suffix}`,{headers});assert.ok(response.status>=400&&response.status<500);}
 assert.equal(calls.length,0);
}));
