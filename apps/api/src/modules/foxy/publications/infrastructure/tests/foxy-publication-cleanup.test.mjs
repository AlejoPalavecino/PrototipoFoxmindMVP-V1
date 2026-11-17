import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const hash='a'.repeat(64),digest='b'.repeat(64);
async function fixture(pool,{withFile=true,extension='pdf',artifactSize=100}={}){
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

async function createCleanup(x,storage){const {createFoxyPublicationCleanup}=await import("../publication-cleanup.ts");return createFoxyPublicationCleanup({database:x.database,storage});}
async function waitLease(x){const [row]=await x.query('SELECT lease_until FROM file_custodies WHERE file_id=$1',x.fileId);
 while(true){const [clock]=await x.query('SELECT clock_timestamp() AS now');const left=row.lease_until-clock.now;if(left<=0)return;await new Promise(resolve=>setTimeout(resolve,Math.min(left+50,10000)));}}
async function fileState(x){const [row]=await x.query(`SELECT p.state,p.cleanup_error_code,c.phase,c.operation_id,c.lease_until,f.blob_deleted_at,u.reserved_bytes,u.reservation_released_at FROM foxy_publications p JOIN file_custodies c ON c.file_id=p.file_id JOIN files f ON f.id=p.file_id JOIN uploads u ON u.file_id=p.file_id WHERE p.id=$1`,x.publication.id);return row;}

test('cleanup respects live quiet lease and never removes published or preparing files', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);let calls=0;const worker=await createCleanup(x,{remove:async()=>{calls++;}});
  assert.equal(await worker.sweep(),false);assert.equal(calls,0);await m.run();const before=await fileState(x);assert.equal(await worker.sweep(),false);assert.equal(calls,0);assert.deepEqual(await fileState(x),before);
 });
});

test('expired discard removes storage outside SQL before atomic acknowledgment and quota release', {timeout:180000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);let called=0,observed;
  const worker=await createCleanup(x,{remove:async key=>{called++;assert.equal(key,`synthetic/${x.fileId}`);observed=await fileState(x);assert.equal(observed.phase,'deleting');assert.equal(observed.blob_deleted_at,null);}});
  await m.run();await waitLease(x);assert.equal(await worker.sweep(),true);assert.equal(called,1);const row=await fileState(x);
  assert.equal(row.state,'DISCARDED');assert.equal(row.phase,'deleted');assert.ok(row.blob_deleted_at);assert.equal(row.operation_id,null);assert.equal(row.lease_until,null);assert.equal(await worker.sweep(),false);assert.equal(called,1);
 });
});

test('storage failure keeps bytes, quota and claimed lease for a later recovery', {timeout:180000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);let calls=0;
  const worker=await createCleanup(x,{remove:async()=>{calls++;throw Error('synthetic private diagnostic');}});await m.run();await waitLease(x);assert.equal(await worker.sweep(),true);
  const row=await fileState(x);assert.equal(calls,1);assert.equal(row.state,'DISCARDED');assert.equal(row.phase,'deleting');assert.equal(row.blob_deleted_at,null);assert.ok(row.operation_id);assert.ok(row.lease_until);assert.equal(row.cleanup_error_code,'STORAGE_UNAVAILABLE');
  assert.equal(await worker.sweep(),false);assert.equal(calls,1);
 });
});


test('concurrent cleaners remove once and release incomplete reservation only after storage acknowledgment', {timeout:180000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);let calls=0,entered,release;
  await x.query("UPDATE uploads SET status='UPLOADING',completed_at=NULL,reserved_bytes=100 WHERE file_id=$1",x.fileId);
  await x.query("UPDATE file_custodies SET phase='reserved',operation_id=NULL,lease_until=NULL WHERE file_id=$1",x.fileId);
  const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),storage={remove:async()=>{calls++;entered();await gate;}};
  const first=await createCleanup(x,storage),second=await createCleanup(x,storage);await m.run();await waitLease(x);
  const one=first.sweep();await started;try{const during=await fileState(x);assert.equal(during.blob_deleted_at,null);assert.equal(String(during.reserved_bytes),'100');assert.equal(during.reservation_released_at,null);
   assert.equal(await second.sweep(),false);assert.equal(calls,1);
  }finally{release();}assert.equal(await one,true);const after=await fileState(x);assert.equal(after.phase,'deleted');assert.ok(after.blob_deleted_at);assert.equal(String(after.reserved_bytes),'0');assert.ok(after.reservation_released_at);
 });
});


