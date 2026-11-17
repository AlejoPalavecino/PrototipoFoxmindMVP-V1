import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {withAiDatabase,transactionDatabase} from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const limit=10485760n,code=name=>e=>e?.code===name;
async function modules(){return Promise.all([import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../../../conversations/infrastructure/unit-of-work.ts"),import("../../../conversations/infrastructure/conversation-repository.ts"),import("../private-asset-repository.ts"),import("../private-asset-claims.ts"),import("../../../../../bootstrap/foxy-service-factories.ts")]);}
async function setup(pool,api,{classroom=false,state='RESERVED'}={}){
 const [{createFoxyPrivateAssetDiscardRepository},{createFoxyPrivateAssetDiscardService},{createFoxyUnitOfWork},{createFoxyConversationRepository},{createFoxyPrivateAssetRepository},{createFoxyPrivateAssetClaims},{createFoxyPrivateAssetAuthority}]=api;
 const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),owner={id:f.teacherActor};
 const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,request,write)=>{assert.equal(write,true);if(request.revoked)throw Object.assign(Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'});return request.id;}});
 const ctx=classroom?{kind:'CLASSROOM',classroomId:f.rooms.teach.id}:{kind:'GENERAL'};
 const conversation=(await uow.run(owner,true,(tx,a)=>createFoxyConversationRepository().create(tx,a.id,{requestId:randomUUID(),title:'Sintético',context:ctx},'a'.repeat(64)))).conversation;
 const asset=(await uow.run(owner,true,(tx,a)=>createFoxyPrivateAssetRepository().reserve(tx,a.id,conversation.id,{requestId:randomUUID(),conversationRevision:'0',kind:'IMAGE',aspectRatio:'1:1'},limit))).asset;
 let lease,authority,scope;const signal=new AbortController().signal;
 if(state!=='RESERVED'){
  lease=await createFoxyPrivateAssetClaims({database}).claim({assetId:asset.id,ownerId:f.teacherActor});authority=createFoxyPrivateAssetAuthority({database});scope=await authority.open(lease,signal);
  if(state==='REJECTED')await authority.reject(scope.capability,'INVALID_CONTENT',signal);
  if(state==='READY'){const bytes=Buffer.from('synthetic image'),digest=createHash('sha256').update(bytes).digest('hex'),data={digest,sizeBytes:bytes.length,mimeType:'image/png',width:10,height:10,producerVersion:'foxy-image-original-v1',title:'Sintético',description:'',diagram:null};
   await authority.bind(scope.capability,data,signal);await authority.complete(scope.capability,{digest,sizeBytes:bytes.length,mimeType:'image/png',width:10,height:10,validatedDigest:digest,scannedDigest:digest},signal);}
 }
 const assets=createFoxyPrivateAssetDiscardRepository(),service=createFoxyPrivateAssetDiscardService({uow,assets});
 return {query,f,owner,conversation,asset,service,lease,authority,scope,signal};
}
async function row(x){return (await x.query('SELECT * FROM foxy_visual_assets WHERE id=$1',x.asset.id))[0];}
async function input(x,changes={}){return {requestId:randomUUID(),assetRevision:String((await row(x)).revision),confirm:true,...changes};}

test('durable same-request discard replay preserves charge and immutable private asset', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api,{state:'READY'}),before=await row(x),command=await input(x);
  const receipt=await x.service.discard(x.owner,x.asset.id,command);assert.deepEqual(Object.keys(receipt).sort(),['action','assetId','assetRevision']);assert.equal(receipt.action,'DISCARD');assert.equal(receipt.assetId,x.asset.id);
  const after=await row(x);assert.equal(after.state,'DISCARDED');assert.equal(BigInt(after.charge_bytes),BigInt(before.charge_bytes));assert.equal(after.storage_key,before.storage_key);assert.equal(after.digest,before.digest);assert.equal(after.blob_deleted_at,null);assert.equal(after.quota_released_at,null);
  assert.deepEqual(await x.service.discard(x.owner,x.asset.id,command),receipt);await assert.rejects(x.service.discard(x.owner,x.asset.id,{...command,assetRevision:'0'}),code('CONFLICT'));
  await assert.rejects(x.service.discard(x.owner,x.asset.id,{...command,requestId:randomUUID(),assetRevision:receipt.assetRevision}),code('CONFLICT'));
  const [commands]=await x.query('SELECT count(*)::int n FROM foxy_private_asset_commands WHERE owner_id=$1',x.f.teacherActor);assert.equal(commands.n,1);
  await assert.rejects(pool.query('DELETE FROM foxy_private_asset_commands WHERE owner_id=$1',[x.f.teacherActor]));
 });
});
test('concurrent duplicate request produces one mutation and identical receipt', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api),command=await input(x),receipts=await Promise.all([x.service.discard(x.owner,x.asset.id,command),x.service.discard(x.owner,x.asset.id,command)]);
  assert.deepEqual(receipts[0],receipts[1]);const r=await row(x);assert.equal(r.state,'DISCARDED');assert.equal(String(r.revision),'1');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(r.blob_deleted_at,null);assert.equal(r.quota_released_at,null);
 });
});
test('owner permission, verified session, revision and explicit confirmation apply before discard and replay', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api),command=await input(x);
  await assert.rejects(x.service.discard({id:x.f.other},x.asset.id,command),code('NOT_FOUND'));await assert.rejects(x.service.discard({id:x.f.pupil},x.asset.id,command));
  for(const body of [{...command,confirm:false},{...command,extra:true},{...command,assetRevision:'01'}])await assert.rejects(x.service.discard(x.owner,x.asset.id,body));
  await assert.rejects(x.service.discard(x.owner,x.asset.id,{...command,assetRevision:'1'}),code('CONFLICT'));assert.equal((await row(x)).state,'RESERVED');
  const receipt=await x.service.discard(x.owner,x.asset.id,command);x.owner.revoked=true;await assert.rejects(x.service.discard(x.owner,x.asset.id,command));assert.equal(receipt.action,'DISCARD');
 });
});
test('archived classroom and every nonterminal state can discard without physical deletion; live lease is preserved', {timeout:120000},async()=>{
 const api=await modules();for(const state of ['RESERVED','PROCESSING','REJECTED','READY'])await withAiDatabase(async({pool})=>{
  const x=await setup(pool,api,{state,classroom:true});await x.query('UPDATE classrooms SET archived_at=now() WHERE id=$1',x.f.rooms.teach.id);const before=await row(x),receipt=await x.service.discard(x.owner,x.asset.id,await input(x)),after=await row(x);
  assert.equal(receipt.action,'DISCARD');assert.equal(after.state,'DISCARDED');assert.equal(BigInt(after.charge_bytes),BigInt(before.charge_bytes));assert.equal(after.blob_deleted_at,null);assert.equal(after.quota_released_at,null);
  if(state==='PROCESSING'){assert.equal(after.lease_nonce,before.lease_nonce);assert.equal(after.lease_until.getTime(),before.lease_until.getTime());await assert.rejects(x.authority.authorize(x.scope.capability,x.signal));}
 });
});
test('source classroom ownership is immutable in the actual schema', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api,{classroom:true}),command=await input(x),receipt=await x.service.discard(x.owner,x.asset.id,command);
  await assert.rejects(pool.query('UPDATE classrooms SET teacher_id=$2 WHERE id=$1',[x.f.rooms.teach.id,x.f.other]));assert.deepEqual(await x.service.discard(x.owner,x.asset.id,command),receipt);
 });
});
test('current verification and conversation visibility are rechecked even for a durable replay', {timeout:120000},async()=>{
 const api=await modules();for(const cause of ['unverified','conversation'])await withAiDatabase(async({pool})=>{
  const x=await setup(pool,api,{classroom:true}),command=await input(x),receipt=await x.service.discard(x.owner,x.asset.id,command);
  if(cause==='unverified')await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',x.f.teacherActor);
  if(cause==='conversation')await x.query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1',x.conversation.id);
  await assert.rejects(x.service.discard(x.owner,x.asset.id,command));const r=await row(x);assert.equal(r.state,'DISCARDED');assert.equal(String(r.revision),receipt.assetRevision);assert.equal(BigInt(r.charge_bytes),limit);assert.equal(r.blob_deleted_at,null);
 });
});
