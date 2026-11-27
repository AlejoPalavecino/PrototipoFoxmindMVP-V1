import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {withAiDatabase,transactionDatabase} from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const profile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const configuration={enabled:{IMAGE:true,DIAGRAM:false},profiles:{IMAGE:profile,DIAGRAM:null},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const modules=()=>Promise.all([import("../../../../../bootstrap/foxy-service-factories.ts"),import("../visual-repository.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../visual-budget.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../conversations/infrastructure/unit-of-work.ts"),import("../../../conversations/infrastructure/conversation-repository.ts"),import("../../../private-assets/infrastructure/private-asset-repository.ts"),import("../../../../../bootstrap/foxy-service-factories.ts")]);
async function fixture(pool,api,{shortLease=false,classroom=false,noClaim=false}={}){
 const [{createFoxyVisualService},{createFoxyVisualRepository},{createFoxyVisualQueue},{createFoxyVisualBudget},{createFoxyVisualClaimAuthority},{createFoxyVisualCompletion},{createFoxyUnitOfWork},{createFoxyConversationRepository},{createFoxyPrivateAssetRepository},{createFoxyPrivateAssetAuthority}]=api;
 const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),base=transactionDatabase(pool);let short=shortLease;
 const database={$transaction:(fn,options)=>base.$transaction(tx=>fn({$queryRawUnsafe:(sql,...args)=>tx.$queryRawUnsafe(short&&sql.includes("clock_timestamp()+interval '90 seconds' AS until")?sql.replace("interval '90 seconds'","interval '2 seconds'"):sql,...args)}),options)};
 const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,req)=>req.id}),owner={id:f.teacherActor},conversations=createFoxyConversationRepository(),assets=createFoxyPrivateAssetRepository();
 const activity=classroom?await f.activity('teach'):null;if(activity)await query("UPDATE activities SET instructions_text='Consigna sintética' WHERE id=$1",activity.id);
 const context=classroom?{kind:'CLASSROOM',classroomId:f.rooms.teach.id}:{kind:'GENERAL'};
 const conversation=(await uow.run(owner,true,(tx,a)=>conversations.create(tx,a.id,{requestId:randomUUID(),title:'Sintético',context},'a'.repeat(64)))).conversation;
 const jobs=createFoxyVisualRepository({assets,privateQuotaBytes:configuration.privateQuotaBytes}),service=createFoxyVisualService({uow,conversations,jobs,configuration});
 const started=await service.start(owner,conversation.id,{requestId:randomUUID(),revision:'0',kind:'IMAGE',prompt:'Imagen sintética',selection:{topicIds:[],sourceIds:activity?[`activity:${activity.id}`]:[]},aspectRatio:'1:1'});
 const budget=createFoxyVisualBudget({limits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}}),queue=createFoxyVisualQueue({database,configuration,budget}),lease=noClaim?null:await queue.claim();short=false;
 const assetAuthority=createFoxyPrivateAssetAuthority({database,maxJobAgeMs:300000}),authority=createFoxyVisualClaimAuthority({database,maxJobAgeMs:300000,assets:assetAuthority}),completion=createFoxyVisualCompletion({database,budget,maxJobAgeMs:300000});
 const tx=run=>database.$transaction(raw=>run({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}));
 return {query,f,owner,started,lease,budget,queue,authority,assetAuthority,completion,tx,database,activity};
}
async function waitExpired(x){const deadline=Date.now()+6000;while(Date.now()<deadline){const [r]=await x.query('SELECT lease_until<=clock_timestamp() expired FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);if(r.expired)return;await new Promise(r=>setTimeout(r,40));}throw Error('synthetic lease expiry timeout');}
function metadata(){const bytes=Buffer.from('synthetic raster'),digest=createHash('sha256').update(bytes).digest('hex');return {digest,sizeBytes:bytes.length,mimeType:'image/png',width:10,height:10,producerVersion:'foxy-image-original-v1',title:'Sintético',description:'',diagram:null};}

test('claim shares nonce and authority binds both job and asset; terminal job invalidates old capability', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal);
  const [row]=await x.query('SELECT j.lease_nonce jnonce,a.lease_nonce anonce,j.lease_until juntil,a.lease_until auntil FROM foxy_visual_jobs j JOIN foxy_visual_assets a ON a.id=j.asset_id WHERE j.id=$1',x.lease.jobId);
  assert.equal(row.jnonce,x.lease.leaseNonce);assert.equal(row.anonce,x.lease.leaseNonce);assert.equal(row.juntil.getTime(),row.auntil.getTime());
  assert.ok(scope.capability);assert.ok(scope.assetCapability);assert.equal(scope.job.id,x.lease.jobId);await x.authority.authorizeClaim(scope.capability,signal);
  await x.query("UPDATE foxy_visual_jobs SET state='FAILED',error_code='AI_UNAVAILABLE',revision=revision+1 WHERE id=$1",x.lease.jobId);
  await assert.rejects(x.assetAuthority.bind(scope.assetCapability,metadata(),signal));const [asset]=await x.query('SELECT state,digest,charge_bytes FROM foxy_visual_assets WHERE id=$1',x.lease.assetId);
  assert.equal(asset.state,'PROCESSING');assert.equal(asset.digest,null);assert.equal(BigInt(asset.charge_bytes),10485760n);x.authority.close(scope);
 });
});
test('READY completion requires an actually READY linked asset with matching current lease', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api);
  assert.equal(await x.completion.finish(x.lease,{state:'READY'}),false);const [job]=await x.query('SELECT state,dispatch_count FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);assert.equal(job.state,'RUNNING');assert.equal(job.dispatch_count,0);
 });
});
test('revocation during claim invalidates both visual and linked asset capabilities', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal);
  await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',x.f.teacherActor);
  await assert.rejects(x.authority.authorizeClaim(scope.capability,signal));await assert.rejects(x.assetAuthority.bind(scope.assetCapability,metadata(),signal));
  const [asset]=await x.query('SELECT state,digest,charge_bytes FROM foxy_visual_assets WHERE id=$1',x.lease.assetId);assert.equal(asset.state,'PROCESSING');assert.equal(asset.digest,null);assert.equal(BigInt(asset.charge_bytes),10485760n);x.authority.close(scope);
 });
});
test('selected classroom source changed after claim cannot authorize asset binding', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{classroom:true}),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal);
  await x.query("UPDATE activities SET instructions_text='Consigna cambiada',updated_at=clock_timestamp() WHERE id=$1",x.activity.id);
  assert.equal(await x.authority.revalidateGrounding(scope.capability,signal),false);await assert.rejects(x.assetAuthority.bind(scope.assetCapability,metadata(),signal));
  const [asset]=await x.query('SELECT state,digest,charge_bytes FROM foxy_visual_assets WHERE id=$1',x.lease.assetId);assert.equal(asset.state,'PROCESSING');assert.equal(asset.digest,null);assert.equal(BigInt(asset.charge_bytes),10485760n);x.authority.close(scope);
 });
});
test('selected activity cannot change between freshness check and durable dispatch marker', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{
  const x=await fixture(pool,api,{classroom:true}),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal);
  let enter,release;const entered=new Promise(r=>enter=r),gate=new Promise(r=>release=r);
  const work=x.database.$transaction(async raw=>{const tx={query:async(sql,...args)=>{
   if(sql.includes('SELECT j.* FROM foxy_visual_jobs')&&sql.includes('FOR UPDATE OF j')){enter();await gate;}
   return raw.$queryRawUnsafe(sql,...args);
  }};assert.equal(await x.authority.revalidateGrounding(scope.capability,signal,tx),true);return x.budget.reserve(tx,x.lease,12);}).then(value=>({value}),error=>({error}));
  await entered;const editor=await pool.connect();let committed=false;
  try{await editor.query('BEGIN');await editor.query("SET LOCAL lock_timeout='250ms'");
   try{await editor.query('SELECT id FROM classrooms WHERE id=$1 FOR UPDATE',[x.f.rooms.teach.id]);await editor.query("UPDATE activities SET instructions_text='Edición durante despacho',updated_at=clock_timestamp() WHERE id=$1",[x.activity.id]);await editor.query('COMMIT');committed=true;}
   catch(error){await editor.query('ROLLBACK');if(error?.code!=='55P03')throw error;}
  }finally{editor.release();release();}
  const result=await work;if(committed){assert.notEqual(result.value,'RESERVED','stale source must not be dispatched');const [row]=await x.query('SELECT dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);assert.equal(row.dispatch_count,0);assert.equal(BigInt(row.reserved_microusd),0n);}
  else assert.ok(result.value==='RESERVED'||result.error,'editor must wait or reservation must fail');x.authority.close(scope);
 });
});
test('undispatched expired claim is reclaimed with fresh nonce shared by job and asset', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{shortLease:true});await waitExpired(x);
  const next=await x.queue.claim();assert.ok(next);assert.notEqual(next.leaseNonce,x.lease.leaseNonce);assert.equal(next.jobId,x.lease.jobId);assert.equal(next.assetId,x.lease.assetId);
  const [r]=await x.query('SELECT j.lease_nonce jnonce,a.lease_nonce anonce,j.dispatch_count FROM foxy_visual_jobs j JOIN foxy_visual_assets a ON a.id=j.asset_id WHERE j.id=$1',next.jobId);
  assert.equal(r.jnonce,next.leaseNonce);assert.equal(r.anonce,next.leaseNonce);assert.equal(r.dispatch_count,0);assert.equal(await x.queue.renew(x.lease),false);
 });
});
test('expired dispatched job settles full budget and fails without re-dispatch', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{shortLease:true});assert.equal(await x.tx(tx=>x.budget.reserve(tx,x.lease,12)),'RESERVED');await waitExpired(x);
  const blocker = await pool.connect();
  try {
   await blocker.query('BEGIN');
   await blocker.query('SELECT pg_advisory_xact_lock(78123001,hashtext(($1::uuid)::text))',[x.lease.ownerId]);
   assert.equal(await x.queue.recoverExpired(),0,'terminal recovery defers while budget is locked');
   const [pending] = await x.query('SELECT state,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);
   assert.equal(pending.state,'RUNNING');
   assert.equal(BigInt(pending.reserved_microusd),139264n);
  } finally { await blocker.query('ROLLBACK'); blocker.release(); }
  const recovered = await Promise.all([x.queue.recoverExpired(),x.queue.recoverExpired()]);
  assert.deepEqual(recovered.sort(),[0,1]);
  const [job]=await x.query('SELECT state,error_code,dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);
  assert.equal(job.state,'FAILED');assert.equal(job.error_code,'GENERATION_INTERRUPTED');assert.equal(job.dispatch_count,1);assert.equal(BigInt(job.reserved_microusd),0n);assert.equal(await x.queue.claim(),null);
  const ledger=await x.query("SELECT reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE capability='study-plan-v1' AND scope IN ('global',$1)",x.f.teacherActor);assert.equal(ledger.length,2);
  for(const row of ledger){assert.equal(BigInt(row.reserved_microusd),0n);assert.equal(BigInt(row.consumed_microusd),139264n);}
 });
});
test('recovery must not finalize when settlement reports false', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{shortLease:true});assert.equal(await x.tx(tx=>x.budget.reserve(tx,x.lease,12)),'RESERVED');await waitExpired(x);
  const {createFoxyVisualQueue}=await import("../../../../../bootstrap/foxy-service-factories.ts"),queue=createFoxyVisualQueue({database:x.database,configuration,budget:{settleExpired:async()=>false}});
  let result;try{result=await queue.recoverExpired();}catch(error){assert.ok(error);}if(result!==undefined)assert.equal(result,0);
  const [job]=await x.query('SELECT state,dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);
  assert.equal(job.state,'RUNNING');assert.equal(job.dispatch_count,1);assert.equal(BigInt(job.reserved_microusd),139264n);
 });
});
test('expired dispatched job reconciles already READY asset without another dispatch or debit', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{shortLease:true}),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal);
  assert.equal(await x.tx(tx=>x.budget.reserve(tx,x.lease,12)),'RESERVED');const data=metadata();await x.assetAuthority.bind(scope.assetCapability,data,signal);
  assert.equal(await x.assetAuthority.complete(scope.assetCapability,{digest:data.digest,sizeBytes:data.sizeBytes,mimeType:data.mimeType,width:data.width,height:data.height,validatedDigest:data.digest,scannedDigest:data.digest},signal),true);
  x.authority.close(scope);await waitExpired(x);assert.equal(await x.queue.recoverExpired(),1);
  const [job]=await x.query('SELECT state,dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);assert.equal(job.state,'READY');assert.equal(job.dispatch_count,1);assert.equal(BigInt(job.reserved_microusd),0n);
  assert.equal(await x.queue.recoverExpired(),0);assert.equal(await x.queue.claim(),null);
 });
});


