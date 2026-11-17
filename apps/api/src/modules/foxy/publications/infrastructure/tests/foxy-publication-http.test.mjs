import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
const base='/api/v1/foxy-ai',resourceId=randomUUID(),publicationId=randomUUID(),classroomId=randomUUID();
const prepare={requestId:randomUUID(),resourceRevision:'0',classroomId,title:'Guía',unitId:null,topicId:null};
const confirm={requestId:randomUUID(),publicationRevision:'0',classroomRevision:'0',confirm:true};
async function fixture(run){const {createFoxyHandler}=await import("../../../presentation/http.ts");const calls=[];let first=true;
 const publications={list:async(_req,...args)=>{calls.push(['list',...args]);return {items:[{id:publicationId}],nextAfterId:publicationId};},prepare:async(_req,...args)=>{calls.push(['prepare',...args]);const created=first;first=false;return {created,publication:{id:publicationId}};},
  inspect:async(_req,...args)=>{calls.push(['inspect',...args]);return {publication:{id:publicationId},classroomRevision:'0',classroomArchived:false,errorCode:null};},
  confirm:async(_req,...args)=>{calls.push(['confirm',...args]);return {publicationId,materialId:randomUUID(),publicationRevision:'1',classroomRevision:'1'};}};
 const publicationFiles={readFile:async(_req,id,mode)=>{calls.push(['file',id,mode]);return {bytes:Buffer.from('%PDF-synthetic'),headers:{'Content-Type':'application/pdf','Content-Disposition':mode==='preview'?'inline':'attachment','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"sandbox; default-src 'none'"}};}};
 const handler=createFoxyHandler({publications,publicationFiles},{admit:async(req,write)=>{if(req.headers.cookie!=='session=teacher')throw Object.assign(Error(),{code:'AUTH_REQUIRED'});
  if(write&&req.headers.origin!=='http://web.test')throw Object.assign(Error(),{code:'ORIGIN_NOT_ALLOWED'});if(write&&req.headers['x-csrf-token']!=='bound')throw Object.assign(Error(),{code:'CSRF_INVALID'});}});
 const server=createServer((req,res)=>void handler(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const send=(path,method='GET',body,headers={})=>fetch(`http://127.0.0.1:${server.address().port}${base}${path}`,{method,headers:{cookie:'session=teacher',origin:'http://web.test','x-csrf-token':'bound','content-type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 try{await run({send,calls});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
test('publication preparation, inspect and confirm use declared status and secure headers',async()=>fixture(async({send,calls})=>{
 for(const [path,method,body,status] of [[`/resources/${resourceId}/publications`,'POST',prepare,202],[`/resources/${resourceId}/publications`,'POST',prepare,200],[`/publications/${publicationId}`,'GET',undefined,200],[`/publications/${publicationId}/confirm`,'POST',confirm,200]]){
  const response=await send(path,method,body);assert.equal(response.status,status);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');}
 assert.deepEqual(calls.map(c=>c[0]),['prepare','prepare','inspect','confirm']);assert.deepEqual(calls[0].slice(1),[resourceId,prepare]);assert.deepEqual(calls[3].slice(1),[publicationId,confirm]);
}));
test('publication routes enforce admission, CSRF, UUID, empty query and exact JSON',async()=>fixture(async({send,calls})=>{
 for(const [path,method,body,headers] of [[`/publications/${publicationId}`,'GET',undefined,{cookie:''}],[`/resources/${resourceId}/publications`,'POST',prepare,{origin:'http://evil.test'}],[`/publications/${publicationId}/confirm`,'POST',confirm,{'x-csrf-token':'bad'}],
 ['/publications/not-uuid','GET'],[`/publications/${publicationId}?x=1`,'GET'],[`/resources/${resourceId}/publications?x=1`,'POST',prepare],
 [`/publications/${publicationId}/confirm`,'POST',{...confirm,fileId:randomUUID()}],[`/resources/${resourceId}/publications`,'POST','{bad'],[`/publications/${publicationId}/confirm`,'POST',confirm,{'content-type':'text/plain'}]]){
  const response=await send(path,method,body,headers);if(!path.includes('not-uuid'))assert.notEqual(response.status,404,`${method} ${path} must be a recognized route`);assert.ok(response.status>=400&&response.status<500,`${method} ${path} => ${response.status}`);}
 assert.deepEqual(calls,[]);
}));


test('publication file route returns authorized PDF bytes and safe headers for each mode',async()=>fixture(async({send,calls})=>{
 for(const mode of ['preview','download']){const response=await send(`/publications/${publicationId}/file?mode=${mode}`);assert.equal(response.status,200);
  assert.equal(await response.text(),'%PDF-synthetic');assert.equal(response.headers.get('content-type'),'application/pdf');
  assert.equal(response.headers.get('content-disposition'),mode==='preview'?'inline':'attachment');assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');assert.match(response.headers.get('content-security-policy'),/sandbox/);assert.equal(response.headers.get('location'),null);}
 const implicit=await send(`/publications/${publicationId}/file`);assert.equal(implicit.status,200);assert.equal(implicit.headers.get('content-disposition'),'attachment');
 assert.deepEqual(calls,[['file',publicationId,'preview'],['file',publicationId,'download'],['file',publicationId,'download']]);
}));

test('publication file route rejects unauthenticated, invalid or duplicate mode before reading',async()=>fixture(async({send,calls})=>{
 for(const [suffix,headers] of [['?mode=preview',{cookie:''}],['?mode=bogus',{}],['?mode=preview&mode=download',{}],['?mode=preview&fileId=other',{}]]){
  const response=await send(`/publications/${publicationId}/file${suffix}`,'GET',undefined,headers);assert.ok(response.status>=400&&response.status<500);if(suffix!=='?mode=preview')assert.notEqual(response.status,404);}
 assert.deepEqual(calls,[]);
}));


test('resource publication list validates cursor and limits and returns page as JSON',async()=>fixture(async({send,calls})=>{
 const path=`/resources/${resourceId}/publications`;for(const [query,expected] of [['',{limit:20,afterId:null}],[`?limit=50&afterId=${publicationId}`,{limit:50,afterId:publicationId}]]){
  const response=await send(path+query);assert.equal(response.status,200);assert.deepEqual(await response.json(),{items:[{id:publicationId}],nextAfterId:publicationId});assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(calls.at(-1),['list',resourceId,expected]);}
}));

test('resource publication list rejects unauthorized and malformed query without invoking service',async()=>fixture(async({send,calls})=>{
 const path=`/resources/${resourceId}/publications`;for(const [suffix,headers] of [['',{cookie:''}],['?limit=0',{}],['?limit=51',{}],['?limit=1.5',{}],['?limit=1&limit=2',{}],['?afterId=bad',{}],['?other=1',{}]]){
  const response=await send(path+suffix,'GET',undefined,headers);assert.ok(response.status>=400&&response.status<500);if(suffix)assert.notEqual(response.status,404);}
 assert.equal(calls.length,0);
}));
