import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import sharp from 'sharp';
import {withAiDatabase} from '../../../../../../../tests/classroom-ai-database.test.mjs';
import {homeFixture} from '../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const limit=10485760n,hash='a'.repeat(64),sha=b=>createHash('sha256').update(b).digest('hex');
async function setup({pool,database},options={}){
 const [{createFoxyConversationRepository},{createFoxyPrivateAssetRepository},{createFoxyPrivateAssetClaims},{createFoxyPrivateAssetAuthority},{createFoxyPrivateAssetFiles},{createFoxyPrivateImageInspector},{FileService},{FileError}]=await Promise.all([
  import('../../../foxy/infrastructure/conversation-repository.ts'),import('../../../foxy/infrastructure/private-asset-repository.ts'),import('../../../foxy/infrastructure/private-asset-claims.ts'),import('../../../foxy/infrastructure/private-asset-authority.ts'),import('../foxy-private-asset-files.ts'),import('../foxy-private-image-inspector.ts'),import('../service.ts'),import('../../domain/errors.ts')]);
 const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),transact=fn=>database.$transaction(raw=>fn({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}));
 const conversation=(await transact(tx=>createFoxyConversationRepository().create(tx,f.teacherActor,{requestId:randomUUID(),title:'Custodia sintética',context:{kind:'GENERAL'}},hash))).conversation;
 const repo=createFoxyPrivateAssetRepository(),request={requestId:randomUUID(),conversationRevision:'0',kind:'IMAGE',aspectRatio:'1:1'};
 const {asset}=await transact(tx=>repo.reserve(tx,f.teacherActor,conversation.id,request,limit));
 const claims=createFoxyPrivateAssetClaims({database}),lease=await claims.claim({assetId:asset.id,ownerId:f.teacherActor});assert.ok(lease);
 const controller=new AbortController(),authority=createFoxyPrivateAssetAuthority({database}),scope=await authority.open(lease,controller.signal),blobs=new Map(),calls=[];
 const active=new Set(),owned=fn=>{const work=Promise.resolve().then(fn);active.add(work);void work.then(()=>active.delete(work),()=>active.delete(work));return work;};
 const storage={put:(key,bytes)=>owned(async()=>{calls.push('put');if(blobs.has(key))throw new FileError('UPLOAD_CONFLICT');blobs.set(key,Buffer.from(bytes));await options.onPut?.({query,f,asset,controller,blobs});if(options.uncertainPut)throw new FileError('SERVICE_UNAVAILABLE');}),
  get:key=>owned(async()=>{calls.push('get');await options.onGet?.({query,f,asset,controller,blobs});const value=blobs.get(key);if(!value)throw new FileError('NOT_FOUND');return Buffer.from(value);}),remove:key=>owned(async()=>{calls.push('remove');blobs.delete(key)}),drain:async()=>{await Promise.allSettled([...active]);}};
 const scanner={scan:async bytes=>{calls.push('scan');await options.onScan?.({query,f,asset,controller,blobs,bytes});if(options.scanError)throw new FileError(options.scanError);}};
 const files=new FileService({database,access:{authenticate:async()=>{throw Error('unreachable');},authorize:async()=>{throw Error('unreachable');}},storage,scanner,draftQuotaBytes:0n});
 const realInspector=createFoxyPrivateImageInspector(),inspector=options.onInspect?{inspect:async(bytes,signal)=>{options.onInspect();return realInspector.inspect(bytes,signal)}}:realInspector;
 const bridge=createFoxyPrivateAssetFiles({files,authority,inspector,renew:options.renew??(current=>claims.renew(current)),...(options.timing?{timing:options.timing}:{})});
 const bytes=await sharp({create:{width:32,height:24,channels:3,background:'#2f7255'}}).png().toBuffer();
 const payload={bytes,title:'Imagen sintética',description:'Ejemplo',producerVersion:'foxy-image-original-v1',diagram:null};
 return {query,f,repo,claims,lease,authority,scope,controller,bridge,asset,payload,bytes,blobs,calls,transact};
}
async function row(x){return (await x.query('SELECT * FROM foxy_visual_assets WHERE id=$1::uuid',x.asset.id))[0];}
function facts(x){const digest=sha(x.bytes);return {digest,sizeBytes:x.bytes.length,mimeType:'image/png',width:32,height:24,validatedDigest:digest,scannedDigest:digest};}
function metadata(x){const p=facts(x);return {digest:p.digest,sizeBytes:p.sizeBytes,mimeType:p.mimeType,width:p.width,height:p.height,producerVersion:'foxy-image-original-v1',title:x.payload.title,description:x.payload.description,diagram:null};}

