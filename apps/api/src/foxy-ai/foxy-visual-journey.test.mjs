import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAiDatabase,transactionDatabase} from '../../../../tests/classroom-ai-database.test.mjs';
import {homeFixture} from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const limit=10485760n,profile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const configuration={enabled:{IMAGE:true,DIAGRAM:false},profiles:{IMAGE:profile,DIAGRAM:null},privateQuotaBytes:limit,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const command=changes=>({requestId:randomUUID(),revision:'0',kind:'IMAGE',prompt:'Ilustrá el ciclo del agua',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1',...changes});
const code=expected=>error=>error?.code===expected;
async function modules(){return Promise.all([import('./visual-service.ts'),import('./visual-repository.ts'),import('./unit-of-work.ts'),import('./conversation-repository.ts'),import('./private-asset-repository.ts')]);}
async function setup(pool,api,options={}){
 const [{createFoxyVisualService},{createFoxyVisualRepository},{createFoxyUnitOfWork},{createFoxyConversationRepository},{createFoxyPrivateAssetRepository}]=api;
 const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),owner={id:f.teacherActor};
 const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,request)=>{if(request.revoked)throw Object.assign(Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'});return request.id;}});
 const conversations=createFoxyConversationRepository(),conversation=(await uow.run(owner,true,(tx,a)=>conversations.create(tx,a.id,{requestId:randomUUID(),title:'Sintético',context:{kind:'GENERAL'}},'a'.repeat(64)))).conversation;
 const assets=createFoxyPrivateAssetRepository(),cfg={...configuration,...options},jobs=createFoxyVisualRepository({assets,privateQuotaBytes:cfg.privateQuotaBytes}),service=createFoxyVisualService({uow,conversations,jobs,configuration:cfg});
 return {query,f,database,uow,owner,conversation,service,assets,jobs};
}
test('visual start atomically reserves one private asset, durable job and conversation revision', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api),input=command(),first=await x.service.start(x.owner,x.conversation.id,input);
  assert.equal(first.created,true);assert.equal(first.job.state,'QUEUED');assert.equal(first.job.kind,'IMAGE');assert.equal(first.job.conversationId,x.conversation.id);assert.equal(first.conversationRevision,'1');
  assert.deepEqual(Object.keys(first.job).sort(),['aspectRatio','assetId','conversationId','createdAt','errorCode','id','kind','state']);
  const replay=await x.service.start(x.owner,x.conversation.id,input);assert.equal(replay.created,false);assert.equal(replay.job.id,first.job.id);assert.equal(replay.job.assetId,first.job.assetId);assert.equal(replay.conversationRevision,'1');
  await assert.rejects(x.service.start(x.owner,x.conversation.id,{...input,prompt:'Diferente'}),code('CONFLICT'));
  const [count]=await x.query('SELECT (SELECT count(*) FROM foxy_visual_jobs)::int jobs,(SELECT count(*) FROM foxy_visual_assets)::int assets,(SELECT sum(charge_bytes) FROM foxy_visual_assets)::text used');
  assert.deepEqual(count,{jobs:1,assets:1,used:String(limit)});const got=await x.service.get(x.owner,x.conversation.id,first.job.id);assert.equal(got.id,first.job.id);
  assert.ok((await x.service.list(x.owner,x.conversation.id,{limit:10,afterId:null})).items.some(job=>job.id===first.job.id));
  await assert.rejects(x.service.get({id:x.f.other},x.conversation.id,first.job.id));await assert.rejects(x.service.get({id:x.f.pupil},x.conversation.id,first.job.id));
 });
});
test('same request races safely and different requests do not exceed one asset quota', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api),input=command(),results=await Promise.all([x.service.start(x.owner,x.conversation.id,input),x.service.start(x.owner,x.conversation.id,input)]);
  assert.deepEqual(results.map(x=>x.created).sort(),[false,true]);assert.equal(results[0].job.id,results[1].job.id);
  await assert.rejects(x.service.start(x.owner,x.conversation.id,command({revision:'1'})),code('QUOTA_EXCEEDED'));
  const [r]=await x.query('SELECT (SELECT count(*) FROM foxy_visual_jobs)::int jobs,(SELECT count(*) FROM foxy_visual_assets)::int assets');assert.deepEqual(r,{jobs:1,assets:1});
 });
});
test('failed enqueue rolls back asset reservation and does not advance the conversation', {timeout:120000},async()=>{
 const api=await modules();await withAiDatabase(async({pool})=>{const x=await setup(pool,api,{privateQuotaBytes:0n});await assert.rejects(x.service.start(x.owner,x.conversation.id,command()),code('QUOTA_EXCEEDED'));
  const [r]=await x.query('SELECT (SELECT count(*) FROM foxy_visual_jobs)::int jobs,(SELECT count(*) FROM foxy_visual_assets)::int assets,(SELECT revision::text FROM foxy_conversations WHERE id=$1) revision',x.conversation.id);
  assert.deepEqual(r,{jobs:0,assets:0,revision:'0'});
 });
});
test('shared budget marks one dispatch and settles unknown usage at full quote exactly once', {timeout:120000},async()=>{
 const api=await modules(),[{createFoxyVisualQueue},{createFoxyVisualBudget}]=await Promise.all([import('./visual-queue.ts'),import('./visual-budget.ts')]);
 await withAiDatabase(async({pool})=>{const x=await setup(pool,api),started=await x.service.start(x.owner,x.conversation.id,command()),budget=createFoxyVisualBudget({limits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}}),queue=createFoxyVisualQueue({database:x.database,configuration,budget}),lease=await queue.claim();
  assert.equal(lease.jobId,started.job.id);assert.equal(lease.assetId,started.job.assetId);
  const tx=run=>x.database.$transaction(raw=>run({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}));
  assert.equal(await tx(t=>budget.reserve(t,lease,12)),'RESERVED');assert.equal(await tx(t=>budget.reserve(t,lease,12)),'ALREADY_DISPATCHED');
  let [job]=await x.query('SELECT dispatch_count,reserved_microusd,usage_day FROM foxy_visual_jobs WHERE id=$1',lease.jobId);
  assert.equal(job.dispatch_count,1);assert.equal(BigInt(job.reserved_microusd),139264n);const originalDay=job.usage_day;
  assert.equal(await tx(t=>budget.settle(t,lease,null)),true);assert.equal(await tx(t=>budget.settle(t,lease,null)),false);
  [job]=await x.query('SELECT dispatch_count,reserved_microusd,usage_day FROM foxy_visual_jobs WHERE id=$1',lease.jobId);assert.equal(job.dispatch_count,1);assert.equal(BigInt(job.reserved_microusd),0n);assert.deepEqual(job.usage_day,originalDay);
  const ledger=await x.query("SELECT scope,reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE capability='study-plan-v1' AND scope IN ('global',$1) ORDER BY scope",x.f.teacherActor);
  assert.equal(ledger.length,2);for(const row of ledger){assert.equal(BigInt(row.reserved_microusd),0n);assert.equal(BigInt(row.consumed_microusd),139264n);}
 });
});
test('known provider usage exceeding profile caps is recorded without clipping to reservation', {timeout:120000},async()=>{
 const api=await modules(),[{createFoxyVisualQueue},{createFoxyVisualBudget}]=await Promise.all([import('./visual-queue.ts'),import('./visual-budget.ts')]);
 await withAiDatabase(async({pool})=>{const x=await setup(pool,api);await x.service.start(x.owner,x.conversation.id,command());const budget=createFoxyVisualBudget({limits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}}),queue=createFoxyVisualQueue({database:x.database,configuration,budget}),lease=await queue.claim();
  const tx=fn=>x.database.$transaction(raw=>fn({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}));assert.equal(await tx(t=>budget.reserve(t,lease,12)),'RESERVED');
  assert.equal(await tx(t=>budget.settle(t,lease,{inputTokens:70000,outputTokens:5000})),true);
  const rows=await x.query("SELECT reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE capability='study-plan-v1' AND scope IN ('global',$1)",x.f.teacherActor);
  assert.equal(rows.length,2);for(const row of rows){assert.equal(BigInt(row.reserved_microusd),0n);assert.equal(BigInt(row.consumed_microusd),167500n);}
 });
});
test('discarding linked asset before dispatch prevents budget reservation and dispatch marker', {timeout:120000},async()=>{
 const api=await modules(),[{createFoxyVisualQueue},{createFoxyVisualBudget}]=await Promise.all([import('./visual-queue.ts'),import('./visual-budget.ts')]);
 await withAiDatabase(async({pool})=>{const x=await setup(pool,api);await x.service.start(x.owner,x.conversation.id,command());const budget=createFoxyVisualBudget({limits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}}),queue=createFoxyVisualQueue({database:x.database,configuration,budget}),lease=await queue.claim();
  await x.query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=clock_timestamp(),revision=revision+1 WHERE id=$1",lease.assetId);
  const result=await x.database.$transaction(raw=>budget.reserve({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},lease,12));assert.equal(result,'NOT_CURRENT');
  const [row]=await x.query('SELECT dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',lease.jobId);assert.equal(row.dispatch_count,0);assert.equal(BigInt(row.reserved_microusd),0n);
 });
});
