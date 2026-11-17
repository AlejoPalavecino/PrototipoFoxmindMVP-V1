import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const hash='a'.repeat(64), metadata={model:'synthetic',promptVersion:'foxy-chat-v1',schemaVersion:'foxy-answer-v1'};
async function fixture(pool,{classroom=false,count=3,breakAt=-1,snapshotChangeAt=-1}={}) {
  const [{createFoxyConversationRepository},{createFoxyTurnRepository},{createFoxyTurnQueue},{FoxyGroundingSnapshotService},{createFoxyClaimedTurnReader}]=await Promise.all([
    import("../../../conversations/infrastructure/conversation-repository.ts"),import("../turn-repository.ts"),import("../turn-queue.ts"),import("../grounding-snapshot.ts"),import("../turn-claimed-reader.ts")]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),tx={query},database=transactionDatabase(pool);
  const conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),context=classroom?{kind:'CLASSROOM',classroomId:f.rooms.teach.id}:{kind:'GENERAL'};
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const host={run:async(_req,_write,fn)=>fn(tx,{id:f.teacherActor,account_role:'teacher'}),classroom:async()=>{const [r]=await query('SELECT * FROM classrooms WHERE id=$1::uuid',f.rooms.teach.id);return r;}};
  const selection={topicIds:classroom?[f.rooms.teach.topic]:[],sourceIds:[]};
  const snapshot=await new FoxyGroundingSnapshotService(host,conversations).capture({},conversation.id,selection), ids=[];
  for(let i=0;i<count;i++){
    const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:String(i),purpose:'CHAT',text:`Pregunta ${i+1}`,selection},snapshot,hash,metadata);ids.push(turn.id);
    const answer={schemaVersion:'foxy-answer-v1',title:`Título ${i+1}`,markdown:`Respuesta ${i+1}`,references:[],warnings:[],missingInformation:[]};
    await query('UPDATE foxy_turns SET state=$2,answer=$3::jsonb,reference_map=$4::jsonb,source_report=$4::jsonb WHERE id=$1::uuid',turn.id,i===breakAt?'FAILED':'READY',i===breakAt?null:JSON.stringify(answer),i===breakAt?null:'[]');
    if(i===snapshotChangeAt){const old=structuredClone(snapshot);old.curriculum.units[0].name='Nombre anterior';await query('UPDATE foxy_turns SET snapshot=$2::jsonb WHERE id=$1::uuid',turn.id,JSON.stringify(old));}
  }
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:String(count),purpose:'CHAT',text:'Actual',selection},snapshot,hash,metadata);
  const queue=createFoxyTurnQueue({database,configuration:{maxConcurrency:1,deadlineMs:30000,maxJobAgeMs:300000,dailyActorRequests:5,dailyGlobalRequests:20,maxOutputTokens:100,inputUsdPerMillion:2,outputUsdPerMillion:3,dailyBudgetUsd:1}});
  const lease=await queue.claim();assert.equal(lease.turnId,turn.id);
  return {f,query,database,reader:createFoxyClaimedTurnReader({database,maxJobAgeMs:300000}),lease,ids};
}

test('claimed history includes only the latest ten READY pairs in chronological order without private metadata', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{count:12});const value=await x.reader.loadClaimed(x.lease,new AbortController().signal);
    assert.equal(value.history.length,10);assert.deepEqual(value.history.map(x=>x.user),Array.from({length:10},(_,i)=>`Pregunta ${i+3}`));
    assert.deepEqual(value.history[0],{user:'Pregunta 3',assistant:{title:'Título 3',markdown:'Respuesta 3'}});
    const serialized=JSON.stringify(value.history);for(const forbidden of [...x.ids,x.f.teacherActor,'references','snapshot','sourceId'])assert.equal(serialized.includes(forbidden),false);
  });
});

test('failed predecessor or different classroom snapshot stops the contiguous suffix', {timeout:120000},async()=>{
  for(const setting of [{count:5,breakAt:2},{classroom:true,count:5,snapshotChangeAt:2}]) await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool,setting), value=await x.reader.loadClaimed(x.lease,new AbortController().signal);
    assert.deepEqual(value.history.map(pair=>pair.user),['Pregunta 4','Pregunta 5']);
  });
});

test('reader rejects aborted signal and forged lease', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),controller=new AbortController();controller.abort();
    await assert.rejects(x.reader.loadClaimed(x.lease,controller.signal));
    await assert.rejects(x.reader.loadClaimed({...x.lease,leaseNonce:randomUUID()},new AbortController().signal));
  });
});

