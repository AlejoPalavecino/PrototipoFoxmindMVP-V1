import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const owner=randomUUID(),id=randomUUID(),request={session:'synthetic'},tx={id:'tx'};
const view={publicationId:id,publicationRevision:'3',canRetry:false,retryReason:'INVALID_RESOURCE',canDiscard:true,cleanupState:'NOT_REQUESTED'};
function fixture(){const calls=[];const options={uow:{run:async(req,write,fn)=>{calls.push(['uow',req,write]);return fn(tx,{id:owner,accountRole:'teacher'});}},management:{
 inspect:async(...args)=>{calls.push(['inspect',...args]);return view;},retry:async(...args)=>{calls.push(['retry',...args]);return {publicationId:id,publicationRevision:'4',action:'RETRY'};},
 discard:async(...args)=>{calls.push(['discard',...args]);return {publicationId:id,publicationRevision:'4',action:'DISCARD'};}}};return {calls,options};}
async function make(f){const {createFoxyPublicationManagementService}=await import("../../application/publication-management-service.ts");return createFoxyPublicationManagementService(f.options);}
test('management uses read UoW for inspect, write for retry and discard with exact request and actor',async()=>{
 const f=fixture(),service=await make(f),retry={requestId:randomUUID(),publicationRevision:'3'},discard={...retry,requestId:randomUUID(),confirm:true};
 assert.deepEqual(await service.inspect(request,id),view);assert.equal((await service.retry(request,id,retry)).action,'RETRY');assert.equal((await service.discard(request,id,discard)).action,'DISCARD');
 assert.deepEqual(f.calls.filter(c=>c[0]==='uow').map(c=>c.slice(1)),[[request,false],[request,true],[request,true]]);
 assert.deepEqual(f.calls.find(c=>c[0]==='inspect').slice(1),[tx,owner,id]);assert.deepEqual(f.calls.find(c=>c[0]==='retry').slice(1),[tx,owner,id,retry]);assert.deepEqual(f.calls.find(c=>c[0]==='discard').slice(1),[tx,owner,id,discard]);
});
test('management validates commands and preserves permission denial without repository side effects',async()=>{
 const f=fixture(),service=await make(f);await assert.rejects(service.retry(request,id,{requestId:randomUUID(),publicationRevision:'3',extra:true}));
 await assert.rejects(service.discard(request,id,{requestId:randomUUID(),publicationRevision:'3',confirm:false}));
 f.options.uow.run=async()=>{throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});};await assert.rejects(service.inspect(request,id),e=>e?.code==='FORBIDDEN');
 assert.equal(f.calls.some(c=>['inspect','retry','discard'].includes(c[0])),false);
});


test('malformed command receipts fail closed and valid receipts expose exact projection',async()=>{
 for(const action of ['retry','discard']){
  const input={requestId:randomUUID(),publicationRevision:'3',...(action==='discard'?{confirm:true}:{})};
  for(const invalid of [{publicationId:randomUUID(),action:action.toUpperCase(),publicationRevision:'4'}, {publicationId:id,action:'WRONG',publicationRevision:'4'}, {publicationId:id,action:action.toUpperCase(),publicationRevision:'-1'}, {publicationId:id,action:action.toUpperCase(),publicationRevision:'9223372036854775808'}]){
   const f=fixture();f.options.management[action]=async()=>invalid;const service=await make(f);await assert.rejects(service[action](request,id,input),e=>e?.code==='SERVICE_UNAVAILABLE');
  }
  const f=fixture();f.options.management[action]=async()=>({publicationId:id,action:action.toUpperCase(),publicationRevision:'4',privateData:'synthetic'});
  const service=await make(f);assert.deepEqual(await service[action](request,id,input),{publicationId:id,action:action.toUpperCase(),publicationRevision:'4'});
 }
});