test('complete returns true after committing READY with matching proofs', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db);await x.authority.bind(x.scope.capability,metadata(x),x.controller.signal);
  const outcome=await x.authority.complete(x.scope.capability,facts(x),x.controller.signal),r=await row(x);
  assert.equal(r.state,'READY');assert.equal(r.validated_digest,r.digest);assert.equal(r.scanned_digest,r.digest);assert.equal(BigInt(r.charge_bytes),BigInt(x.bytes.length));assert.equal(outcome,true);x.authority.close(x.scope);
 });
});
test('reject returns true after committing REJECTED without releasing quota', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db),outcome=await x.authority.reject(x.scope.capability,'INFECTED',x.controller.signal),r=await row(x);
  assert.equal(r.state,'REJECTED');assert.equal(r.error_code,'INFECTED');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(outcome,true);x.authority.close(x.scope);
 });
});
for(const operation of ['complete','reject'])test(`${operation} returns false when the terminal CAS updates no rows`,{timeout:120000},async()=>{
 await withAiDatabase(async db=>{
  let intercept=false;const database={$transaction:async(fn,options)=>db.database.$transaction(tx=>fn({$queryRawUnsafe:(sql,...args)=>intercept&&sql.includes("UPDATE foxy_visual_assets SET state=")?Promise.resolve([]):tx.$queryRawUnsafe(sql,...args)}),options)};
  const x=await setup({...db,database});if(operation==='complete')await x.authority.bind(x.scope.capability,metadata(x),x.controller.signal);
  intercept=true;const result=operation==='complete'?await x.authority.complete(x.scope.capability,facts(x),x.controller.signal):await x.authority.reject(x.scope.capability,'INFECTED',x.controller.signal);
  assert.equal(result,false);const r=await row(x);assert.equal(r.state,'PROCESSING');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(r.scanned_digest,null);x.authority.close(x.scope);
 });
});