test('claim revoked after history read is revalidated before returning', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool), {createFoxyClaimedTurnReader}=await import("../turn-claimed-reader.ts");let injected=false;
    const database={$transaction:fn=>x.database.$transaction(raw=>fn({$queryRawUnsafe:async(sql,...args)=>{
      const rows=await raw.$queryRawUnsafe(sql,...args);
      if(!injected && /\bfoxy_turns\b/iu.test(sql) && /\bsequence\b/iu.test(sql) && /^\s*SELECT/iu.test(sql)){
        injected=true;await raw.$queryRawUnsafe('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid',x.f.teacherActor);
      }
      return rows;
    }}))};
    const reader=createFoxyClaimedTurnReader({database,maxJobAgeMs:300000});
    await assert.rejects(reader.loadClaimed(x.lease,new AbortController().signal));assert.equal(injected,true);
  });
});

test('history byte cap uses complete UTF-8 pairs and keeps newest suffix', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{count:3});
    for(const [i,id] of x.ids.entries()) {const answer={schemaVersion:'foxy-answer-v1',title:`Título ${i+1}`,markdown:'😀'.repeat(50000),references:[],warnings:[],missingInformation:[]};
      await x.query('UPDATE foxy_turns SET answer=$2::jsonb WHERE id=$1::uuid',id,JSON.stringify(answer));}
    const value=await x.reader.loadClaimed(x.lease,new AbortController().signal);
    assert.equal(value.history.length,1);assert.equal(value.history[0].user,'Pregunta 3');
    assert.equal(value.history[0].assistant.markdown.length,100000);assert.ok(Buffer.byteLength(JSON.stringify(value.history),'utf8')<=262144);
  });
});

test('a sequence gap cuts history without skipping to older turns', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{count:4});await x.query('DELETE FROM foxy_turns WHERE id=$1::uuid',x.ids[2]);
    const result=await x.reader.loadClaimed(x.lease,new AbortController().signal);assert.deepEqual(result.history.map(x=>x.user),['Pregunta 4']);
  });
});

for(const mutation of ['lease','snapshot']) test(`changed ${mutation} during history read cannot return stale context`, {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{classroom:mutation==='snapshot'}), {createFoxyClaimedTurnReader}=await import("../turn-claimed-reader.ts");let injected=false;
    const database={$transaction:fn=>x.database.$transaction(raw=>fn({$queryRawUnsafe:async(sql,...args)=>{
      const result=await raw.$queryRawUnsafe(sql,...args);
      if(!injected && /SELECT\s+sequence,state,message_text,answer,snapshot\s+FROM\s+foxy_turns/iu.test(sql)){
        injected=true;
        if(mutation==='lease')await raw.$queryRawUnsafe('UPDATE foxy_turns SET lease_nonce=$2::uuid WHERE id=$1::uuid',x.lease.turnId,randomUUID());
        else await raw.$queryRawUnsafe("UPDATE foxy_turns SET snapshot=jsonb_set(snapshot,'{curriculum,units,0,name}',to_jsonb('Alterado'::text)) WHERE id=$1::uuid",x.lease.turnId);
      }
      return result;
    }}))};
    await assert.rejects(createFoxyClaimedTurnReader({database,maxJobAgeMs:300000}).loadClaimed(x.lease,new AbortController().signal));assert.equal(injected,true);
  });
});

test('provider history redacts canonical UUIDs in user, title and markdown without mutating storage', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool,{count:1}), first=randomUUID(),second=randomUUID(),third=randomUUID();
    const rawMessage=`Consulta ${first}`, answer={schemaVersion:'foxy-answer-v1',title:`Tema ${second.toUpperCase()}`,
      markdown:`Vinculado ${third}`,references:[],warnings:[],missingInformation:[]};
    await x.query('UPDATE foxy_turns SET message_text=$2,answer=$3::jsonb WHERE id=$1::uuid',x.ids[0],rawMessage,JSON.stringify(answer));
    const result=await x.reader.loadClaimed(x.lease,new AbortController().signal);
    assert.deepEqual(result.history,[{user:'Consulta [identificador]',assistant:{title:'Tema [identificador]',markdown:'Vinculado [identificador]'}}]);
    const [stored]=await x.query('SELECT message_text,answer FROM foxy_turns WHERE id=$1::uuid',x.ids[0]);
    assert.equal(stored.message_text,rawMessage);assert.deepEqual(stored.answer,answer);
    for(const id of [first,second,third,x.f.teacherActor,...x.ids])assert.equal(JSON.stringify(result.history).toLowerCase().includes(id.toLowerCase()),false);
  });
});