test('stale queued visual becomes a visible failure without provider dispatch or budget reserve', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{noClaim:true});
  const {createFoxyVisualQueue}=await import("../../../../../bootstrap/foxy-service-factories.ts");const queue=createFoxyVisualQueue({database:x.database,configuration:{...configuration,maxJobAgeMs:1},budget:x.budget});
  await new Promise(resolve=>setTimeout(resolve,20));await queue.recoverExpired();assert.equal(await queue.claim(),null);
  const [row]=await x.query('SELECT state,dispatch_count,reserved_microusd,error_code FROM foxy_visual_jobs WHERE id=$1',x.started.job.id);
  assert.equal(row.state,'FAILED');assert.ok(row.error_code);assert.equal(row.dispatch_count,0);assert.equal(BigInt(row.reserved_microusd),0n);
 });
});
test('expired dispatched job with bound bytes is reclaimed for custody recovery without another dispatch', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{shortLease:true}),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal);
  assert.equal(await x.tx(tx=>x.budget.reserve(tx,x.lease,12)),'RESERVED');const data=metadata();const grant=await x.assetAuthority.bind(scope.assetCapability,data,signal);
  const storage=new Map([[grant.storageKey,Buffer.from('synthetic raster')]]);assert.equal(storage.get(grant.storageKey).length,data.sizeBytes);
  x.authority.close(scope);await waitExpired(x);
  const blocker = await pool.connect();
  try {
   await blocker.query('BEGIN');
   await blocker.query('SELECT pg_advisory_xact_lock(78123001,hashtext(($1::uuid)::text))',[x.lease.ownerId]);
   assert.equal(await x.queue.claim(), null, 'expired dispatched claim defers while budget is locked');
   const [pending] = await x.query('SELECT lease_nonce,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',x.lease.jobId);
   assert.equal(pending.lease_nonce,x.lease.leaseNonce);
   assert.equal(BigInt(pending.reserved_microusd),139264n);
  } finally { await blocker.query('ROLLBACK'); blocker.release(); }
  assert.equal(await x.queue.recoverExpired(),0);
  const claims = (await Promise.all([x.queue.claim(), x.queue.claim()])).filter(Boolean);
  assert.equal(claims.length,1,'only one worker claims the expired job');
  const [next] = claims;
  assert.ok(next,'bound bytes need a new lease for custody recovery');assert.notEqual(next.leaseNonce,x.lease.leaseNonce);assert.equal(next.jobId,x.lease.jobId);
  const [row]=await x.query('SELECT j.state,j.dispatch_count,j.lease_nonce jnonce,a.lease_nonce anonce,a.digest FROM foxy_visual_jobs j JOIN foxy_visual_assets a ON a.id=j.asset_id WHERE j.id=$1',next.jobId);
  assert.equal(row.state,'RUNNING');assert.equal(row.dispatch_count,1);assert.equal(row.jnonce,next.leaseNonce);assert.equal(row.anonce,next.leaseNonce);assert.equal(row.digest,data.digest);
  const ledger = await x.query("SELECT request_count,reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE capability='study-plan-v1' AND scope IN ('global',$1)",x.f.teacherActor);
  assert.equal(ledger.length,2);
  for (const entry of ledger) {
   assert.equal(entry.request_count,1);
   assert.equal(BigInt(entry.reserved_microusd),0n);
   assert.equal(BigInt(entry.consumed_microusd),139264n);
  }
 });
});

