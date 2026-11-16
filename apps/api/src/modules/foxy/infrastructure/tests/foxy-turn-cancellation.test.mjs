import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyTurnRepository } from '../turn-repository.ts';
import { createFoxyTurnService } from '../../application/turn-service.ts';

const owner=crypto.randomUUID(), conversationId=crypto.randomUUID(), turnId=crypto.randomUUID();
test('cancels a queued turn durably, enforces ownership and can repeat', async () => {
  let state = 'QUEUED', updates = 0;
  const tx = { query: async (sql, ...args) => {
    if (sql.includes('pg_try_advisory_xact_lock')) return [{acquired:true}];
    if (sql.includes('UPDATE foxy_turns')) {
      assert.deepEqual(args, [owner, conversationId, turnId]); updates++; state='CANCELLED';
    }
    if (sql.includes('foxy_turns')) return args[0] === owner ? [{id:turnId, sequence:1, state,
      purpose:'CHAT', message_text:'Hola', created_at:new Date(), dispatch_count:0, reserved_microusd:0n, usage_day:null}] : [];
    return [];
  } };
  const turns=createFoxyTurnRepository();
  const service=createFoxyTurnService({turns, uow:{run:async (request,write,fn)=>{
    assert.equal(write,true); return fn(tx,{id:request});
  }}, conversations:{get:async()=>({id:conversationId,context:{kind:'GENERAL'}})} });
  await assert.rejects(service.cancel(crypto.randomUUID(),conversationId,turnId), {code:'NOT_FOUND'});
  assert.equal((await service.cancel(owner,conversationId,turnId)).state,'CANCELLED');
  assert.equal((await service.cancel(owner,conversationId,turnId)).state,'CANCELLED');
  assert.equal(updates,1);
});

test('migrated SQL rejects completion under a cancelled text lease', {timeout:120000}, async () => {
  const {withAgendaDatabase}=await import('../../../../../../../tests/agenda-database-helpers.test.mjs');
  const {homeFixture}=await import('../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs');
  const {createFoxyConversationRepository}=await import('../conversation-repository.ts');
  const {createFoxyTurnCompletion}=await import('../turn-completion.ts');
  await withAgendaDatabase(async ({transaction})=>transaction(async ({query,database})=>{
    const fixture=await homeFixture(query), tx={query}, turns=createFoxyTurnRepository();
    const ownerId=fixture.teacherActor, context={kind:'GENERAL'}, hash='a'.repeat(64);
    const {conversation}=await createFoxyConversationRepository().create(tx,ownerId,{requestId:crypto.randomUUID(),title:'Privado',context},hash);
    const {turn}=await turns.enqueue(tx,ownerId,conversation.id,
      {requestId:crypto.randomUUID(),revision:'0',purpose:'CHAT',text:'Consulta',selection:{topicIds:[],sourceIds:[]}},
      {context,curriculum:null,sources:[]},hash,{model:'synthetic',schemaVersion:'foxy-answer-v1',promptVersion:'test'});
    const leaseNonce=crypto.randomUUID();
    await query("UPDATE foxy_turns SET state='RUNNING',lease_nonce=$2::uuid,lease_until=clock_timestamp()+interval '1 minute' WHERE id=$1::uuid",turn.id,leaseNonce);
    assert.equal(await turns.cancel(tx,fixture.other,conversation.id,turn.id),null);
    assert.equal((await turns.cancel(tx,ownerId,conversation.id,turn.id)).state,'CANCELLED');
    assert.equal((await turns.get(tx,ownerId,conversation.id,turn.id)).state,'CANCELLED');
    const completion=createFoxyTurnCompletion({database,budget:{settle:async()=>false},configuration:{maxJobAgeMs:60000}});
    assert.equal(await completion.finish({ownerId,conversationId:conversation.id,turnId:turn.id,leaseNonce},{state:'FAILED',errorCode:'AI_TIMEOUT'}),false);
    const [stored]=await query('SELECT lease_nonce,lease_until,error_code,answer FROM foxy_turns WHERE id=$1::uuid',turn.id);
    assert.deepEqual(stored,{lease_nonce:null,lease_until:null,error_code:null,answer:null});
  }));
});

test('visual cancellation releases the provider reservation and prevents a leased worker applying output', {timeout:120000}, async()=>{
  const {withAgendaDatabase}=await import('../../../../../../../tests/agenda-database-helpers.test.mjs');
  const {homeFixture}=await import('../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs');
  const [{createFoxyConversationRepository},{createFoxyVisualRepository},{createFoxyPrivateAssetRepository},
    {createFoxyVisualQueue},{createFoxyVisualBudget},{createFoxyVisualCompletion}]=await Promise.all([
    import('../conversation-repository.ts'),import('../visual-repository.ts'),import('../private-asset-repository.ts'),
    import('../visual-queue.ts'),import('../visual-budget.ts'),import('../visual-completion.ts')]);
  await withAgendaDatabase(async ({transaction})=>transaction(async ({query,database})=>{
    const {teacherActor:ownerId,other}=await homeFixture(query), tx={query}, context={kind:'GENERAL'};
    const {conversation}=await createFoxyConversationRepository().create(tx,ownerId,{requestId:crypto.randomUUID(),title:'Privado',context},'a'.repeat(64));
    const budget=createFoxyVisualBudget({limits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}});
    const jobs=createFoxyVisualRepository({assets:createFoxyPrivateAssetRepository(),settleCancelled:budget.settleCancelled});
    const profile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,
      inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
    const {job}=await jobs.enqueue(tx,ownerId,conversation.id,{requestId:crypto.randomUUID(),revision:'0',kind:'IMAGE',aspectRatio:'1:1',
      prompt:'Consulta',selection:{topicIds:[],sourceIds:[]}},{context,curriculum:null,sources:[]},profile,10485760n);
    const queue=createFoxyVisualQueue({database,budget,configuration:{maxConcurrency:1,maxJobAgeMs:60000}});
    const lease=await queue.claim();
    assert.equal(lease.jobId,job.id);
    assert.equal(await budget.reserve(tx,lease,12),'RESERVED');
    assert.equal(await jobs.cancel(tx,other,conversation.id,job.id),null);
    assert.equal((await jobs.cancel(tx,ownerId,conversation.id,job.id)).state,'CANCELLED');
    assert.equal((await jobs.cancel(tx,ownerId,conversation.id,job.id)).state,'CANCELLED');
    assert.equal(await queue.renew(lease),false);
    const completion=createFoxyVisualCompletion({database,budget,maxJobAgeMs:60000});
    assert.equal(await completion.finish(lease,{state:'READY'}),false);
    const [asset]=await query('SELECT state,lease_nonce FROM foxy_visual_assets WHERE id=$1::uuid',job.assetId);
    assert.equal(asset.state,'DISCARDED');
    assert.equal(asset.lease_nonce,lease.leaseNonce,'keep the storage lease until cleanup can safely run');
    const [ledger]=await query("SELECT reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE capability='study-plan-v1' AND scope=$1",ownerId);
    assert.equal(BigInt(ledger.reserved_microusd),0n);
    assert.ok(BigInt(ledger.consumed_microusd)>0n);
  }));
});
