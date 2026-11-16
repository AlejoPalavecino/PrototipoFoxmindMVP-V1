import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const hash='a'.repeat(64), answer={schemaVersion:'foxy-answer-v1',title:'Resumen',markdown:'Contenido privado',references:[],warnings:[],missingInformation:[]};
const isCode=(...codes)=>error=>codes.includes(error?.code);
async function fixture(query){
  const [{createFoxyPublicationRepository},{createFoxyResourceRepository},{createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([
    import("../publication-repository.ts"),import("../resource-repository.ts"),import("../conversation-repository.ts"),import("../turn-repository.ts")]);
  const f=await homeFixture(query),tx={query},context={kind:'GENERAL'},conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,JSON.stringify(answer));
  const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
  return {f,tx,resource,resources,publications:createFoxyPublicationRepository()};
}
function intent(f,changes={}){return {requestId:randomUUID(),resourceRevision:f.resource.revision,classroomId:f.f.rooms.teach.id,
  title:'Material docente',unitId:f.f.rooms.teach.unit,topicId:f.f.rooms.teach.topic,...changes};}

test('preparation freezes a private resource revision and replay precedes later resource changes', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool,transaction})=>{assert.match((await pool.query('SELECT current_database() name')).rows[0].name,/_test$/);
    await transaction(async({query})=>{const x=await fixture(query),input=intent(x),first=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input);
      assert.equal(first.created,true);const p=first.publication;
      assert.deepEqual(Object.keys(p).sort(),['classroomId','id','resourceId','resourceRevision','revision','state','title','topicId','unitId']);
      assert.equal(p.state,'PREPARING');assert.equal(p.resourceRevision,x.resource.revision);assert.equal(p.classroomId,input.classroomId);
      const equivalent=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,{...input,requestId:randomUUID()});
      assert.equal(equivalent.created,false);assert.equal(equivalent.publication.id,p.id);
      for(const forbidden of ['markdown','digest','fileId','Contenido privado'])assert.equal(JSON.stringify(p).includes(forbidden),false);
      const edit=await x.resources.edit(x.tx,x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Nuevo',markdown:'Texto posterior'});
      const replay=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input);assert.equal(replay.created,false);assert.equal(replay.publication.id,p.id);assert.equal(replay.publication.resourceRevision,p.resourceRevision);
      await assert.rejects(x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,{...input,title:'Distinto'}),isCode('CONFLICT'));
      await assert.rejects(x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,{...input,requestId:randomUUID()}),isCode('CONFLICT'));
      const second=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,intent(x,{resourceRevision:edit.resource.revision}));assert.equal(second.created,true);assert.notEqual(second.publication.id,p.id);
      assert.equal((await x.publications.get(x.tx,x.f.teacherActor,p.id)).id,p.id);assert.equal(await x.publications.get(x.tx,x.f.other,p.id),null);
      const [material]=await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',input.classroomId);assert.equal(material.n,0);
    });
  });
});

test('destination must be active and owned and unit/topic must belong to it in correct hierarchy', {timeout:120000},async()=>{
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await fixture(query);
    for(const change of [{classroomId:x.f.rooms.foreign.id,unitId:null,topicId:null},{classroomId:x.f.rooms.archived.id,unitId:null,topicId:null},
      {unitId:x.f.rooms.foreign.unit,topicId:null},{unitId:x.f.rooms.teach.unit,topicId:x.f.rooms.foreign.topic},{unitId:null,topicId:x.f.rooms.teach.topic}])
      await assert.rejects(x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,intent(x,change)),isCode('FORBIDDEN','NOT_FOUND','CONFLICT','INVALID_INPUT'));
    await assert.rejects(x.publications.prepare(x.tx,x.f.other,x.resource.id,intent(x)),isCode('FORBIDDEN','NOT_FOUND'));
  }));
});

test('replay remains idempotent after classroom archive while new preparation is denied', {timeout:120000},async()=>{
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await fixture(query),input=intent(x);
    const first=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input);
    await query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid',input.classroomId);
    const replay=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input);
    assert.equal(replay.created,false);assert.equal(replay.publication.id,first.publication.id);
    await assert.rejects(x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,{...input,requestId:randomUUID()}),isCode('FORBIDDEN','NOT_FOUND','CONFLICT'));
    const [count]=await query('SELECT count(*)::int n FROM foxy_publications WHERE owner_id=$1::uuid',x.f.teacherActor);assert.equal(count.n,1);
    await query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1::uuid',x.resource.conversationId);
    await assert.rejects(x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input),isCode('FORBIDDEN','NOT_FOUND','CONFLICT'));
  }));
});

test('private publication intention does not prevent removing otherwise unused topic and unit', {timeout:120000},async()=>{
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await fixture(query),input=intent(x);
    const first=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input);assert.equal(first.created,true);
    await query('DELETE FROM topics WHERE id=$1::uuid',input.topicId);await query('DELETE FROM units WHERE id=$1::uuid',input.unitId);
    assert.equal((await query('SELECT id FROM topics WHERE id=$1::uuid',input.topicId)).length,0);
    assert.equal((await query('SELECT id FROM units WHERE id=$1::uuid',input.unitId)).length,0);
  }));
});

