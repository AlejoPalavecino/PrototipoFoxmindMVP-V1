import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const hash='a'.repeat(64),digest='b'.repeat(64);
async function fixture(pool,{withFile=true}={}){
  const [{createFoxyPublicationCompletion},{createFoxyPublicationQueue},{createFoxyPublicationRepository},{createFoxyResourceRepository},
    {createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([import("../publication-completion.ts"),import("../publication-queue.ts"),
      import("../publication-repository.ts"),import("../resource-repository.ts"),import("../conversation-repository.ts"),import("../turn-repository.ts")]);
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


async function management(x){const {createFoxyPublicationManagementRepository}=await import("../publication-management-repository.ts");const repository=createFoxyPublicationManagementRepository(),[p]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id);
 const input={requestId:randomUUID(),publicationRevision:String(p.revision),confirm:true};
 const run=(body=input,actor=x.f.teacherActor)=>x.database.$transaction(raw=>repository.discard({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},actor,x.publication.id,body));return {repository,input,run};}
test('discard with no file records immutable replay receipt and cannot resurrect', {timeout:120000},async()=>{await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{withFile:false}),m=await management(x);
 const receipt=await m.run();assert.deepEqual(Object.keys(receipt).sort(),['action','publicationId','publicationRevision']);assert.equal(receipt.action,'DISCARD');assert.equal(receipt.publicationRevision,String(BigInt(m.input.publicationRevision)+1n));assert.deepEqual(await m.run(),receipt);
 await assert.rejects(m.run({...m.input,publicationRevision:'99'}),e=>e?.code==='CONFLICT');const [p]=await x.query('SELECT state,discarded_at,lease_nonce,file_id FROM foxy_publications WHERE id=$1',x.publication.id);assert.equal(p.state,'DISCARDED');assert.ok(p.discarded_at);assert.equal(p.lease_nonce,null);assert.equal(p.file_id,null);
 });});
test('discard fences active custody, preserves file, reservation and proof, without storage I/O', {timeout:120000},async()=>{await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);
 const [before]=await x.query('SELECT c.digest,c.operation_id,u.reserved_bytes,u.reservation_released_at,f.blob_deleted_at FROM file_custodies c JOIN uploads u ON u.file_id=c.file_id JOIN files f ON f.id=c.file_id WHERE c.file_id=$1',x.fileId);
 const receipt=await m.run(),[after]=await x.query('SELECT c.phase,c.digest,c.operation_id,c.lease_until,u.reserved_bytes,u.reservation_released_at,f.blob_deleted_at FROM file_custodies c JOIN uploads u ON u.file_id=c.file_id JOIN files f ON f.id=c.file_id WHERE c.file_id=$1',x.fileId);
 assert.equal(after.phase,'deleting');assert.notEqual(after.operation_id,before.operation_id);assert.ok(after.lease_until);assert.equal(after.digest,before.digest);assert.equal(String(after.reserved_bytes),String(before.reserved_bytes));assert.equal(after.reservation_released_at,null);assert.equal(after.blob_deleted_at,null);
 assert.equal(await x.completion.finish(x.lease,{state:'READY'}),false);assert.deepEqual(await m.run(),receipt);
 });});
test('discard denies foreign owner and stale CAS, rollback restores publication and custody', {timeout:120000},async()=>{await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);
 await assert.rejects(m.run(m.input,x.f.other));await assert.rejects(m.run({...m.input,publicationRevision:'999'}));
 await assert.rejects(x.database.$transaction(async raw=>{await m.repository.discard({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},x.f.teacherActor,x.publication.id,m.input);throw Error('rollback');}));
 const [p]=await x.query('SELECT state,revision FROM foxy_publications WHERE id=$1',x.publication.id),[f]=await x.query('SELECT phase FROM file_custodies WHERE file_id=$1',x.fileId);assert.equal(p.state,'PREPARING');assert.equal(String(p.revision),m.input.publicationRevision);assert.equal(f.phase,'ready');
 });});

