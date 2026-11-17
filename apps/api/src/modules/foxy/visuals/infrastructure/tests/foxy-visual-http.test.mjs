import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';

const base='/api/v1/foxy-ai',conversationId=randomUUID(),jobId=randomUUID(),assetId=randomUUID();
const input={requestId:randomUUID(),revision:'0',kind:'IMAGE',prompt:'Ilustrá el agua',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1'};
const job={id:jobId,conversationId,kind:'IMAGE',aspectRatio:'1:1',state:'QUEUED',assetId,errorCode:null,createdAt:'2026-11-01T00:00:00.000Z'};
const fail=code=>Object.assign(Error('synthetic private detail'),{code});
async function fixture(run,{available=true}={}){
 const {createFoxyHandler}=await import("../../../presentation/http.ts"),calls=[];let created=true;
 const visuals={start:async(req,id,body)=>{calls.push(['start',id,body]);if(req.headers.cookie!=='owner')throw fail('NOT_FOUND');const value={created,job,conversationRevision:'1'};created=false;return value;},
  get:async(req,cid,jid)=>{calls.push(['get',cid,jid]);if(req.headers.cookie!=='owner')throw fail('NOT_FOUND');return job;},
  list:async(req,cid,page)=>{calls.push(['list',cid,page]);if(req.headers.cookie!=='owner')throw fail('NOT_FOUND');return {items:[job],nextAfterId:null};}};
 const capabilities=async()=>({textGeneration:{enabled:false},imageGeneration:{enabled:true},diagramGeneration:{enabled:false}});
 const handler=createFoxyHandler({...(available?{visuals}:{}),capabilities},{admit:async(req,write)=>{if(!req.headers.cookie)throw fail('AUTH_REQUIRED');if(write&&req.headers.origin!=='http://web.test')throw fail('ORIGIN_NOT_ALLOWED');if(write&&req.headers['x-csrf-token']!=='bound')throw fail('CSRF_INVALID');}});
 const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end()}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const send=(path,{method='GET',body,headers={}}={})=>fetch(`http://127.0.0.1:${server.address().port}${base}${path}`,{method,headers:{cookie:'owner',origin:'http://web.test','x-csrf-token':'bound','content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
 try{await run({send,calls})}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
test('start returns 202 then exact replay 200; polling, list and independent capability gates remain visible',async()=>fixture(async({send,calls})=>{
 const path=`/conversations/${conversationId}/visuals`;
 for(const status of [202,200]){const r=await send(path,{method:'POST',body:input});assert.equal(r.status,status);assert.deepEqual(await r.json(),{created:status===202,job,conversationRevision:'1'});assert.equal(r.headers.get('cache-control'),'no-store');}
 let r=await send(`${path}/${jobId}`);assert.equal(r.status,200);assert.deepEqual(await r.json(),job);
 r=await send(`${path}?limit=3&afterId=${jobId}`);assert.equal(r.status,200);assert.deepEqual(await r.json(),{items:[job],nextAfterId:null});
 r=await send('/capabilities');assert.equal(r.status,200);assert.deepEqual(await r.json(),{textGeneration:{enabled:false},imageGeneration:{enabled:true},diagramGeneration:{enabled:false}});
 assert.deepEqual(calls,[['start',conversationId,input],['start',conversationId,input],['get',conversationId,jobId],['list',conversationId,{limit:3,afterId:jobId}]]);
}));
test('invalid requests, authentication and write guards cannot invoke visual service',async()=>fixture(async({send,calls})=>{
 const path=`/conversations/${conversationId}/visuals`;
 for(const [p,method,body,headers,status] of [[path,'POST',input,{cookie:''},401],[path,'POST',input,{origin:'http://other.test'},403],[path,'POST',input,{'x-csrf-token':'bad'},403],
  [path,'POST',{...input,extra:true},{},400],[path,'POST',{...input,aspectRatio:'9:16'},{},400],[`${path}?extra=1`,'POST',input,{},400],
  [`${path}?limit=2&limit=3`,'GET',undefined,{},400],[`${path}?afterId=no`,'GET',undefined,{},400],[`${path}/${jobId}?x=1`,'GET',undefined,{},400]]){
  const r=await send(p,{method,body,headers});assert.equal(r.status,status,p);
 }
 assert.deepEqual(calls,[]);
}));
test('other roles and missing visual service receive generic errors with no private details',async()=>{
 await fixture(async({send,calls})=>{const path=`/conversations/${conversationId}/visuals`;
  for(const suffix of ['',`/${jobId}`]){const r=await send(path+suffix,{headers:{cookie:'student'}});assert.equal(r.status,404);assert.doesNotMatch(await r.text(),/synthetic private detail/);}
  assert.equal(calls.length,2);
 });
 await fixture(async({send})=>{const r=await send(`/conversations/${conversationId}/visuals`);assert.equal(r.status,404);},{available:false});
});
