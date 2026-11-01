import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';
const hash='a'.repeat(64),digest='b'.repeat(64);
async function fixture(pool,{withFile=true}={}){
  const [{createFoxyPublicationCompletion},{createFoxyPublicationQueue},{createFoxyPublicationRepository},{createFoxyResourceRepository},
    {createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([import('./publication-completion.ts'),import('./publication-queue.ts'),
      import('./publication-repository.ts'),import('./resource-repository.ts'),import('./conversation-repository.ts'),import('./turn-repository.ts')]);
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
 const x=await fixture(pool,options), {createFoxyPublicationManagementRepository}=await import('./publication-management-repository.ts');
 assert.equal(await x.completion.finish(x.lease,{state:'FAILED',errorCode:'FILE_NOT_READY'}),true);
 const [row]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id);
 const repository=createFoxyPublicationManagementRepository();assert.equal(typeof repository.retry,'function');const input={requestId:randomUUID(),publicationRevision:String(row.revision)};
 const run=(body=input,actor=x.f.teacherActor)=>x.database.$transaction(raw=>repository.retry({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},actor,x.publication.id,body));
 return {...x,repository,input,run};
}

test('retry without file is idempotent before CAS and preserves snapshot', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});
  const [before]=await x.query('SELECT * FROM foxy_publications WHERE id=$1',x.publication.id), receipt=await x.run();
  assert.deepEqual(Object.keys(receipt).sort(),['action','publicationId','publicationRevision']);assert.equal(receipt.action,'RETRY');assert.equal(receipt.publicationId,x.publication.id);
  assert.equal(receipt.publicationRevision,String(BigInt(x.input.publicationRevision)+1n));assert.deepEqual(await x.run(),receipt);
  await assert.rejects(x.run({...x.input,publicationRevision:'99'}),e=>e?.code==='CONFLICT');
  await assert.rejects(x.run({...x.input,requestId:randomUUID()}),e=>e?.code==='CONFLICT');
  const [after]=await x.query('SELECT * FROM foxy_publications WHERE id=$1',x.publication.id);assert.equal(after.state,'PREPARING');assert.equal(after.error_code,null);assert.equal(after.file_id,null);
  assert.equal(after.resource_id,before.resource_id);assert.equal(after.snapshot_markdown,before.snapshot_markdown);assert.equal(after.request_id,before.request_id);
 });
});

test('retry reuses READY file and reservation and old worker lease is fenced', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool),[before]=await x.query('SELECT p.file_id,p.artifact_digest,p.artifact_size_bytes,u.reserved_bytes FROM foxy_publications p JOIN uploads u ON u.file_id=p.file_id WHERE p.id=$1',x.publication.id);
  await x.run();const [after]=await x.query('SELECT p.file_id,p.artifact_digest,p.artifact_size_bytes,u.reserved_bytes FROM foxy_publications p JOIN uploads u ON u.file_id=p.file_id WHERE p.id=$1',x.publication.id);
  assert.deepEqual(after,before);assert.equal(await x.completion.finish(x.lease,{state:'READY'}),false);
  const [count]=await x.query('SELECT count(*)::int n FROM files WHERE id=$1',x.fileId);assert.equal(count.n,1);
 });
});

test('retry rejects stale source, archived destination and foreign owner without effects', {timeout:120000},async()=>{
 for(const scenario of ['source','archive','owner'])await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});
  if(scenario==='source')await x.resources.edit({query:x.query},x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Cambiado',markdown:'Texto'});
  if(scenario==='archive')await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',x.f.rooms.teach.id);
  await assert.rejects(x.run(x.input,scenario==='owner'?x.f.other:x.f.teacherActor));
  const [row]=await x.query('SELECT state,revision FROM foxy_publications WHERE id=$1',x.publication.id);assert.equal(row.state,'FAILED');assert.equal(String(row.revision),x.input.publicationRevision);
 });
});

test('retry and discard race cannot both transition the same revision', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false}),discard={...x.input,requestId:randomUUID(),confirm:true};
  const results=await Promise.allSettled([x.run(),x.database.$transaction(raw=>x.repository.discard({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},x.f.teacherActor,x.publication.id,discard))]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const [row]=await x.query('SELECT state,revision FROM foxy_publications WHERE id=$1',x.publication.id);
  assert.ok(['PREPARING','DISCARDED'].includes(row.state));assert.equal(String(row.revision),String(BigInt(x.input.publicationRevision)+1n));
 });
});


test('retry rejects nonretryable error codes without state change', {timeout:120000},async()=>{
 for(const error of ['AI_INPUT_LIMIT','INVALID_INPUT'])await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});
  await x.query('UPDATE foxy_publications SET error_code=$2 WHERE id=$1',x.publication.id,error);
  await assert.rejects(x.run(),e=>e?.code==='CONFLICT');const [row]=await x.query('SELECT state,revision,error_code FROM foxy_publications WHERE id=$1',x.publication.id);
  assert.equal(row.state,'FAILED');assert.equal(String(row.revision),x.input.publicationRevision);assert.equal(row.error_code,error);
 });
});