test('discard rejects existing live or tombstoned material reference without changing custody', {timeout:120000},async()=>{
 for(const deleted of [false,true])await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);
  await x.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,deleted_at)
   VALUES($1,now(),$2,'Synthetic',$3,$4,CASE WHEN $5 THEN now() ELSE NULL END)`,randomUUID(),x.f.rooms.teach.id,x.fileId,x.f.teacherActor,deleted);
  await assert.rejects(m.run(),e=>e?.code==='CONFLICT');const [p]=await x.query('SELECT state FROM foxy_publications WHERE id=$1',x.publication.id),[c]=await x.query('SELECT phase FROM file_custodies WHERE file_id=$1',x.fileId);
  assert.equal(p.state,'PREPARING');assert.equal(c.phase,'ready');
 });
});

test('discarded publication and file cannot be reset by direct SQL', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);await m.run();
  await assert.rejects(x.query("UPDATE foxy_publications SET state='PREPARING',discarded_at=NULL WHERE id=$1",x.publication.id));
  await assert.rejects(x.query("UPDATE file_custodies SET phase='ready' WHERE file_id=$1",x.fileId));
 });
});

test('discard immediately denies normal FileService read without releasing storage quota', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x),[{FileService},{createFileAccess}]=await Promise.all([import("../../../files/infrastructure/service.ts"),import("../../../files/infrastructure/access.ts")]);
  let reads=0;const files=new FileService({database:x.database,access:createFileAccess({authenticate:async(_tx,req)=>req.id,authorizeAttemptWrite:async()=>{throw Error('unexpected');}}),
   storage:{get:async()=>{reads++;return Buffer.alloc(100);},put:async()=>{throw Error('unexpected');},remove:async()=>{throw Error('unexpected');}},scanner:{scan:async()=>{throw Error('unexpected');}},draftQuotaBytes:100000n});
  const [before]=await x.query('SELECT size_bytes,blob_deleted_at FROM files WHERE id=$1',x.fileId);await m.run();
  await assert.rejects(files.read({id:x.f.teacherActor},x.fileId,'download'));assert.equal(reads,0);
  const [after]=await x.query('SELECT size_bytes,blob_deleted_at FROM files WHERE id=$1',x.fileId);assert.equal(String(after.size_bytes),String(before.size_bytes));assert.equal(after.blob_deleted_at,null);
 });
});

test('discard versus worker completion never revives a discarded publication', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);
  const [discard,finish]=await Promise.allSettled([m.run(),x.completion.finish(x.lease,{state:'READY'})]);
  const [p]=await x.query('SELECT state,revision FROM foxy_publications WHERE id=$1',x.publication.id);
  if(discard.status==='fulfilled'){assert.equal(p.state,'DISCARDED');assert.equal(await x.completion.finish(x.lease,{state:'READY'}),false);}
  else{assert.equal(finish.status,'fulfilled');assert.equal(finish.value,true);assert.equal(p.state,'READY');}
  const [n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);assert.equal(n.n,0);
 });
});

test('discard fences an admitted receiving operation and preserves its longer lease and reserved quota', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x),oldNonce=randomUUID();
  await x.query("UPDATE uploads SET status='UPLOADING',completed_at=NULL,reserved_bytes=100 WHERE file_id=$1",x.fileId);
  await x.query("UPDATE file_custodies SET phase='receiving',operation_id=$2,lease_until=clock_timestamp()+interval '3 minutes' WHERE file_id=$1",x.fileId,oldNonce);
  const [before]=await x.query('SELECT lease_until FROM file_custodies WHERE file_id=$1',x.fileId);await m.run();
  const [after]=await x.query('SELECT c.phase,c.operation_id,c.lease_until,u.reserved_bytes,u.reservation_released_at,f.blob_deleted_at FROM file_custodies c JOIN uploads u ON u.file_id=c.file_id JOIN files f ON f.id=c.file_id WHERE c.file_id=$1',x.fileId);
  assert.equal(after.phase,'deleting');assert.notEqual(after.operation_id,oldNonce);assert.ok(after.lease_until>=before.lease_until);assert.equal(String(after.reserved_bytes),'100');assert.equal(after.reservation_released_at,null);assert.equal(after.blob_deleted_at,null);
  const rows=await x.query("UPDATE file_custodies SET phase='ready' WHERE file_id=$1 AND operation_id=$2 RETURNING file_id",x.fileId,oldNonce);assert.equal(rows.length,0);
 });
});

test('real FileService receive in flight is fenced by discard without premature quota release', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{withFile:false}),m=await management(x),[{FileService},{createFileAccess},{createHash}]=await Promise.all([import("../../../files/infrastructure/service.ts"),import("../../../files/infrastructure/access.ts"),import('node:crypto')]);
  const bytes=Buffer.alloc(100,42),digest=createHash('sha256').update(bytes).digest('hex');let entered,release;const atStorage=new Promise(r=>entered=r),gate=new Promise(r=>release=r);let removes=0;
  await x.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes) VALUES($1,now(),$2,$3,$4,'foxy.pdf','pdf',100)`,x.fileId,x.f.rooms.teach.id,x.f.teacherActor,`synthetic/${x.fileId}`);
  await x.query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes) VALUES($1,now(),$2,'STARTED',100)",randomUUID(),x.fileId);
  await x.query("INSERT INTO file_custodies(file_id,purpose,phase) VALUES($1,'material','reserved')",x.fileId);
  await x.query("UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=100,artifact_page_count=1,renderer_version='foxy-text-pdf-v1' WHERE id=$1",x.publication.id,x.fileId,digest);
  const files=new FileService({database:x.database,access:createFileAccess({authenticate:async(_tx,req)=>req.id,authorizeAttemptWrite:async()=>{throw Error('unexpected');}}),
   storage:{put:async()=>{entered();await gate;},get:async()=>bytes,remove:async()=>{removes++;}},scanner:{scan:async()=>{}},draftQuotaBytes:100000n});
  const receiving=files.receive({id:x.f.teacherActor},x.fileId,bytes).then(()=>null,e=>e);await atStorage;let receipt;try{receipt=await m.run();}finally{release();}const result=await receiving;assert.ok(result instanceof Error);
  const [row]=await x.query('SELECT p.state,c.phase,u.reserved_bytes,u.reservation_released_at,f.blob_deleted_at FROM foxy_publications p JOIN file_custodies c ON c.file_id=p.file_id JOIN uploads u ON u.file_id=p.file_id JOIN files f ON f.id=p.file_id WHERE p.id=$1',x.publication.id);
  assert.equal(receipt.action,'DISCARD');assert.equal(row.state,'DISCARDED');assert.equal(row.phase,'deleting');assert.equal(String(row.reserved_bytes),'100');assert.equal(row.reservation_released_at,null);assert.equal(row.blob_deleted_at,null);assert.equal(removes,0);
 });
});

