import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {withAiDatabase,transactionDatabase} from "../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),limit=10485760n;
async function modules(){return Promise.all([import("../private-asset-read-repository.ts"),import("../private-asset-reader.ts"),import("../../application/private-asset-read-service.ts"),import("../unit-of-work.ts"),import("../conversation-repository.ts"),import("../private-asset-repository.ts"),import("../private-asset-claims.ts"),import("../private-asset-authority.ts")]);}
async function setup(pool,api,{classroom=false,onGet,bytesOverride,state='READY'}={}){
 const [{createFoxyPrivateAssetReadRepository},{createFoxyPrivateAssetReader},{createFoxyPrivateAssetReadService},{createFoxyUnitOfWork},{createFoxyConversationRepository},{createFoxyPrivateAssetRepository},{createFoxyPrivateAssetClaims},{createFoxyPrivateAssetAuthority}]=api;
 const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),active={count:0},database=transactionDatabase(pool,active);
 const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,request)=>{if(request.revoked)throw Object.assign(Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'});return request.id;}}),owner={id:f.teacherActor};
 const context=classroom?{kind:'CLASSROOM',classroomId:f.rooms.teach.id}:{kind:'GENERAL'};
 const conversation=(await uow.run(owner,true,(tx,a)=>createFoxyConversationRepository().create(tx,a.id,{requestId:randomUUID(),title:'Sintético',context},'a'.repeat(64)))).conversation;
 const asset=(await uow.run(owner,true,(tx,a)=>createFoxyPrivateAssetRepository().reserve(tx,a.id,conversation.id,{requestId:randomUUID(),conversationRevision:'0',kind:'IMAGE',aspectRatio:'1:1'},limit))).asset;
 const bytes=await sharp({create:{width:10,height:10,channels:3,background:'#347960'}}).png().toBuffer(),digest=sha(bytes),payload={digest,sizeBytes:bytes.length,mimeType:'image/png',width:10,height:10,producerVersion:'foxy-image-original-v1',title:'Sintético',description:'',diagram:null};
 if(state!=='RESERVED'){
  const lease=await createFoxyPrivateAssetClaims({database}).claim({assetId:asset.id,ownerId:f.teacherActor}),authority=createFoxyPrivateAssetAuthority({database}),signal=new AbortController().signal,scope=await authority.open(lease,signal);
  if(state==='REJECTED')await authority.reject(scope.capability,'INVALID_CONTENT',signal);
  if(state==='READY'){await authority.bind(scope.capability,payload,signal);assert.equal(await authority.complete(scope.capability,{digest,sizeBytes:bytes.length,mimeType:'image/png',width:10,height:10,validatedDigest:digest,scannedDigest:digest},signal),true);}authority.close(scope);
 }
 const calls=[],storage={get:async(key,max)=>{assert.equal(active.count,0,'storage I/O must not hold a DB transaction');calls.push({key,max});await onGet?.({query,f,asset,owner,conversation});return bytesOverride??bytes;}};
 const assets=createFoxyPrivateAssetReadRepository(),reader=createFoxyPrivateAssetReader({uow,assets,storage}),service=createFoxyPrivateAssetReadService({uow,assets});
 return {query,f,owner,asset,conversation,bytes,calls,reader,service,storage};
}
test('owner can inspect and read GENERAL and archived classroom assets with safe headers and copied bytes', {timeout:120000},async()=>{
 const api=await modules();for(const classroom of [false,true])await withAiDatabase(async({pool})=>{const x=await setup(pool,api,{classroom});
  if(classroom)await x.query('UPDATE classrooms SET archived_at=now() WHERE id=$1',x.f.rooms.teach.id);
  const view=await x.service.inspect(x.owner,x.asset.id);assert.equal(view.canPreview,true);assert.equal(view.cleanupState,'NOT_REQUESTED');
  const publicJson=JSON.stringify(view);for(const secret of ['storageKey','digest','leaseNonce','ownerId','sourceClassroomId'])assert.equal(publicJson.includes(secret),false);
  for(const mode of ['preview','download']){const out=await x.reader.readFile(x.owner,x.asset.id,mode,new AbortController().signal);
   assert.deepEqual(Buffer.from(out.bytes),x.bytes);assert.equal(out.headers['Content-Type'],'image/png');assert.equal(out.headers['Content-Length'],String(x.bytes.length));assert.equal(out.headers['Cache-Control'],'no-store');assert.equal(out.headers['X-Content-Type-Options'],'nosniff');assert.equal(out.headers['Cross-Origin-Resource-Policy'],'same-origin');assert.match(out.headers['Content-Security-Policy'],/sandbox.*default-src\s+'none'/iu);assert.match(out.headers['Content-Disposition'],mode==='preview'?/^inline/iu:/^attachment/iu);
   out.bytes[0]^=255;assert.equal(x.bytes[0],137);
  }
  assert.equal(x.calls.length,2);assert.ok(x.calls.every(call=>call.key===`foxy-assets/${x.f.teacherActor}/${x.asset.id}`&&call.max===x.bytes.length));
 });
});
test('reserved, processing, rejected and discarded assets never serve private bytes', {timeout:120000},async()=>{
 const api=await modules();for(const state of ['RESERVED','PROCESSING','REJECTED','DISCARDED'])await withAiDatabase(async({pool})=>{
  const x=await setup(pool,api,{state:state==='DISCARDED'?'READY':state});if(state==='DISCARDED')await x.query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=now(),revision=revision+1 WHERE id=$1",x.asset.id);
  const inspection=await x.service.inspect(x.owner,x.asset.id);assert.equal(inspection.canPreview,false);if(state==='DISCARDED')assert.equal(inspection.cleanupState,'PENDING');
  await assert.rejects(x.reader.readFile(x.owner,x.asset.id,'preview',new AbortController().signal));assert.equal(x.calls.length,0);
 });
});
test('unauthorized user, invalid mode and already aborted request do not read storage', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api),aborted=new AbortController();aborted.abort();
  for(const request of [{id:x.f.other},{id:x.f.pupil},{id:x.f.teacherActor,revoked:true}])await assert.rejects(x.reader.readFile(request,x.asset.id,'preview',new AbortController().signal));
  await assert.rejects(x.reader.readFile(x.owner,x.asset.id,'invalid',new AbortController().signal));await assert.rejects(x.reader.readFile(x.owner,x.asset.id,'preview',aborted.signal));assert.equal(x.calls.length,0);
 });
});
test('revocation, deletion or discard during storage GET prevents any bytes from returning', {timeout:120000},async()=>{
 const api=await modules();for(const mode of ['account','conversation','discard','session'])await withAiDatabase(async({pool})=>{
  const onGet=async({query,f,asset,owner,conversation})=>{if(mode==='account')await query('UPDATE users SET email_verified_at=NULL WHERE id=$1',f.teacherActor);
   if(mode==='conversation')await query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1',conversation.id);
   if(mode==='discard')await query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=now(),revision=revision+1 WHERE id=$1",asset.id);
   if(mode==='session')owner.revoked=true;};
  const x=await setup(pool,api,{onGet});await assert.rejects(x.reader.readFile(x.owner,x.asset.id,'preview',new AbortController().signal));assert.equal(x.calls.length,1);
 });
});
test('corrupt or resized stored bytes never return content; unrelated conversation rename remains readable', {timeout:120000},async()=>{
 const api=await modules();for(const mode of ['digest','size','rename'])await withAiDatabase(async({pool})=>{
  const x=await setup(pool,api,{onGet:mode==='rename'?async({query,conversation})=>query("UPDATE foxy_conversations SET title='Otro',revision=revision+1 WHERE id=$1",conversation.id):undefined});
  if(mode==='digest')x.storage.get=async()=>Buffer.alloc(x.bytes.length,42);if(mode==='size')x.storage.get=async()=>Buffer.from([1]);
  const operation=x.reader.readFile(x.owner,x.asset.id,'download',new AbortController().signal);if(mode==='rename')assert.deepEqual(Buffer.from((await operation).bytes),x.bytes);else await assert.rejects(operation);
 });
});
test('source ownership change or cancellation during GET prevents returning bytes', {timeout:120000},async()=>{
 const api=await modules();for(const mode of ['source','abort'])await withAiDatabase(async({pool})=>{
  const controller=new AbortController(),onGet=async({query,f})=>{if(mode==='source')await query('UPDATE classrooms SET teacher_id=$2 WHERE id=$1',f.rooms.teach.id,f.other);else controller.abort();};
  const x=await setup(pool,api,{classroom:true,onGet});await assert.rejects(x.reader.readFile(x.owner,x.asset.id,'preview',controller.signal));assert.equal(x.calls.length,1);
 });
});
test('storage errors revalidate current authorization and do not expose diagnostics or keys', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{
  const x=await setup(pool,api,{onGet:async({owner})=>{owner.revoked=true;throw Error('synthetic-private-storage-detail');}});
  await assert.rejects(x.reader.readFile(x.owner,x.asset.id,'preview',new AbortController().signal),error=>{
   assert.ok(['AUTH_REQUIRED','FORBIDDEN'].includes(error?.code));assert.doesNotMatch(String(error),/synthetic-private-storage-detail|foxy-assets/);return true;
  });assert.equal(x.calls.length,1);
 });
});