test('retry rejects referenced file without allocating or changing quota', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool);
  await x.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,deleted_at) VALUES($1,now(),$2,'Synthetic',$3,$4,now())`,randomUUID(),x.f.rooms.teach.id,x.fileId,x.f.teacherActor);
  await assert.rejects(x.run(),e=>e?.code==='CONFLICT');const [row]=await x.query('SELECT p.state,p.file_id,u.reserved_bytes FROM foxy_publications p JOIN uploads u ON u.file_id=p.file_id WHERE p.id=$1',x.publication.id);
  assert.equal(row.state,'FAILED');assert.equal(row.file_id,x.fileId);assert.equal(String(row.reserved_bytes),'0');
 });
});


async function attachReceivable(x,{status='STARTED',phase='reserved',active=false,released=false,compatible=true}={}){
 const {FOXY_PDF_RENDERER_VERSION}=await import('./pdf-renderer-version.ts');
 await x.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes) VALUES($1,now(),$2,$3,$4,'foxy.pdf','pdf',100)`,x.fileId,x.f.rooms.teach.id,x.f.teacherActor,`synthetic/${x.fileId}`);
 await x.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,reservation_released_at) VALUES($1,now(),$2,$3::"UploadStatus",100,CASE WHEN $4 THEN now() ELSE NULL END)`,randomUUID(),x.fileId,status,released);
 await x.query(`INSERT INTO file_custodies(file_id,purpose,phase,operation_id,lease_until) VALUES($1,'material',$2,$3,CASE WHEN $4 THEN clock_timestamp()+interval '3 minutes' ELSE NULL END)`,x.fileId,phase,active?randomUUID():null,active);
 await x.query('UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=100,artifact_page_count=2,renderer_version=$4 WHERE id=$1',x.publication.id,x.fileId,digest,compatible?FOXY_PDF_RENDERER_VERSION:'foxy-text-pdf-v1');
}

test('retry reuses receivable file, complete artifact descriptor and reserved quota', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});await attachReceivable(x);
  const sql='SELECT p.file_id,p.artifact_digest,p.artifact_size_bytes,p.artifact_page_count,p.renderer_version,u.reserved_bytes,u.reservation_released_at FROM foxy_publications p JOIN uploads u ON u.file_id=p.file_id WHERE p.id=$1';
  const [before]=await x.query(sql,x.publication.id),receipt=await x.run(),[after]=await x.query(sql,x.publication.id);assert.deepEqual(after,before);assert.equal(receipt.action,'RETRY');assert.equal(String(after.reserved_bytes),'100');
  const [n]=await x.query('SELECT count(*)::int n FROM uploads WHERE file_id=$1',x.fileId);assert.equal(n.n,1);
 });
});

test('retry refuses a busy receivable or incompatible renderer without releasing quota', {timeout:120000},async()=>{
 for(const options of [{phase:'receiving',status:'UPLOADING',active:true},{compatible:false}])await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});await attachReceivable(x,options);
  await assert.rejects(x.run(),e=>e?.code==='CONFLICT');const [row]=await x.query('SELECT p.state,p.file_id,u.reserved_bytes FROM foxy_publications p JOIN uploads u ON u.file_id=p.file_id WHERE p.id=$1',x.publication.id);
  assert.equal(row.state,'FAILED');assert.equal(row.file_id,x.fileId);assert.equal(String(row.reserved_bytes),'100');
 });
});

test('retry receipt remains stable after discard and cannot revive publication', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false}),receipt=await x.run();
  await x.database.$transaction(raw=>x.repository.discard({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},x.f.teacherActor,x.publication.id,{requestId:randomUUID(),publicationRevision:receipt.publicationRevision,confirm:true}));
  assert.deepEqual(await x.run(),receipt);const [row]=await x.query('SELECT state FROM foxy_publications WHERE id=$1',x.publication.id);assert.equal(row.state,'DISCARDED');
 });
});

test('a later FAILED attempt needs a fresh request and current revision', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false}),first=await x.run(),{createFoxyPublicationQueue}=await import('./publication-queue.ts');
  const lease=await createFoxyPublicationQueue({database:x.database}).claim();assert.ok(lease);assert.equal(await x.completion.finish(lease,{state:'FAILED',errorCode:'FILE_NOT_READY'}),true);
  assert.deepEqual(await x.run(),first);await assert.rejects(x.run({...x.input,requestId:randomUUID()}),e=>e?.code==='CONFLICT');
  const [row]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id),second=await x.run({requestId:randomUUID(),publicationRevision:String(row.revision)});
  assert.equal(second.action,'RETRY');assert.equal(second.publicationId,first.publicationId);assert.notEqual(second.publicationRevision,first.publicationRevision);
 });
});


test('retry rejects rejected custody and released reservation', {timeout:120000},async()=>{
 for(const options of [{phase:'rejected',status:'FAILED'},{released:true}])await withAgendaDatabase(async({pool})=>{const x=await setup(pool,{withFile:false});await attachReceivable(x,options);
  await assert.rejects(x.run(),e=>e?.code==='CONFLICT');const [row]=await x.query('SELECT state,file_id,revision FROM foxy_publications WHERE id=$1',x.publication.id);
  assert.equal(row.state,'FAILED');assert.equal(row.file_id,x.fileId);assert.equal(String(row.revision),x.input.publicationRevision);
 });
});