test('discarded custody cannot replace operation or shorten its live quiet lease', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);await m.run();
  const [before]=await x.query('SELECT phase,operation_id,lease_until FROM file_custodies WHERE file_id=$1',x.fileId);
  await assert.rejects(x.query("UPDATE file_custodies SET operation_id=$2,lease_until=clock_timestamp()+interval '1 second' WHERE file_id=$1",x.fileId,randomUUID()));
  const [after]=await x.query('SELECT phase,operation_id,lease_until FROM file_custodies WHERE file_id=$1',x.fileId);assert.equal(after.phase,'deleting');assert.equal(after.operation_id,before.operation_id);assert.equal(+after.lease_until,+before.lease_until);
 });
});

test('deleted discarded custody cannot return to deleting', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);await m.run();
  await x.query('UPDATE files SET blob_deleted_at=clock_timestamp() WHERE id=$1',x.fileId);
  await x.query("UPDATE file_custodies SET phase='deleted',operation_id=NULL,lease_until=NULL WHERE file_id=$1",x.fileId);
  await assert.rejects(x.query("UPDATE file_custodies SET phase='deleting',operation_id=$2,lease_until=clock_timestamp()+interval '1 minute' WHERE file_id=$1",x.fileId,randomUUID()));
  const [row]=await x.query('SELECT phase FROM file_custodies WHERE file_id=$1',x.fileId);assert.equal(row.phase,'deleted');
 });
});

