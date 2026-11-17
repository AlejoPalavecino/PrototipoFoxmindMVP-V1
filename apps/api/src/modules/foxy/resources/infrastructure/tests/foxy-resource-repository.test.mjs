import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const hash='a'.repeat(64),answer={schemaVersion:'foxy-answer-v1',title:'Resumen',markdown:'Texto original',references:[],warnings:[],missingInformation:[]};
const isCode=(...codes)=>error=>codes.includes(error?.code);
async function fixture(query,{ready=true}={}){
  const {createFoxyConversationRepository}=await import("../../../conversations/infrastructure/conversation-repository.ts"),{createFoxyTurnRepository}=await import("../../../turns/infrastructure/turn-repository.ts");
  const api=await import("../resource-repository.ts");assert.equal(typeof api.createFoxyResourceRepository,'function');
  const f=await homeFixture(query),tx={query},context={kind:'GENERAL'},conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository();
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Resumen',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  if(ready)await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,JSON.stringify(answer));
  return {f,tx,conversation,turn,resources:api.createFoxyResourceRepository()};
}

test('READY turn opens one private resource and reopening preserves edits and original answer', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool,transaction})=>{assert.match((await pool.query('SELECT current_database() name')).rows[0].name,/_test$/);
    await transaction(async({query})=>{const {f,tx,conversation,turn,resources}=await fixture(query);
      const first=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);assert.equal(first.created,true);
      assert.deepEqual(Object.keys(first.resource).sort(),['conversationId','id','markdown','revision','sourceTurnId','title']);
      assert.equal(first.resource.sourceTurnId,turn.id);assert.equal(first.resource.conversationId,conversation.id);
      assert.equal(first.resource.title,answer.title);assert.equal(first.resource.markdown,answer.markdown);
      const edited=await resources.edit(tx,f.teacherActor,first.resource.id,{requestId:randomUUID(),revision:first.resource.revision,title:'Editado',markdown:'Contenido docente'});
      assert.equal(edited.edited,true);const replay=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
      assert.equal(replay.created,false);assert.equal(replay.resource.id,first.resource.id);assert.equal(replay.resource.markdown,'Contenido docente');
      const [stored]=await query('SELECT answer FROM foxy_turns WHERE id=$1::uuid',turn.id);assert.deepEqual(stored.answer,answer);
      const [materials]=await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',f.rooms.teach.id);assert.equal(materials.n,0);
    });
  });
});

test('resource edits are idempotent before CAS, changed payload conflicts and fresh revisions advance', {timeout:120000},async()=>{
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const {f,tx,conversation,turn,resources}=await fixture(query);
    const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id),input={requestId:randomUUID(),revision:resource.revision,title:'Uno',markdown:'Texto uno'};
    const first=await resources.edit(tx,f.teacherActor,resource.id,input), replay=await resources.edit(tx,f.teacherActor,resource.id,input);
    assert.equal(first.edited,true);assert.equal(replay.edited,false);assert.equal(replay.resource.revision,first.resource.revision);
    await assert.rejects(resources.edit(tx,f.teacherActor,resource.id,{...input,markdown:'Diferente'}),isCode('CONFLICT'));
    await assert.rejects(resources.edit(tx,f.teacherActor,resource.id,{...input,requestId:randomUUID()}),isCode('CONFLICT'));
    const second=await resources.edit(tx,f.teacherActor,resource.id,{...input,requestId:randomUUID(),revision:first.resource.revision,title:'Dos'});
    assert.equal(second.edited,true);assert.notEqual(second.resource.revision,first.resource.revision);
  }));
});

test('pending, foreign ownership and invalid resource content are rejected', {timeout:120000},async()=>{
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const pending=await fixture(query,{ready:false});
    await assert.rejects(pending.resources.fromTurn(pending.tx,pending.f.teacherActor,pending.conversation.id,pending.turn.id),isCode('CONFLICT','INVALID_INPUT'));
    const x=await fixture(query), {resource}=await x.resources.fromTurn(x.tx,x.f.teacherActor,x.conversation.id,x.turn.id);
    assert.equal(await x.resources.get(x.tx,x.f.other,resource.id),null);
    await assert.rejects(x.resources.fromTurn(x.tx,x.f.other,x.conversation.id,x.turn.id),isCode('FORBIDDEN','NOT_FOUND'));
    await assert.rejects(x.resources.edit(x.tx,x.f.other,resource.id,{requestId:randomUUID(),revision:resource.revision,title:'Ajeno',markdown:'Texto'}),isCode('FORBIDDEN','NOT_FOUND'));
    for(const patch of [{title:'x'.repeat(201)},{markdown:'😀'.repeat(50001)}])
      await assert.rejects(x.resources.edit(x.tx,x.f.teacherActor,resource.id,{requestId:randomUUID(),revision:resource.revision,title:'Válido',markdown:'Válido',...patch}),isCode('INVALID_INPUT'));
  }));
});
