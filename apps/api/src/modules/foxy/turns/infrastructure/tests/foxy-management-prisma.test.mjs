import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const hash='a'.repeat(64),digest='b'.repeat(64);
async function fixture(pool,{withFile=true,extension='pdf',artifactSize=100}={}){
  const [{createFoxyPublicationCompletion},{createFoxyPublicationQueue},{createFoxyPublicationRepository},{createFoxyResourceRepository},
    {createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../publications/infrastructure/publication-queue.ts"),
      import("../../../publications/infrastructure/publication-repository.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../conversations/infrastructure/conversation-repository.ts"),import("../turn-repository.ts")]);
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
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'foxy-ai.pdf',$5,'application/pdf',100,'APPROVED','CLEAN',now(),now())`,
    fileId,f.rooms.teach.id,f.teacherActor,`synthetic/${fileId}`,extension);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',0,now())",randomUUID(),fileId);
  await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",fileId,digest);
  await query(`UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=$4,artifact_page_count=2,renderer_version='foxy-text-pdf-v1' WHERE id=$1`,publication.id,fileId,digest,artifactSize);}
  return {query,f,database,completion:createFoxyPublicationCompletion({database}),lease,publication,fileId,conversation,resource,resources};
}


async function management(x){const {createFoxyPublicationManagementRepository}=await import("../../../../../bootstrap/foxy-service-factories.ts");const repository=createFoxyPublicationManagementRepository(),[p]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id);
 const input={requestId:randomUUID(),publicationRevision:String(p.revision),confirm:true};
 const run=(body=input,actor=x.f.teacherActor)=>x.database.$transaction(raw=>repository.discard({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},actor,x.publication.id,body));return {repository,input,run};}


async function prisma(url){const {PrismaService}=await import("../../../../../../../../.build/api/apps/api/src/platform/database/prisma.service.js");return new PrismaService(url);}
const tx=raw=>({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)});

test('real Prisma can acquire management lock for discard and replay', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool,databaseUrl})=>{const x=await fixture(pool,{withFile:false}),db=await prisma(databaseUrl),{createFoxyPublicationManagementRepository}=await import("../../../../../bootstrap/foxy-service-factories.ts");
  try{const repo=createFoxyPublicationManagementRepository(),input={requestId:randomUUID(),publicationRevision:'0',confirm:true};
   const receipt=await db.$transaction(raw=>repo.discard(tx(raw),x.f.teacherActor,x.publication.id,input));assert.equal(receipt.action,'DISCARD');
   assert.deepEqual(await db.$transaction(raw=>repo.discard(tx(raw),x.f.teacherActor,x.publication.id,input)),receipt);
  }finally{await db.$disconnect();}
 });
});

test('real Prisma can acquire management lock for retry', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool,databaseUrl})=>{const x=await fixture(pool,{withFile:false}),db=await prisma(databaseUrl),{createFoxyPublicationManagementRepository}=await import("../../../../../bootstrap/foxy-service-factories.ts");
  try{assert.equal(await x.completion.finish(x.lease,{state:'FAILED',errorCode:'FILE_NOT_READY'}),true);const [p]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id);
   const receipt=await db.$transaction(raw=>createFoxyPublicationManagementRepository().retry(tx(raw),x.f.teacherActor,x.publication.id,{requestId:randomUUID(),publicationRevision:String(p.revision)}));assert.equal(receipt.action,'RETRY');
  }finally{await db.$disconnect();}
 });
});

test('real Prisma cleanup claims expired synthetic restart and acknowledges storage', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool,databaseUrl})=>{const x=await fixture(pool),db=await prisma(databaseUrl),{createFoxyPublicationCleanup}=await import("../../../publications/infrastructure/publication-cleanup.ts");let removes=0;
  try{await x.query("UPDATE file_custodies SET phase='deleting',operation_id=$2,lease_until=clock_timestamp()-interval '1 minute' WHERE file_id=$1",x.fileId,randomUUID());
   await x.query("UPDATE foxy_publications SET state='DISCARDED',discarded_at=clock_timestamp()-interval '5 minutes',lease_nonce=NULL,lease_until=NULL,revision=revision+1 WHERE id=$1",x.publication.id);
   const worker=createFoxyPublicationCleanup({database:db,storage:{remove:async()=>{removes++;}}});assert.equal(await worker.sweep(),true);assert.equal(removes,1);
   const [row]=await x.query('SELECT c.phase,f.blob_deleted_at FROM file_custodies c JOIN files f ON f.id=c.file_id WHERE c.file_id=$1',x.fileId);assert.equal(row.phase,'deleted');assert.ok(row.blob_deleted_at);
  }finally{await db.$disconnect();}
 });
});


test('real Prisma management inspection applies raw error, file and authorization policy', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool,databaseUrl})=>{const x=await fixture(pool),db=await prisma(databaseUrl),{createFoxyPublicationManagementRepository}=await import("../../../../../bootstrap/foxy-service-factories.ts"),repo=createFoxyPublicationManagementRepository();
  const inspect=actor=>db.$transaction(raw=>repo.inspect(tx(raw),actor,x.publication.id));
  try{assert.equal(await x.completion.finish(x.lease,{state:'FAILED',errorCode:'FILE_NOT_READY'}),true);
   let result=await inspect(x.f.teacherActor);assert.equal(result.canRetry,true);assert.equal(result.canDiscard,true);assert.equal(result.retryReason,null);
   assert.deepEqual(Object.keys(result).sort(),['publicationId','publicationRevision','canRetry','retryReason','canDiscard','cleanupState'].sort());
   await x.query("UPDATE foxy_publications SET error_code='SYNTHETIC_UNKNOWN' WHERE id=$1",x.publication.id);result=await inspect(x.f.teacherActor);assert.equal(result.canRetry,false);assert.equal(result.retryReason,'INVALID_RESOURCE');
   await assert.rejects(inspect(x.f.other));await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',x.f.rooms.teach.id);
   result=await inspect(x.f.teacherActor);assert.equal(result.retryReason,'DESTINATION_UNAVAILABLE');assert.equal(result.canDiscard,true);
   await x.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1',x.conversation.id);await assert.rejects(inspect(x.f.teacherActor));
  }finally{await db.$disconnect();}
 });
});


test('real Prisma inspection reports pending cleanup after discard without exposing file identity', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool,databaseUrl})=>{const x=await fixture(pool),db=await prisma(databaseUrl),{createFoxyPublicationManagementRepository}=await import("../../../../../bootstrap/foxy-service-factories.ts"),repo=createFoxyPublicationManagementRepository();
  try{const receipt=await db.$transaction(raw=>repo.discard(tx(raw),x.f.teacherActor,x.publication.id,{requestId:randomUUID(),publicationRevision:'0',confirm:true}));
   const view=await db.$transaction(raw=>repo.inspect(tx(raw),x.f.teacherActor,x.publication.id));assert.equal(view.publicationRevision,receipt.publicationRevision);assert.equal(view.canDiscard,false);assert.equal(view.canRetry,false);assert.equal(view.cleanupState,'PENDING');
   assert.equal(JSON.stringify(view).includes(x.fileId),false);
  }finally{await db.$disconnect();}
 });
});


for(const mode of ['size','missing-upload','missing-custody'])test(`real Prisma inspection fails closed for ${mode} binding`, {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool,databaseUrl})=>{const x=await fixture(pool,{artifactSize:mode==='size'?101:100}),db=await prisma(databaseUrl),{createFoxyPublicationManagementRepository}=await import("../../../../../bootstrap/foxy-service-factories.ts"),repo=createFoxyPublicationManagementRepository();
  try{if(mode==='missing-upload')await x.query('DELETE FROM uploads WHERE file_id=$1',x.fileId);
   else if(mode==='missing-custody')await x.query('DELETE FROM file_custodies WHERE file_id=$1',x.fileId);
   await assert.rejects(db.$transaction(raw=>repo.inspect(tx(raw),x.f.teacherActor,x.publication.id)),e=>e?.code==='SERVICE_UNAVAILABLE');
  }finally{await db.$disconnect();}
 });
});