test('discarded custody permits extending live lease only with same operation', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);await m.run();
  const [before]=await x.query('SELECT operation_id,lease_until FROM file_custodies WHERE file_id=$1',x.fileId);
  await x.query("UPDATE file_custodies SET lease_until=lease_until+interval '1 minute' WHERE file_id=$1 AND operation_id=$2",x.fileId,before.operation_id);
  const [after]=await x.query('SELECT operation_id,lease_until FROM file_custodies WHERE file_id=$1',x.fileId);assert.equal(after.operation_id,before.operation_id);assert.ok(after.lease_until>before.lease_until);
 });
});

test('deleted custody acknowledgment requires blob removed and clears operation and lease', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);await m.run();
  await assert.rejects(x.query("UPDATE file_custodies SET phase='deleted',operation_id=NULL,lease_until=NULL WHERE file_id=$1",x.fileId));
  await x.query('UPDATE files SET blob_deleted_at=clock_timestamp() WHERE id=$1',x.fileId);
  await assert.rejects(x.query("UPDATE file_custodies SET phase='deleted' WHERE file_id=$1",x.fileId));
  await x.query("UPDATE file_custodies SET phase='deleted',operation_id=NULL,lease_until=NULL WHERE file_id=$1",x.fileId);
  const [row]=await x.query('SELECT phase,operation_id,lease_until FROM file_custodies WHERE file_id=$1',x.fileId);assert.equal(row.phase,'deleted');assert.equal(row.operation_id,null);assert.equal(row.lease_until,null);
 });
});

test('expired quiet lease permits a fresh fenced deletion operation with at least 90 seconds', {timeout:150000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);await m.run();
  const [before]=await x.query('SELECT operation_id,lease_until FROM file_custodies WHERE file_id=$1',x.fileId);
  while(true){const [clock]=await x.query('SELECT clock_timestamp() AS now');const left=before.lease_until-clock.now;if(left<=0)break;await new Promise(r=>setTimeout(r,Math.min(left+50,10000)));}
  const next=randomUUID();await x.query("UPDATE file_custodies SET operation_id=$2,lease_until=clock_timestamp()+interval '91 seconds' WHERE file_id=$1",x.fileId,next);
  const [after]=await x.query('SELECT operation_id,lease_until,clock_timestamp() AS now FROM file_custodies WHERE file_id=$1',x.fileId);assert.equal(after.operation_id,next);assert.ok(after.lease_until-after.now>=90000);
 });
});

test('expired deletion lease cannot acknowledge deleted custody even after blob removal', {timeout:150000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),m=await management(x);await m.run();
  const [before]=await x.query('SELECT lease_until FROM file_custodies WHERE file_id=$1',x.fileId);await x.query('UPDATE files SET blob_deleted_at=clock_timestamp() WHERE id=$1',x.fileId);
  while(true){const [clock]=await x.query('SELECT clock_timestamp() AS now');const left=before.lease_until-clock.now;if(left<=0)break;await new Promise(r=>setTimeout(r,Math.min(left+50,10000)));}
  await assert.rejects(x.query("UPDATE file_custodies SET phase='deleted',operation_id=NULL,lease_until=NULL WHERE file_id=$1",x.fileId));
  const [row]=await x.query('SELECT phase FROM file_custodies WHERE file_id=$1',x.fileId);assert.equal(row.phase,'deleting');
 });
});
