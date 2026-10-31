import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
const base='/api/v1/foxy-ai',resourceId=randomUUID(),publicationId=randomUUID(),classroomId=randomUUID();
const prepare={requestId:randomUUID(),resourceRevision:'0',classroomId,title:'Guía',unitId:null,topicId:null};
const confirm={requestId:randomUUID(),publicationRevision:'0',classroomRevision:'0',confirm:true};
async function fixture(run){const {createFoxyHandler}=await import('./http.ts');const calls=[];let first=true;
 const publications={prepare:async(_req,...args)=>{calls.push(['prepare',...args]);const created=first;first=false;return {created,publication:{id:publicationId}};},
  inspect:async(_req,...args)=>{calls.push(['inspect',...args]);return {publication:{id:publicationId},classroomRevision:'0',classroomArchived:false,errorCode:null};},
  confirm:async(_req,...args)=>{calls.push(['confirm',...args]);return {publicationId,materialId:randomUUID(),publicationRevision:'1',classroomRevision:'1'};}};
 const handler=createFoxyHandler({publications},{admit:async(req,write)=>{if(req.headers.cookie!=='session=teacher')throw Object.assign(Error(),{code:'AUTH_REQUIRED'});
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