test('claim and opaque authority enforce owner, live nonce and immutable bound metadata', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db),signal=x.controller.signal;
  assert.equal(await x.claims.claim({assetId:x.asset.id,ownerId:x.f.teacherActor}),null);
  await assert.rejects(x.authority.open({...x.lease,ownerId:x.f.other},signal));
  await assert.rejects(x.authority.open({...x.lease,leaseNonce:randomUUID()},signal));
  await assert.rejects(x.authority.authorize({},signal));
  const metadata={digest:sha(x.bytes),sizeBytes:x.bytes.length,mimeType:'image/png',width:32,height:24,producerVersion:'foxy-image-original-v1',title:'Imagen sintética',description:'Ejemplo',diagram:null};
  const first=await x.authority.bind(x.scope.capability,metadata,signal),again=await x.authority.bind(x.scope.capability,metadata,signal);assert.equal(first.payload.digest,metadata.digest);assert.deepEqual(again.payload,first.payload);
  await assert.rejects(x.authority.bind(x.scope.capability,{...metadata,title:'Distinto'},signal),e=>e?.code==='CONFLICT');
  await assert.rejects(x.authority.complete(x.scope.capability,{digest:metadata.digest,sizeBytes:metadata.sizeBytes,mimeType:metadata.mimeType,width:metadata.width,height:metadata.height,validatedDigest:metadata.digest,scannedDigest:'b'.repeat(64)},signal));
  assert.equal((await row(x)).state,'PROCESSING');x.authority.close(x.scope);await assert.rejects(x.authority.authorize(x.scope.capability,signal));
 });
});
test('closing the opaque capability revokes its authority', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db);x.authority.close(x.scope.capability);
  await assert.rejects(x.authority.authorize(x.scope.capability,x.controller.signal),e=>e?.code==='FORBIDDEN');assert.equal((await row(x)).state,'PROCESSING');
 });
});
test('closing capability during terminal transaction rolls back the in-flight completion', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{
  let enabled=false,enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
  const database={$transaction:(fn,options)=>db.database.$transaction(tx=>fn({$queryRawUnsafe:async(sql,...args)=>{
   const result=await tx.$queryRawUnsafe(sql,...args);if(enabled&&sql.includes("UPDATE foxy_visual_assets SET state='READY'")){enter();await gate;}return result;
  }}),options)};
  const x=await setup({...db,database});await x.authority.bind(x.scope.capability,metadata(x),x.controller.signal);enabled=true;
  const pending=x.authority.complete(x.scope.capability,facts(x),x.controller.signal).then(()=>null,e=>e);await entered;
  try{x.authority.close(x.scope.capability);}finally{release();}assert.ok(await pending);
  const r=await row(x);assert.equal(r.state,'PROCESSING');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(r.scanned_digest,null);
 });
});
test('first renewal precedes inspection with the original authority signal', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const order=[],x=await setup(db,{onInspect:()=>order.push('inspect'),renew:async()=>{order.push('renew');return true;}});
  await x.bridge.receive(x.scope.capability,x.payload,x.controller.signal);assert.equal(order[0],'renew');assert.ok(order.includes('inspect'));assert.equal((await row(x)).state,'READY');await x.bridge.close();
 });
});
for(const cause of ['false','throw'])test(`failed renewal ${cause} fences pending PUT and drains on close`,{timeout:120000},async()=>{
 await withAiDatabase(async db=>{
  let enter,release,renewed,inPut=false,early=0;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r),seen=new Promise(r=>renewed=r);
  const x=await setup(db,{timing:{renewIntervalMs:20,deadlineMs:5000},onPut:async()=>{inPut=true;enter();await gate;},renew:async lease=>{assert.equal(lease.assetId,x.asset.id);if(!inPut){early++;return true;}renewed();if(cause==='throw')throw Error('synthetic renewal error');return false;}});
  const work=x.bridge.receive(x.scope.capability,x.payload,x.controller.signal).then(()=>null,e=>e);await entered;
  try{
   await Promise.race([seen,new Promise((_,reject)=>setTimeout(()=>reject(Error('heartbeat absent')),1000))]);assert.ok(early>=1,'renew immediately before PUT');
   let drained=false;const close=x.bridge.close().then(()=>{drained=true});await Promise.resolve();assert.equal(drained,false);
   release();await close;assert.ok(await work);const r=await row(x);assert.notEqual(r.state,'READY');assert.equal(BigInt(r.charge_bytes),limit);
   await assert.rejects(x.authority.authorize(x.scope.capability,x.controller.signal),e=>e?.code==='FORBIDDEN');
  }finally{release();await work;await x.bridge.close();}
 });
});
test('renewals are serial while a storage operation is in flight', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{
  let putEnter,putRelease,renewEnter,renewRelease,calls=0,active=0,maxActive=0,inPut=false,early=0;
  const putEntered=new Promise(r=>putEnter=r),putGate=new Promise(r=>putRelease=r),renewEntered=new Promise(r=>renewEnter=r),renewGate=new Promise(r=>renewRelease=r);
  const x=await setup(db,{timing:{renewIntervalMs:20,deadlineMs:5000},onPut:async()=>{inPut=true;putEnter();await putGate;},renew:async()=>{if(!inPut){early++;return true;}calls++;active++;maxActive=Math.max(maxActive,active);renewEnter();await renewGate;active--;return true;}});
  const work=x.bridge.receive(x.scope.capability,x.payload,x.controller.signal).then(()=>null,e=>e);await putEntered;
  try{await Promise.race([renewEntered,new Promise((_,reject)=>setTimeout(()=>reject(Error('heartbeat absent')),1000))]);assert.ok(early>=1,'renew immediately before PUT');await new Promise(r=>setTimeout(r,90));assert.equal(calls,1);assert.equal(maxActive,1);renewRelease();putRelease();assert.equal(await work,null);assert.equal((await row(x)).state,'READY');}
  finally{renewRelease();putRelease();await work;await x.bridge.close();}
 });
});
test('operation deadline fences late storage completion', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{
  let enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
  const x=await setup(db,{timing:{renewIntervalMs:20,deadlineMs:3000},renew:async()=>true,onPut:async()=>{enter();await gate;}});
  const work=x.bridge.receive(x.scope.capability,x.payload,x.controller.signal).then(()=>null,e=>e);await entered;
  try{await new Promise(r=>setTimeout(r,3100));release();assert.ok(await work);const r=await row(x);assert.notEqual(r.state,'READY');assert.equal(BigInt(r.charge_bytes),limit);}
  finally{release();await work;await x.bridge.close();}
 });
});
test('live claim binds, writes, scans, reads back and completes READY with exact byte charge', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db),result=await x.bridge.receive(x.scope.capability,x.payload,x.controller.signal),r=await row(x);
  assert.equal(result.mimeType,'image/png');assert.equal(result.width,32);assert.equal(result.height,24);assert.equal(result.digest,sha(x.bytes));assert.equal(result.sizeBytes,x.bytes.length);
  assert.equal(r.state,'READY');assert.equal(r.digest,result.digest);assert.equal(r.validated_digest,r.digest);assert.equal(r.scanned_digest,r.digest);assert.ok(r.validated_at&&r.scanned_at);
  assert.equal(BigInt(r.charge_bytes),BigInt(x.bytes.length));assert.equal(r.lease_nonce,null);assert.ok(x.calls.includes('put')&&x.calls.includes('scan')&&x.calls.includes('get'));
  assert.deepEqual([...x.blobs.keys()],[`foxy-assets/${x.f.teacherActor}/${x.asset.id}`]);
  await assert.rejects(x.bridge.receive({},x.payload,x.controller.signal));x.authority.close(x.scope);
 });
});
for(const [name,change] of [['empty description',{description:''}],['150 Unicode scalar title',{title:'😀'.repeat(150)}]])test(`IMAGE accepts ${name} and preserves metadata`,{timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db),payload={...x.payload,...change};
  const result=await x.bridge.receive(x.scope.capability,payload,x.controller.signal),r=await row(x);
  assert.equal(result.digest,sha(x.bytes));assert.equal(r.state,'READY');assert.equal(r.title,payload.title);assert.equal(r.description,payload.description);await x.bridge.close();
 });
});
test('IMAGE rejects a title longer than 200 scalar values or with an unpaired surrogate', {timeout:120000},async()=>{
 for(const title of ['😀'.repeat(201),'Texto\ud800'])await withAiDatabase(async db=>{const x=await setup(db);
  await assert.rejects(x.bridge.receive(x.scope.capability,{...x.payload,title},x.controller.signal),e=>e?.code==='INVALID_INPUT');
  assert.equal((await row(x)).state,'PROCESSING');assert.equal(x.calls.includes('put'),false);await x.bridge.close();
 });
});
for(const timing of [{renewIntervalMs:100,deadlineMs:50},{renewIntervalMs:100,deadlineMs:100}])test(`custody rejects renewal interval >= deadline (${timing.renewIntervalMs}/${timing.deadlineMs})`,{timeout:120000},async()=>{
 await withAiDatabase(async db=>{await assert.rejects(()=>setup(db,{timing}),e=>e?.code==='INVALID_INPUT');});
});
test('scanner outage retains PROCESSING quota and never proves READY; malware retains REJECTED charge', {timeout:120000},async()=>{
 for(const error of ['SERVICE_UNAVAILABLE','FILE_REJECTED'])await withAiDatabase(async db=>{const x=await setup(db,{scanError:error});
  await assert.rejects(x.bridge.receive(x.scope.capability,x.payload,x.controller.signal));const r=await row(x);
  assert.equal(r.state,error==='FILE_REJECTED'?'REJECTED':'PROCESSING');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(r.scanned_digest,null);assert.equal(r.validated_digest,null);
  if(error==='FILE_REJECTED')assert.equal(r.error_code,'INFECTED');x.authority.close(x.scope);
 });
});
test('revocation, discarded asset or cancellation during external work prevents READY', {timeout:120000},async()=>{
 for(const mode of ['put','scan','get','abort','discard'])await withAiDatabase(async db=>{
  const revoke=async({query,f})=>query('UPDATE users SET email_verified_at=NULL WHERE id=$1',f.teacherActor);
  const options=mode==='put'?{onPut:revoke}:mode==='scan'?{onScan:revoke}:mode==='get'?{onGet:revoke}:mode==='discard'?{onScan:async({query,asset})=>query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=now(),revision=revision+1 WHERE id=$1",asset.id)}:{onScan:async({controller})=>controller.abort()};
  const x=await setup(db,options);await assert.rejects(x.bridge.receive(x.scope.capability,x.payload,x.controller.signal));
  const r=await row(x);assert.notEqual(r.state,'READY');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(r.scanned_digest,null);x.authority.close(x.scope);
 });
});
test('unknown PUT outcome never marks READY and exact stored bytes can be recovered without another PUT', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db,{uncertainPut:true});await assert.rejects(x.bridge.receive(x.scope.capability,x.payload,x.controller.signal));
  let r=await row(x);assert.equal(r.state,'PROCESSING');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(x.calls.filter(c=>c==='put').length,1);
  const facts=await x.bridge.recover(x.scope.capability,x.controller.signal);r=await row(x);assert.equal(r.state,'READY');assert.equal(facts.digest,sha(x.bytes));assert.equal(x.calls.filter(c=>c==='put').length,1);assert.ok(x.calls.includes('scan'));
  x.authority.close(x.scope);
 });
});
test('mismatched stored bytes or immutable retry payload cannot become READY or overwrite storage', {timeout:120000},async()=>{
 await withAiDatabase(async db=>{const x=await setup(db,{uncertainPut:true});await assert.rejects(x.bridge.receive(x.scope.capability,x.payload,x.controller.signal));
  const key=[...x.blobs.keys()][0];x.blobs.set(key,Buffer.alloc(x.bytes.length,42));await assert.rejects(x.bridge.recover(x.scope.capability,x.controller.signal));
  await assert.rejects(x.bridge.receive(x.scope.capability,{...x.payload,title:'Cambio'},x.controller.signal));const r=await row(x);
  assert.notEqual(r.state,'READY');assert.equal(BigInt(r.charge_bytes),limit);assert.equal(x.calls.filter(c=>c==='put').length,1);x.authority.close(x.scope);
 });
});
