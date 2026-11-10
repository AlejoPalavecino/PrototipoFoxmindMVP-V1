import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
const base='/api/v1/foxy-ai',resourceId=randomUUID(),publicationId=randomUUID(),classroomId=randomUUID();
const prepare={requestId:randomUUID(),resourceRevision:'0',classroomId,title:'Guía',unitId:null,topicId:null};
const confirm={requestId:randomUUID(),publicationRevision:'0',classroomRevision:'0',confirm:true};
async function fixture(run){const {createFoxyHandler}=await import("../../presentation/http.ts");const calls=[];let first=true;
 const publications={list:async(_req,...args)=>{calls.push(['list',...args]);return {items:[{id:publicationId}],nextAfterId:publicationId};},prepare:async(_req,...args)=>{calls.push(['prepare',...args]);const created=first;first=false;return {created,publication:{id:publicationId}};},
  inspect:async(_req,...args)=>{calls.push(['inspect',...args]);return {publication:{id:publicationId},classroomRevision:'0',classroomArchived:false,errorCode:null};},
  confirm:async(_req,...args)=>{calls.push(['confirm',...args]);return {publicationId,materialId:randomUUID(),publicationRevision:'1',classroomRevision:'1'};}};
 const publicationFiles={readFile:async(_req,id,mode)=>{calls.push(['file',id,mode]);return {bytes:Buffer.from('%PDF-synthetic'),headers:{'Content-Type':'application/pdf','Content-Disposition':mode==='preview'?'inline':'attachment','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"sandbox; default-src 'none'"}};}};
 const management={inspect:async(_req,id)=>{calls.push(['management',id]);return {publicationId:id,publicationRevision:'0',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'};},retry:async(_req,id,body)=>{calls.push(['retry',id,body]);return {publicationId:id,publicationRevision:'1',action:'RETRY'};},discard:async(_req,id,body)=>{calls.push(['discard',id,body]);return {publicationId:id,publicationRevision:'1',action:'DISCARD'};}};
 const handler=createFoxyHandler({publications,publicationFiles,publicationManagement:management},{admit:async(req,write)=>{if(req.headers.cookie!=='session=teacher')throw Object.assign(Error(),{code:'AUTH_REQUIRED'});
  if(write&&req.headers.origin!=='http://web.test')throw Object.assign(Error(),{code:'ORIGIN_NOT_ALLOWED'});if(write&&req.headers['x-csrf-token']!=='bound')throw Object.assign(Error(),{code:'CSRF_INVALID'});}});
 const server=createServer((req,res)=>void handler(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const send=(path,method='GET',body,headers={})=>fetch(`http://127.0.0.1:${server.address().port}${base}${path}`,{method,headers:{cookie:'session=teacher',origin:'http://web.test','x-csrf-token':'bound','content-type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 try{await run({send,calls});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}

test('management GET and retry/discard POST use exact DTO and secure headers',async()=>fixture(async({send,calls})=>{
 const retry={requestId:randomUUID(),publicationRevision:'0'},discard={...retry,requestId:randomUUID(),confirm:true};
 for(const [path,method,body,expected] of [[`/publications/${publicationId}/management`,'GET',undefined,{publicationId,publicationRevision:'0',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'}],
 [`/publications/${publicationId}/retry`,'POST',retry,{publicationId,publicationRevision:'1',action:'RETRY'}],[`/publications/${publicationId}/discard`,'POST',discard,{publicationId,publicationRevision:'1',action:'DISCARD'}]]){
  const response=await send(path,method,body);assert.equal(response.status,200);assert.deepEqual(await response.json(),expected);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');}
 assert.deepEqual(calls,[['management',publicationId],['retry',publicationId,retry],['discard',publicationId,discard]]);
}));
test('management routes reject bad identity, csrf, query and body without mutation',async()=>fixture(async({send,calls})=>{
 const retry={requestId:randomUUID(),publicationRevision:'0'};
 for(const [path,method,body,headers] of [[`/publications/${publicationId}/management`,'GET',undefined,{cookie:''}],[`/publications/${publicationId}/management?x=1`,'GET'],
 [`/publications/${publicationId}/retry`,'POST',retry,{'x-csrf-token':'bad'}],[`/publications/${publicationId}/retry`,'POST',{...retry,extra:true}],
 [`/publications/${publicationId}/discard`,'POST',{...retry,confirm:false}],[`/publications/${publicationId}/retry?x=1`,'POST',retry]]){
  const response=await send(path,method,body,headers);assert.notEqual(response.status,404);assert.ok(response.status>=400&&response.status<500);}
 assert.deepEqual(calls,[]);
}));