test('migrated synthetic database has no Prisma schema drift', {timeout:120000},async()=>{
  const {spawnSync}=await import('node:child_process'),{createRequire}=await import('node:module');
  await withAgendaDatabase(async({databaseUrl})=>{
    const prisma=createRequire(import.meta.url).resolve('prisma/build/index.js');
    const result=spawnSync(process.execPath,[prisma,'migrate','diff','--from-config-datasource','--to-schema','prisma/schema.prisma','--exit-code'],
      {env:{...process.env,DATABASE_URL:databaseUrl},encoding:'utf8',timeout:60000,windowsHide:true});
    assert.equal(result.status,0,`Prisma diff exit ${result.status}; ${result.stdout}`);
  });
});

test('inspect revalidates ownership and deleted origin, returns archived classroom state without private fields', {timeout:120000},async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await fixture(query),p=(await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,intent(x))).publication;
  const result=await x.publications.inspect(x.tx,x.f.teacherActor,p.id);assert.equal(result.publication.id,p.id);assert.equal(typeof result.classroomRevision,'string');assert.equal(result.classroomArchived,false);assert.equal(result.errorCode,null);
  for(const secret of ['snapshot_markdown','digest','fileId','Contenido privado'])assert.equal(JSON.stringify(result).includes(secret),false);
  await assert.rejects(x.publications.inspect(x.tx,x.f.other,p.id));await query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',p.classroomId);
  assert.equal((await x.publications.inspect(x.tx,x.f.teacherActor,p.id)).classroomArchived,true);
  await query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1',(await query('SELECT conversation_id FROM foxy_resources WHERE id=$1',x.resource.id))[0].conversation_id);
  await assert.rejects(x.publications.inspect(x.tx,x.f.teacherActor,p.id));
 }));
});

test('prepare replay of a now-inaccessible stored destination denies opaquely before uniqueness error', {timeout:120000},async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await fixture(query),input=intent(x),created=await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input);
  await query('UPDATE foxy_publications SET classroom_id=$2::uuid WHERE id=$1::uuid',created.publication.id,x.f.rooms.foreign.id);
  await assert.rejects(x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,input),isCode('NOT_FOUND','FORBIDDEN'));
 }));
});

test('resource publication list paginates exact timestamps and ties without loss or private fields', {timeout:120000},async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await fixture(query),created=[];
  let resource=x.resource;
  for(let i=0;i<5;i++) {
   if(i) ({resource}=await x.resources.edit(x.tx,x.f.teacherActor,resource.id,{requestId:randomUUID(),revision:resource.revision,title:`Revisión ${i}`,markdown:`Contenido privado ${i}`}));
   created.push((await x.publications.prepare(x.tx,x.f.teacherActor,resource.id,intent(x,{resourceRevision:resource.revision,title:`Material ${i}`}))).publication);
  }
  for(let i=0;i<created.length;i++)await query("UPDATE foxy_publications SET created_at=$2::timestamptz WHERE id=$1",created[i].id, i<3?'2026-10-31 12:00:00.123456+00':'2026-10-31 12:00:00.123455+00');
  const expected=[...created.slice(0,3).map(p=>p.id).sort().reverse(),...created.slice(3).map(p=>p.id).sort().reverse()],seen=[];let afterId=null;
  do{const page=await x.publications.list(x.tx,x.f.teacherActor,x.resource.id,{limit:2,afterId});assert.ok(page.items.length<=2);seen.push(...page.items.map(p=>p.id));
   for(const item of page.items){assert.deepEqual(Object.keys(item).sort(),['id','resourceId','resourceRevision','classroomId','unitId','topicId','title','state','revision'].sort());
    for(const secret of ['snapshot','digest','fileId','Contenido privado'])assert.equal(JSON.stringify(item).includes(secret),false);}
   afterId=page.nextAfterId;
  }while(afterId);assert.deepEqual(seen,expected);assert.equal(new Set(seen).size,5);
 }));
});

test('resource publication list enforces owner, cursor scope, limits, origin visibility and archive history', {timeout:120000},async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await fixture(query),p=(await x.publications.prepare(x.tx,x.f.teacherActor,x.resource.id,intent(x))).publication;
  await query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',p.classroomId);
  assert.equal((await x.publications.list(x.tx,x.f.teacherActor,x.resource.id,{limit:20,afterId:null})).items[0].id,p.id);
  await assert.rejects(x.publications.list(x.tx,x.f.other,x.resource.id,{limit:20,afterId:null}));
  for(const limit of [0,51,1.5])await assert.rejects(x.publications.list(x.tx,x.f.teacherActor,x.resource.id,{limit,afterId:null}));
  for(const afterId of ['invalid',randomUUID()])await assert.rejects(x.publications.list(x.tx,x.f.teacherActor,x.resource.id,{limit:20,afterId}));
  const [resource]=await query('SELECT conversation_id FROM foxy_resources WHERE id=$1',x.resource.id);await query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1',resource.conversation_id);
  await assert.rejects(x.publications.list(x.tx,x.f.teacherActor,x.resource.id,{limit:20,afterId:null}));
 }));
});
