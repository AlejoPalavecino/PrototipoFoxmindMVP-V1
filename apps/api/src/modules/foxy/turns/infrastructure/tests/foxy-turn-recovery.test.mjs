import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const configuration={maxConcurrency:1,deadlineMs:30000,maxJobAgeMs:300000,dailyActorRequests:5,dailyGlobalRequests:20,maxOutputTokens:100,inputUsdPerMillion:2,outputUsdPerMillion:3,dailyBudgetUsd:1};
async function fixture(pool, dispatch) {
  const [{createFoxyConversationRepository},{createFoxyTurnRepository},{createFoxyTurnQueue},{createFoxyTextBudget}] = await Promise.all([
    import("../../../conversations/infrastructure/conversation-repository.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../text-budget.ts")]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows, f=await homeFixture(query), database=transactionDatabase(pool), tx={query};
  const conversations=createFoxyConversationRepository(), turns=createFoxyTurnRepository(), context={kind:'GENERAL'}, hash='a'.repeat(64);
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Recuperación',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'CHAT',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v1',schemaVersion:'foxy-answer-v1'});
  const queue=createFoxyTurnQueue({database,configuration}), lease=await queue.claim(); assert.equal(lease.turnId,turn.id);
  if(dispatch) assert.equal(await database.$transaction(raw=>createFoxyTextBudget({configuration}).reserve({query:raw.$queryRawUnsafe},lease,100)),'RESERVED');
  await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",turn.id);
  return {f,query,database,turn,lease};
}
async function recovery(database) { const api=await import("../turn-recovery.ts"); assert.equal(typeof api.createFoxyTurnRecovery,'function'); return api.createFoxyTurnRecovery({database}); }

