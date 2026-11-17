import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {connect} from 'node:net';
import {EventEmitter} from 'node:events';
import {randomUUID} from 'node:crypto';

const base='/api/v1/foxy-ai',assetId=randomUUID(),otherId=randomUUID(),key='synthetic-private-storage-key';
const error=code=>Object.assign(Error('synthetic private diagnostic'),{code});
async function fixture(run,{mime='image/png',revoked=false}={}){
 const {createFoxyHandler}=await import("../../../presentation/http.ts"),calls=[];
 const inspection={asset:{id:assetId,conversationId:randomUUID(),kind:'IMAGE',aspectRatio:'1:1',state:'READY',revision:'1'},payload:{title:'Sintético',description:'',mimeType:mime,sizeBytes:'4',width:2,height:2,producerVersion:'foxy-image-original-v1',diagram:null},canPreview:true,canDiscard:true,cleanupState:'NOT_REQUESTED'};
 const authorize=req=>{if(req.headers.cookie!=='session=owner')throw error('NOT_FOUND');};
 const privateAssetReadService={inspect:async(req,id)=>{calls.push(['inspect',id]);authorize(req);if(id!==assetId)throw error('NOT_FOUND');return inspection;}};
 const privateAssetReader={readFile:async(req,id,mode,signal)=>{calls.push(['read',id,mode]);authorize(req);if(id!==assetId)throw error('NOT_FOUND');if(revoked||signal.aborted)throw error('FORBIDDEN');
  return {bytes:Buffer.from([1,2,3,4]),headers:{'Content-Type':mime,'Content-Disposition':mode==='preview'?'inline; filename="image.png"':'attachment; filename="image.png"','Content-Length':'4','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"sandbox; default-src 'none'"}};}};
 const handler=createFoxyHandler({privateAssetReader,privateAssetReadService},{admit:async req=>{if(!req.headers.cookie)throw error('AUTH_REQUIRED');}});
 const server=createServer((req,res)=>void handler(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const send=(path,options={})=>fetch(`http://127.0.0.1:${server.address().port}${base}${path}`,{...options,headers:{cookie:'session=owner',...options.headers},signal:AbortSignal.timeout(5000)});
 try{await run({send,calls,inspection});}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
test('owner inspection contains public fields only and raster previews/downloads use safe headers',async()=>{
 for(const mime of ['image/png','image/jpeg'])await fixture(async({send,calls,inspection})=>{
  let response=await send(`/assets/${assetId}`);assert.equal(response.status,200);const view=await response.json();assert.deepEqual(view,inspection);
  for(const forbidden of ['storageKey','digest','leaseNonce','ownerId',key])assert.equal(JSON.stringify(view).includes(forbidden),false);
  for(const [query,disposition] of [['?mode=preview','inline'],['?mode=download','attachment'],['','attachment']]){
   response=await send(`/assets/${assetId}/file${query}`);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),mime);assert.equal(response.headers.get('content-length'),'4');
   assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('cross-origin-resource-policy'),'same-origin');
   assert.match(response.headers.get('content-security-policy'),/sandbox.*default-src\s+'none'/iu);assert.match(response.headers.get('content-disposition'),new RegExp(`^${disposition}`,'iu'));assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[1,2,3,4]);
  }
  assert.deepEqual(calls.map(x=>x[0]),['inspect','read','read','read']);
 },{mime});
});
test('student, unrelated teacher, missing session and unknown asset never obtain private content',async()=>fixture(async({send,calls})=>{
 for(const cookie of ['', 'session=student','session=other'])for(const suffix of ['', '/file?mode=preview']){
  const response=await send(`/assets/${assetId}${suffix}`,{headers:{cookie}});assert.equal(response.status,cookie?404:401);assert.doesNotMatch(await response.text(),/synthetic private diagnostic|synthetic-private-storage-key/);
 }
 const response=await send(`/assets/${otherId}/file?mode=preview`);assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/synthetic private diagnostic|synthetic-private-storage-key/);assert.equal(calls.length,5);
}));
test('revocation during read produces generic error without image bytes',async()=>fixture(async({send,calls})=>{
 const response=await send(`/assets/${assetId}/file?mode=preview`);assert.equal(response.status,403);assert.notEqual(response.headers.get('content-type'),'image/png');assert.doesNotMatch(await response.text(),/synthetic private diagnostic|synthetic-private-storage-key/);assert.equal(calls.length,1);
},{revoked:true}));
test('malformed IDs, modes and duplicate or unknown query values are rejected before reader',async()=>fixture(async({send,calls})=>{
 for(const path of ['/assets/not-uuid',`/assets/${assetId}?extra=1`,`/assets/${assetId}/file?mode=preview&mode=download`,`/assets/${assetId}/file?mode=embed`,`/assets/${assetId}/file?foo=1`]){
  const response=await send(path);assert.equal(response.status,400,`${path} returned ${response.status}`);
 }
 assert.deepEqual(calls,[]);
}));
test('unexpected reader MIME cannot be served inline or interpreted as HTML',async()=>fixture(async({send})=>{
 const response=await send(`/assets/${assetId}/file?mode=preview`);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/octet-stream');assert.match(response.headers.get('content-disposition'),/^attachment/iu);
},{mime:'text/html'}));

async function waitUntil(predicate,timeout=5000){const deadline=Date.now()+timeout;while(!predicate()){if(Date.now()>deadline)throw Error('synthetic condition timeout');await new Promise(r=>setTimeout(r,20));}}
test('disconnect during admission never dispatches visual service after admission settles',async()=>{
 const {createFoxyHandler}=await import("../../../presentation/http.ts");let release,admitted,inspections=0;
 const gate=new Promise(r=>release=r),entered=new Promise(r=>admitted=r),handler=createFoxyHandler({privateAssetReadService:{inspect:async()=>{inspections++;return {ok:true}}}},{admit:async()=>{admitted();await gate;}});
 const request=Object.assign(new EventEmitter(),{url:`${base}/assets/${assetId}`,method:'GET',headers:{}});
 class Response extends EventEmitter{constructor(){super();this.writableFinished=false;this.writableEnded=false;this.destroyed=false;}setHeader(){}end(){this.writableEnded=true;}destroy(){this.destroyed=true;this.emit('close');}}
 const response=new Response();handler(request,response,()=>{});await entered;response.destroy();release();await new Promise(r=>setImmediate(r));
 assert.equal(inspections,0,'disconnected request must not start service work');
});
test('unfinished raster responses retain capacity until finish or close, then release it', {timeout:15000},async()=>{
 const {createFoxyHandler}=await import("../../../presentation/http.ts"),bytes=Buffer.alloc(8*1024*1024,7);let invoked=0;
 const reader={readFile:async()=>{invoked++;return {bytes,headers:{'Content-Type':'image/png','Content-Disposition':'inline'}}}},handler=createFoxyHandler({privateAssetReader:reader},{admit:async()=>{}});
 class Response extends EventEmitter{constructor(){super();this.headers={};this.writableFinished=false;this.writableEnded=false;this.destroyed=false;}setHeader(name,value){this.headers[name]=value}end(body){this.body=body;this.writableEnded=true;}finish(){this.writableFinished=true;this.emit('finish');}close(){this.destroyed=true;this.emit('close');}}
 const request=()=>Object.assign(new EventEmitter(),{url:`${base}/assets/${assetId}/file?mode=preview`,method:'GET',headers:{}}),responses=[];
 try{
  for(let i=0;i<16;i++){const response=new Response();responses.push(response);handler(request(),response,()=>{});}
  await waitUntil(()=>invoked===16&&responses.every(r=>r.writableEnded));
  const overflow=new Response();handler(request(),overflow,()=>{});assert.equal(overflow.statusCode,503);assert.equal(invoked,16);
  responses.forEach((response,index)=>index%2?response.close():response.finish());
  await new Promise(r=>setImmediate(r));const next=new Response();responses.push(next);handler(request(),next,()=>{});await waitUntil(()=>next.writableEnded);assert.equal(next.statusCode,200);assert.equal(invoked,17);
 }finally{for(const response of responses)if(!response.writableFinished&&!response.destroyed)response.close();}
});
test('client cancellation propagates to pending visual reads and releases capacity', {timeout:15000},async()=>{
 const {createFoxyHandler}=await import("../../../presentation/http.ts");let entered=0,cancelled=0;
 const reader={readFile:async(_req,_id,_mode,signal)=>{entered++;await new Promise(resolve=>{if(signal.aborted)resolve();else signal.addEventListener('abort',resolve,{once:true});});cancelled++;throw error('FORBIDDEN');}};
 const handler=createFoxyHandler({privateAssetReader:reader,privateAssetReadService:{inspect:async()=>({ok:true})}},{admit:async()=>{}}),server=createServer((req,res)=>handler(req,res,()=>res.end()));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port,sockets=[];
 try{
  for(let i=0;i<16;i++){const socket=connect(port,'127.0.0.1');socket.on('error',()=>{});sockets.push(socket);await new Promise(r=>socket.once('connect',r));socket.write(`GET ${base}/assets/${assetId}/file HTTP/1.1\r\nHost: localhost\r\n\r\n`);}
  await waitUntil(()=>entered===16);const full=await fetch(`http://127.0.0.1:${port}${base}/assets/${assetId}`,{signal:AbortSignal.timeout(3000)});assert.equal(full.status,503);
  for(const socket of sockets)socket.destroy();await waitUntil(()=>cancelled===16);
  let response;const end=Date.now()+5000;do{response=await fetch(`http://127.0.0.1:${port}${base}/assets/${assetId}`,{signal:AbortSignal.timeout(3000)});if(response.status===503){await response.arrayBuffer();await new Promise(r=>setTimeout(r,30));}}while(response.status===503&&Date.now()<end);
  assert.equal(response.status,200);
 }finally{for(const socket of sockets)socket.destroy();server.closeAllConnections();await new Promise(r=>server.close(r));}
});
