import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';
const isCode=(...codes)=>e=>codes.includes(e?.code), hash='a'.repeat(64);
async function setup(pool){
  const [{createFoxyResourceService},{createFoxyUnitOfWork},{createFoxyResourceRepository},{createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([
    import('./resource-service.ts'),import('./unit-of-work.ts'),import('./resource-repository.ts'),import('./conversation-repository.ts'),import('./turn-repository.ts')]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),tx={query};
  const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,req)=>req.id}),resources=createFoxyResourceRepository(),conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository();
  const context={kind:'CLASSROOM',classroomId:f.rooms.teach.id}, {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:{units:[],selectedTopicIds:[]},sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  const answer={schemaVersion:'foxy-answer-v1',title:'Resumen',markdown:'Texto',references:[],warnings:[],missingInformation:[]};
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,JSON.stringify(answer));
  return {query,f,conversation,turn,service:createFoxyResourceService({uow,resources}),owner:{id:f.teacherActor},other:{id:f.other},student:{id:f.pupil},answer};
}

test('owner resource service opens and edits privately with replay and CAS', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await setup(pool),first=await x.service.fromTurn(x.owner,x.conversation.id,x.turn.id);
    assert.equal(first.created,true);const id=first.resource.id;assert.deepEqual(Object.keys(first.resource).sort(),['conversationId','id','markdown','revision','sourceTurnId','title']);
    const input={requestId:randomUUID(),revision:first.resource.revision,title:'Editado',markdown:'Texto revisado'};
    const edit=await x.service.edit(x.owner,id,input),replay=await x.service.edit(x.owner,id,input);
    assert.equal(edit.edited,true);assert.equal(replay.edited,false);assert.equal(replay.resource.revision,edit.resource.revision);
    await assert.rejects(x.service.edit(x.owner,id,{...input,markdown:'Otro'}),isCode('CONFLICT'));
    await assert.rejects(x.service.edit(x.owner,id,{...input,requestId:randomUUID()}),isCode('CONFLICT'));
    assert.equal((await x.service.get(x.owner,id)).markdown,'Texto revisado');
    assert.equal((await x.service.fromTurn(x.owner,x.conversation.id,x.turn.id)).resource.markdown,'Texto revisado');
    await assert.rejects(x.service.get(x.other,id),isCode('FORBIDDEN','NOT_FOUND'));await assert.rejects(x.service.get(x.student,id),isCode('FORBIDDEN'));
    const [stored]=await x.query('SELECT answer FROM foxy_turns WHERE id=$1::uuid',x.turn.id);assert.deepEqual(stored.answer,x.answer);
    const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
    await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid',x.f.rooms.teach.id);
    assert.equal((await x.service.get(x.owner,id)).markdown,'Texto revisado');
    assert.equal((await x.service.edit(x.owner,id,{requestId:randomUUID(),revision:edit.resource.revision,title:'Nuevo',markdown:'Texto'})).edited,true);
  });
});