for(const blobPresent of [true,false]) test('reclaimed bound PNG, blob present ' + blobPresent, {timeout:120000},async()=>{
 const api=await modules();const [{createFoxyVisualWorker},{createFoxyPrivateAssetFiles},{createFoxyPrivateImageInspector},{FileService},{FileError},{default:sharp}]=await Promise.all([import("../visual-worker.ts"),import("../../../../files/custody/infrastructure/foxy-private-asset-files.ts"),import("../../../../files/custody/infrastructure/foxy-private-image-inspector.ts"),import("../../../../files/custody/infrastructure/service.ts"),import("../../../../files/domain/errors.ts"),import('sharp')]);
 await withAiDatabase(async({pool})=>{const x=await fixture(pool,api,{shortLease:true}),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal),calls=[];
  assert.equal(await x.tx(tx=>x.budget.reserve(tx,x.lease,12)),'RESERVED');const bytes=await sharp({create:{width:32,height:24,channels:3,background:'#227755'}}).png().toBuffer(),digest=createHash('sha256').update(bytes).digest('hex');
  const grant=await x.assetAuthority.bind(scope.assetCapability,{digest,sizeBytes:bytes.length,mimeType:'image/png',width:32,height:24,producerVersion:'foxy-image-original-v1',title:'Imagen',description:'',diagram:null},signal);
  const blobs=new Map(blobPresent?[[grant.storageKey,Buffer.from(bytes)]]:[]);x.authority.close(scope);await waitExpired(x);
  const storage={get:async key=>{calls.push('get');const b=blobs.get(key);if(!b)throw new FileError('NOT_FOUND');return Buffer.from(b)},put:async()=>{calls.push('put');throw Error('unexpected put')},remove:async()=>{},drain:async()=>{}};
  const files=new FileService({database:x.database,access:{authenticate:async()=>{},authorize:async()=>{}},storage,scanner:{scan:async()=>{calls.push('scan')}},draftQuotaBytes:0n});
  const custody=createFoxyPrivateAssetFiles({files,authority:x.assetAuthority,inspector:createFoxyPrivateImageInspector(),renew:async lease=>x.queue.renew({jobId:x.lease.jobId,...lease})});
  const forbidden=async()=>{calls.push('provider');throw Error('unexpected provider')},provider={countTokens:forbidden,generate:forbidden};
  const worker=createFoxyVisualWorker({database:x.database,queue:x.queue,authority:x.authority,loader:{load:forbidden},providers:{IMAGE:provider,DIAGRAM:provider},renderer:{render:forbidden},custody,budget:x.budget,completion:x.completion,configuration});
  try{assert.equal(await worker.runOnce(),true);const [row]=await x.query('SELECT j.state,j.error_code,j.dispatch_count,a.state asset_state,a.digest,a.charge_bytes FROM foxy_visual_jobs j JOIN foxy_visual_assets a ON a.id=j.asset_id WHERE j.id=$1',x.lease.jobId);
   assert.equal(row.state,blobPresent?'READY':'FAILED',JSON.stringify({row,calls}));assert.equal(row.error_code,blobPresent?null:'PROVIDER_OUTCOME_UNKNOWN');assert.equal(row.asset_state,blobPresent?'READY':'PROCESSING');assert.equal(row.digest,digest);assert.equal(BigInt(row.charge_bytes),blobPresent?BigInt(bytes.length):10485760n);assert.equal(row.dispatch_count,1);assert.equal(calls.includes('scan'),blobPresent);assert.ok(calls.includes('get'));assert.ok(!calls.includes('put')&&!calls.includes('provider'));
  }finally{await worker.onModuleDestroy();await custody.close();}
 });
});
