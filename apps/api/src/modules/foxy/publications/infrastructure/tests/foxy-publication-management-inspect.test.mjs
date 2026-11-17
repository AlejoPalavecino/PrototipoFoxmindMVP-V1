import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const hash='a'.repeat(64),digest='b'.repeat(64);
async function fixture(pool,{withFile=true}={}){
  const [{createFoxyPublicationCompletion},{createFoxyPublicationQueue},{createFoxyPublicationRepository},{createFoxyResourceRepository},
    {createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([import("../../../../../bootstrap/foxy-service-factories.ts"),import("../publication-queue.ts"),
      import("../publication-repository.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../conversations/infrastructure/conversation-repository.ts"),import("../../../turns/infrastructure/turn-repository.ts")]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),tx={query},context={kind:'GENERAL'};
  const conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
    JSON.stringify({schemaVersion:'foxy-answer-v1',title:'Recurso',markdown:'Texto',references:[],warnings:[],missingInformation:[]}));
  const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
  const {publication}=await createFoxyPublicationRepository().prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:resource.revision,
    classroomId:f.rooms.teach.id,title:'Material',unitId:null,topicId:null});
  const lease=await createFoxyPublicationQueue({database}).claim(),fileId=randomUUID();
  if(withFile){await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'foxy-ai.pdf','pdf','application/pdf',100,'APPROVED','CLEAN',now(),now())`,
    fileId,f.rooms.teach.id,f.teacherActor,`synthetic/${fileId}`);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',0,now())",randomUUID(),fileId);
  await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",fileId,digest);
  await query(`UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=100,artifact_page_count=2,renderer_version='foxy-text-pdf-v1' WHERE id=$1`,publication.id,fileId,digest);}
  return {query,f,database,completion:createFoxyPublicationCompletion({database}),lease,publication,fileId,conversation,resource,resources};
}


async function setup(pool,options){
 const x=await fixture(pool,options), {createFoxyPublicationManagementRepository}=await import("../../../../../bootstrap/foxy-service-factories.ts");
 assert.equal(await x.completion.finish(x.lease,{state:'FAILED',errorCode:'FILE_NOT_READY'}),true);
 const [row]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id);
 const repository=createFoxyPublicationManagementRepository();assert.equal(typeof repository.retry,'function');const input={requestId:randomUUID(),publicationRevision:String(row.revision)};
 const run=(body=input,actor=x.f.teacherActor)=>x.database.$transaction(raw=>repository.retry({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},actor,x.publication.id,body));
 return {...x,repository,input,run};
}



test('management inspect projects policy from raw error and exposes only approved public fields', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});await x.query("UPDATE foxy_publications SET error_code='SYNTHETIC_UNKNOWN' WHERE id=$1",x.publication.id);
  assert.equal(typeof x.repository.inspect,'function');const value=await x.database.$transaction(raw=>x.repository.inspect({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},x.f.teacherActor,x.publication.id));
  assert.deepEqual(value,{publicationId:x.publication.id,publicationRevision:x.input.publicationRevision,canRetry:false,retryReason:'INVALID_RESOURCE',canDiscard:true,cleanupState:'NOT_REQUESTED'});
 });
});

test('management inspect enforces owner and retains archived destination as readable', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});assert.equal(typeof x.repository.inspect,'function');
  const inspect=actor=>x.database.$transaction(raw=>x.repository.inspect({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},actor,x.publication.id));
  await assert.rejects(inspect(x.f.other));await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',x.f.rooms.teach.id);
  const value=await inspect(x.f.teacherActor);assert.equal(value.canRetry,false);assert.equal(value.retryReason,'DESTINATION_UNAVAILABLE');assert.equal(value.canDiscard,true);
 });
});
