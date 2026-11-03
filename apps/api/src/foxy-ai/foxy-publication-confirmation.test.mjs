import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';
const hash='a'.repeat(64),digest='b'.repeat(64);
async function fixture(pool,{classroomContext=false}={}){
  const [{createFoxyPublicationCompletion},{createFoxyPublicationQueue},{createFoxyPublicationRepository},{createFoxyResourceRepository},
    {createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([import('./publication-completion.ts'),import('./publication-queue.ts'),
      import('./publication-repository.ts'),import('./resource-repository.ts'),import('./conversation-repository.ts'),import('./turn-repository.ts')]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),tx={query},context=classroomContext?{kind:'CLASSROOM',classroomId:f.rooms.archived.id}:{kind:'GENERAL'};
  if(classroomContext)await query('UPDATE classrooms SET archived_at=NULL WHERE id=$1',f.rooms.archived.id);
  const conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:classroomContext?{units:[],selectedTopicIds:[]}:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
    JSON.stringify({schemaVersion:'foxy-answer-v1',title:'Recurso',markdown:'Texto',references:[],warnings:[],missingInformation:[]}));
  const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
  const {publication}=await createFoxyPublicationRepository().prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:resource.revision,
    classroomId:f.rooms.teach.id,title:'Material',unitId:null,topicId:null});
  const lease=await createFoxyPublicationQueue({database}).claim(),fileId=randomUUID();
  await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'foxy-ai.pdf','pdf','application/pdf',100,'APPROVED','CLEAN',now(),now())`,
    fileId,f.rooms.teach.id,f.teacherActor,`synthetic/${fileId}`);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',0,now())",randomUUID(),fileId);
  await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",fileId,digest);
  await query(`UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=100,artifact_page_count=2,renderer_version='foxy-text-pdf-v1' WHERE id=$1`,publication.id,fileId,digest);
  return {query,f,database,completion:createFoxyPublicationCompletion({database}),lease,publication,fileId,conversation,resource,resources};
}


async function confirmation(x){
 const [{createFoxyPublicationConfirmationRepository},{createFoxyFileOperations},{FileStore}]=await Promise.all([
  import('./publication-confirmation-repository.ts'),import('../foxy-file-integration.ts'),import('../files/store.ts')]);
 const files=new FileStore(x.database,{authenticate:async(_tx,req)=>req.id,authorize:async()=>{}},100000n);
 const {publishMaterial}=createFoxyFileOperations({store:files});
 const confirmations=createFoxyPublicationConfirmationRepository({library:{publish:publishMaterial}});
 const [pub]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id);
 const [room]=await x.query('SELECT revision FROM classrooms WHERE id=$1',x.f.rooms.teach.id);
 const input={requestId:randomUUID(),publicationRevision:String(pub.revision),classroomRevision:String(room.revision),confirm:true},request={id:x.f.teacherActor};
 const run=(body=input,publicationId=x.publication.id,actor=x.f.teacherActor)=>x.database.$transaction(raw=>confirmations.confirm({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},request,actor,publicationId,body));
 return {confirmations,input,request,run};
}
test('READY confirmation atomically publishes and replays the identical receipt', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);assert.equal(await x.completion.finish(x.lease,{state:'READY'}),true);const c=await confirmation(x);
  const receipt=await c.run();assert.deepEqual(Object.keys(receipt).sort(),['classroomRevision','materialId','publicationId','publicationRevision'].sort());
  assert.equal(receipt.publicationId,x.publication.id);assert.equal(receipt.classroomRevision,String(BigInt(c.input.classroomRevision)+1n));
  assert.equal(receipt.publicationRevision,String(BigInt(c.input.publicationRevision)+1n));assert.deepEqual(await c.run(),receipt);
  const [pub]=await x.query('SELECT state,material_id FROM foxy_publications WHERE id=$1',x.publication.id);assert.equal(pub.state,'PUBLISHED');assert.equal(pub.material_id,receipt.materialId);
  const [material]=await x.query('SELECT file_id,deleted_at FROM materials WHERE id=$1',receipt.materialId);assert.equal(material.file_id,x.fileId);assert.equal(material.deleted_at,null);
  const [n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);assert.equal(n.n,1);
 });
});
test('failed outer transaction rolls back publication, material and both revisions', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});const c=await confirmation(x);
  await assert.rejects(x.database.$transaction(async raw=>{await c.confirmations.confirm({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},c.request,x.f.teacherActor,x.publication.id,c.input);throw Error('synthetic rollback');}));
  const [p]=await x.query('SELECT state,revision FROM foxy_publications WHERE id=$1',x.publication.id),[r]=await x.query('SELECT revision FROM classrooms WHERE id=$1',x.f.rooms.teach.id),[n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);
  assert.equal(p.state,'READY');assert.equal(String(p.revision),c.input.publicationRevision);assert.equal(String(r.revision),c.input.classroomRevision);assert.equal(n.n,0);
  const receipt=await c.run();assert.ok(receipt.materialId);
 });
});
test('concurrent same request replays, changed body or different new request conflicts', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});const c=await confirmation(x);
  const [a,b]=await Promise.all([c.run(),c.run()]);assert.deepEqual(a,b);
  await assert.rejects(c.run({...c.input,classroomRevision:String(BigInt(c.input.classroomRevision)+1n)}),e=>e?.code==='CONFLICT');
  await assert.rejects(c.run({...c.input,requestId:randomUUID()}),e=>e?.code==='CONFLICT');
  const [n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);assert.equal(n.n,1);
 });
});

test('new confirmation rejects stale revisions and another actor without any writes', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});const c=await confirmation(x);
  for(const input of [{...c.input,publicationRevision:'999'},{...c.input,classroomRevision:'999'}])await assert.rejects(c.run(input));
  await assert.rejects(c.run(c.input,x.publication.id,x.f.other));
  const [p]=await x.query('SELECT state,revision FROM foxy_publications WHERE id=$1',x.publication.id),[r]=await x.query('SELECT revision FROM classrooms WHERE id=$1',x.f.rooms.teach.id),[n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);
  assert.equal(p.state,'READY');assert.equal(String(p.revision),c.input.publicationRevision);assert.equal(String(r.revision),c.input.classroomRevision);assert.equal(n.n,0);
 });
});

test('replay survives later resource edits and destination archive but denies deleted material', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});const c=await confirmation(x),receipt=await c.run();
  await x.resources.edit({query:x.query},x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Modificado',markdown:'Nuevo'});
  await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',x.f.rooms.teach.id);assert.deepEqual(await c.run(),receipt);
  await x.query('UPDATE materials SET deleted_at=clock_timestamp() WHERE id=$1',receipt.materialId);await assert.rejects(c.run(),e=>e?.code==='NOT_FOUND');
  const [n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);assert.equal(n.n,1);
 });
});

test('changed or unclean file proof prevents a new confirmation without side effects', {timeout:120000},async()=>{
 for(const cause of ['scan','validation','upload','mime'])await withAgendaDatabase(async({pool})=>{
  const x=await fixture(pool);assert.equal(await x.completion.finish(x.lease,{state:'READY'}),true);const c=await confirmation(x);
  if(cause==='scan')await x.query("UPDATE files SET scan_status='ERROR' WHERE id=$1",x.fileId);
  if(cause==='validation')await x.query("UPDATE files SET validation_status='REJECTED' WHERE id=$1",x.fileId);
  if(cause==='upload')await x.query("UPDATE uploads SET status='FAILED',completed_at=NULL WHERE file_id=$1",x.fileId);
  if(cause==='mime')await x.query("UPDATE files SET detected_mime_type='image/png' WHERE id=$1",x.fileId);
  await assert.rejects(c.run(),undefined,cause);
  const [p]=await x.query('SELECT state,revision FROM foxy_publications WHERE id=$1',x.publication.id),[n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);
  assert.equal(p.state,'READY',cause);assert.equal(String(p.revision),c.input.publicationRevision,cause);assert.equal(n.n,0,cause);
 });
});

test('bound publication and custody digests are immutable before confirmation', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);assert.equal(await x.completion.finish(x.lease,{state:'READY'}),true);const c=await confirmation(x);
  await assert.rejects(x.query('UPDATE foxy_publications SET artifact_digest=$2 WHERE id=$1',x.publication.id,'c'.repeat(64)),e=>e.code==='23514');
  await assert.rejects(x.query('UPDATE file_custodies SET digest=$2,validated_digest=$2,scanned_digest=$2 WHERE file_id=$1',x.fileId,'c'.repeat(64)),e=>e.code==='23514');
  await assert.rejects(x.query('UPDATE files SET size_bytes=101 WHERE id=$1',x.fileId),e=>e.code==='23514');
  const receipt=await c.run();assert.ok(receipt.materialId);
 });
});

test('new confirmation rejects edited resource, revoked teacher, archived destination and deleted conversation', {timeout:120000},async()=>{
 for(const cause of ['resource','teacher','archive','conversation'])await withAgendaDatabase(async({pool})=>{
  const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});const c=await confirmation(x);
  if(cause==='resource')await x.resources.edit({query:x.query},x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Nuevo',markdown:'Nuevo'});
  if(cause==='teacher')await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',x.f.teacherActor);
  if(cause==='archive')await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',x.f.rooms.teach.id);
  if(cause==='conversation')await x.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1',x.conversation.id);
  await assert.rejects(c.run(),undefined,cause);const [n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);assert.equal(n.n,0,cause);
 });
});

test('different concurrent confirmation keys allow only one commit', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});const c=await confirmation(x);
  const results=await Promise.allSettled([c.run(),c.run({...c.input,requestId:randomUUID()})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.filter(r=>r.status==='rejected').length,1);
  const [n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);assert.equal(n.n,1);
 });
});


test('distinct source classroom permission is checked on confirmation and replay', {timeout:120000},async()=>{
 for(const phase of ['new','replay'])await withAgendaDatabase(async({pool})=>{
  const x=await fixture(pool,{classroomContext:true});await x.completion.finish(x.lease,{state:'READY'});const c=await confirmation(x);
  if(phase==='replay')await c.run();
  await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1',x.f.rooms.archived.id);
  if(phase==='replay')assert.ok(await c.run());
  await x.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1',x.conversation.id);
  await assert.rejects(c.run(),undefined,phase);
  const [n]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.fileId);assert.equal(n.n,phase==='replay'?1:0);
 });
});