test('provider-free recovery settles dispatched lease once, atomically and under shared lock order', {timeout:120000}, async () => {
  await withAgendaDatabase(async ({pool})=>{
    const x=await fixture(pool,true), queries=[];
    const database={$transaction:fn=>x.database.$transaction(raw=>fn({$queryRawUnsafe:async(sql,...args)=>{queries.push(sql); return raw.$queryRawUnsafe(sql,...args);}}))};
    const worker=await recovery(database); assert.equal(await worker.recoverExpired(),1); assert.equal(await worker.recoverExpired(),0);
    const [row]=await x.query('SELECT state,error_code,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid',x.turn.id);
    assert.equal(row.state,'FAILED'); assert.equal(row.error_code,'PROVIDER_OUTCOME_UNKNOWN'); assert.equal(row.reserved,'0');
    const ledger=await x.query("SELECT reserved_microusd::text AS reserved,consumed_microusd::text AS consumed,request_count FROM ai_usage_daily WHERE scope IN ('global',$1)",x.f.teacherActor);
    assert.equal(ledger.length,2); for(const item of ledger) { assert.equal(item.reserved,'0'); assert.equal(item.consumed,'500'); assert.equal(item.request_count,1); }
    let last=-1; for(const pattern of [/pg_advisory_xact_lock\(78123002\)/iu,/\bfoxy_turns\b[\s\S]*FOR UPDATE/iu,/pg_try_advisory_xact_lock\(78123001,hashtext/iu]) {
      const index=queries.findIndex((sql,i)=>i>last && pattern.test(sql)); assert.ok(index>last); last=index;
    }
  });
});

test('expired undispatched work requeues and simultaneous recoveries do not double settle', {timeout:120000}, async () => {
  for(const dispatch of [false,true]) await withAgendaDatabase(async ({pool})=>{
    const x=await fixture(pool,dispatch), worker=await recovery(x.database);
    const counts=await Promise.all([worker.recoverExpired(),worker.recoverExpired()]); assert.equal(counts[0]+counts[1],1);
    const [row]=await x.query('SELECT state,error_code FROM foxy_turns WHERE id=$1::uuid',x.turn.id);
    assert.equal(row.state,dispatch?'FAILED':'QUEUED'); assert.equal(row.error_code,dispatch?'PROVIDER_OUTCOME_UNKNOWN':null);
    if(dispatch) for(const item of await x.query("SELECT consumed_microusd::text AS consumed FROM ai_usage_daily WHERE scope IN ('global',$1)",x.f.teacherActor)) assert.equal(item.consumed,'500');
  });
});

test('recovery failure rolls back ledger and turn together', {timeout:120000}, async () => {
  await withAgendaDatabase(async ({pool})=>{
    const x=await fixture(pool,true); let injected=false;
    const database={$transaction:fn=>x.database.$transaction(raw=>fn({$queryRawUnsafe:async(sql,...args)=>{
      if(/UPDATE foxy_turns SET state=/iu.test(sql)){injected=true;throw Error('synthetic failure');} return raw.$queryRawUnsafe(sql,...args);
    }}))};
    const worker=await recovery(database); await assert.rejects(worker.recoverExpired()); assert.equal(injected,true);
    const [row]=await x.query('SELECT state,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid',x.turn.id);
    assert.equal(row.state,'RUNNING'); assert.equal(row.reserved,'500');
    for(const item of await x.query("SELECT reserved_microusd::text AS reserved,consumed_microusd::text AS consumed FROM ai_usage_daily WHERE scope IN ('global',$1)",x.f.teacherActor)) {assert.equal(item.reserved,'500');assert.equal(item.consumed,'0');}
  });
});

test('unexpired dispatched lease remains running and reserved', {timeout:120000}, async () => {
  await withAgendaDatabase(async ({pool})=>{
    const x=await fixture(pool,true);
    await x.query("UPDATE foxy_turns SET lease_until=clock_timestamp()+interval '2 minutes' WHERE id=$1::uuid",x.turn.id);
    const worker=await recovery(x.database); assert.equal(await worker.recoverExpired(),0);
    const [row]=await x.query('SELECT state,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid',x.turn.id);
    assert.equal(row.state,'RUNNING'); assert.equal(row.reserved,'500');
    for(const item of await x.query("SELECT reserved_microusd::text AS reserved,consumed_microusd::text AS consumed FROM ai_usage_daily WHERE scope IN ('global',$1)",x.f.teacherActor)) {
      assert.equal(item.reserved,'500'); assert.equal(item.consumed,'0');
    }
  });
});

test('recovery charges original usage day and never creates a new day ledger', {timeout:120000}, async () => {
  await withAgendaDatabase(async ({pool})=>{
    const x=await fixture(pool,true);
    await x.query("UPDATE foxy_turns SET usage_day=(current_date-1) WHERE id=$1::uuid",x.turn.id);
    await x.query("UPDATE ai_usage_daily SET day=(current_date-1) WHERE scope IN ('global',$1)",x.f.teacherActor);
    const worker=await recovery(x.database); assert.equal(await worker.recoverExpired(),1);
    const rows=await x.query("SELECT (day=current_date-1) AS yesterday,reserved_microusd::text AS reserved,consumed_microusd::text AS consumed FROM ai_usage_daily WHERE scope IN ('global',$1)",x.f.teacherActor);
    assert.equal(rows.length,2); for(const row of rows){assert.equal(row.yesterday,true);assert.equal(row.reserved,'0');assert.equal(row.consumed,'500');}
  });
});

test('missing price snapshot or ledger refuses recovery and leaves reservation and lease intact', {timeout:120000}, async () => {
  for(const cause of ['snapshot','ledger']) await withAgendaDatabase(async ({pool})=>{
    const x=await fixture(pool,true);
    if(cause==='snapshot') await x.query('UPDATE foxy_turns SET input_usd_per_million=NULL WHERE id=$1::uuid',x.turn.id);
    else await x.query("DELETE FROM ai_usage_daily WHERE scope=$1 AND capability='study-plan-v1'",x.f.teacherActor);
    const before=await x.query("SELECT scope,reserved_microusd::text AS reserved,consumed_microusd::text AS consumed FROM ai_usage_daily WHERE scope IN ('global',$1) ORDER BY scope",x.f.teacherActor);
    const worker=await recovery(x.database); await assert.rejects(worker.recoverExpired());
    const [row]=await x.query('SELECT state,reserved_microusd::text AS reserved,lease_nonce FROM foxy_turns WHERE id=$1::uuid',x.turn.id);
    assert.equal(row.state,'RUNNING'); assert.equal(row.reserved,'500'); assert.equal(row.lease_nonce,x.lease.leaseNonce);
    const after=await x.query("SELECT scope,reserved_microusd::text AS reserved,consumed_microusd::text AS consumed FROM ai_usage_daily WHERE scope IN ('global',$1) ORDER BY scope",x.f.teacherActor);
    assert.deepEqual(after,before);
  });
});