test('unexpected database failure is sanitized without exposing driver details',async()=>{
 const {createFoxyPublicationCleanup}=await import("../publication-cleanup.ts");let calls=0;
 const worker=createFoxyPublicationCleanup({database:{$transaction:async()=>{throw Error('synthetic sensitive driver diagnostic');}},storage:{remove:async()=>{calls++;}}});
 await assert.rejects(worker.sweep(),error=>error?.code==='SERVICE_UNAVAILABLE'&&!String(error.message).includes('synthetic sensitive driver diagnostic'));assert.equal(calls,0);
});


async function seedHistoricalDiscard(x){
 await x.query("UPDATE file_custodies SET phase='deleting',operation_id=$2,lease_until=clock_timestamp()-interval '1 minute' WHERE file_id=$1",x.fileId,randomUUID());
 await x.query("UPDATE foxy_publications SET state='DISCARDED',discarded_at=clock_timestamp()-interval '5 minutes',lease_nonce=NULL,lease_until=NULL,revision=revision+1 WHERE id=$1",x.publication.id);
}

test('historical reference claims candidate and records conflict without removing bytes', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);let calls=0;
  await x.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,deleted_at) VALUES($1,now(),$2,'Synthetic',$3,$4,now())`,randomUUID(),x.f.rooms.teach.id,x.fileId,x.f.teacherActor);
  await seedHistoricalDiscard(x);const worker=await createCleanup(x,{remove:async()=>{calls++;}});assert.equal(await worker.sweep(),true);
  const row=await fileState(x);assert.equal(calls,0);assert.equal(row.cleanup_error_code,'REFERENCE_CONFLICT');assert.equal(row.blob_deleted_at,null);assert.equal(row.phase,'deleting');
 });
});

test('cleanup fails closed when artifact size disagrees with the file', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{artifactSize:101});let calls=0;
  await seedHistoricalDiscard(x);const worker=await createCleanup(x,{remove:async()=>{calls++;}});await worker.sweep();const row=await fileState(x);
  assert.equal(calls,0);assert.equal(row.blob_deleted_at,null);assert.equal(row.phase,'deleting');
 });
});


test('cleanup fails closed when file is not a PDF', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{extension:'docx'});let calls=0;
  await seedHistoricalDiscard(x);const worker=await createCleanup(x,{remove:async()=>{calls++;}});await worker.sweep();const row=await fileState(x);
  assert.equal(calls,0);assert.equal(row.blob_deleted_at,null);assert.equal(row.phase,'deleting');
 });
});


test('shutdown drains actual synthetic storage remove and its database acknowledgment', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await seedHistoricalDiscard(x);let entered,release,calls=0;
  const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),worker=await createCleanup(x,{remove:async()=>{calls++;entered();await gate;}});
  const sweeping=worker.sweep();await started;let closed=false;const stopping=worker.onModuleDestroy().then(()=>{closed=true;});await Promise.resolve();assert.equal(closed,false);
  const before=await fileState(x);assert.equal(before.phase,'deleting');assert.equal(before.blob_deleted_at,null);release();assert.equal(await sweeping,true);await stopping;
  const after=await fileState(x);assert.equal(after.phase,'deleted');assert.ok(after.blob_deleted_at);assert.equal(await worker.sweep(),false);assert.equal(calls,1);
 });
});
