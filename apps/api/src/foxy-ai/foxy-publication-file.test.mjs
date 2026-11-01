import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';
const hash='a'.repeat(64),bytes=Buffer.from('%PDF-synthetic-publication'),digest=createHash('sha256').update(bytes).digest('hex');
async function fixture(pool){
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
  await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'foxy-ai.pdf','pdf','application/pdf',$5,'APPROVED','CLEAN',now(),now())`,
    fileId,f.rooms.teach.id,f.teacherActor,`synthetic/${fileId}`,bytes.length);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',0,now())",randomUUID(),fileId);
  await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",fileId,digest);
  await query(`UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=$4,artifact_page_count=2,renderer_version='foxy-text-pdf-v1' WHERE id=$1`,publication.id,fileId,digest,bytes.length);
  return {query,f,database,completion:createFoxyPublicationCompletion({database}),lease,publication,fileId,conversation,resource,resources};
}


async function reader(x,onRead){
 const [{createFoxyUnitOfWork},{createFoxyPublicationFileReader}]=await Promise.all([import('./unit-of-work.ts'),import('./publication-file-reader.ts')]);
 const uow=createFoxyUnitOfWork({database:x.database,authenticate:async(_tx,request)=>{if(request.revoked)throw Object.assign(Error(),{code:'AUTH_REQUIRED'});return request.id;}}),calls=[];
 const files={read:async(request,id,mode)=>{calls.push({request,id,mode});return {bytes:await (onRead?.()??bytes),headers:{'Content-Type':'application/pdf','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}};}};
 return {reader:createFoxyPublicationFileReader({uow,files}),calls};
}
test('ready PDF is read under real request and returned with safe headers', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);assert.equal(await x.completion.finish(x.lease,{state:'READY'}),true);const {reader:r,calls}=await reader(x),request={id:x.f.teacherActor};
  for(const mode of ['preview','download']){const result=await r.readFile(request,x.publication.id,mode);assert.deepEqual(Buffer.from(result.bytes),bytes);assert.equal(result.headers['Cache-Control'],'no-store');assert.equal(result.headers['X-Content-Type-Options'],'nosniff');assert.equal(result.headers.Location,undefined);}
  assert.equal(calls.length,2);assert.equal(calls[0].request,request);assert.equal(calls[0].id,x.fileId);
 });
});
test('read denies not-ready, foreign, tampered bytes and revocation during read', {timeout:120000},async()=>{
 for(const cause of ['preparing','foreign','tamper','revoked','conversation','artifact'])await withAgendaDatabase(async({pool})=>{
  const x=await fixture(pool);if(cause!=='preparing')await x.completion.finish(x.lease,{state:'READY'});const request={id:cause==='foreign'?x.f.other:x.f.teacherActor};
  const {reader:r,calls}=await reader(x,async()=>{if(cause==='revoked')request.revoked=true;if(cause==='conversation')await x.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1',x.conversation.id);
    if(cause==='artifact')await x.query('UPDATE foxy_publications SET artifact_digest=$2 WHERE id=$1',x.publication.id,'c'.repeat(64));return cause==='tamper'?Buffer.alloc(bytes.length,1):bytes;});
  await assert.rejects(r.readFile(request,x.publication.id,'preview'));assert.equal(calls.length,['preparing','foreign'].includes(cause)?0:1,cause);
 });
});

test('private reader works with real FileService and synthetic storage outside the UoW', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});
  const [{createFoxyUnitOfWork},{createFoxyPublicationFileReader},{FileService}]=await Promise.all([import('./unit-of-work.ts'),import('./publication-file-reader.ts'),import('../files/service.ts')]);
  let reads=0;const files=new FileService({database:x.database,access:{authenticate:async(_tx,req)=>req.id,authorize:async()=>{}},
   storage:{get:async()=>{reads++;return Buffer.from(bytes);},put:async()=>{throw Error('unexpected');},remove:async()=>{throw Error('unexpected');}},scanner:{scan:async()=>{throw Error('unexpected');}},draftQuotaBytes:100000n});
  const uow=createFoxyUnitOfWork({database:x.database,authenticate:async(_tx,req)=>req.id}),r=createFoxyPublicationFileReader({uow,files});
  const result=await r.readFile({id:x.f.teacherActor},x.publication.id,'preview');assert.deepEqual(Buffer.from(result.bytes),bytes);assert.equal(reads,1);
 });
});

test('unexpected storage failures are sanitized without exposing private details', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});
  const {reader:r}=await reader(x,async()=>{throw Error('synthetic storage private detail');});
  await assert.rejects(r.readFile({id:x.f.teacherActor},x.publication.id,'preview'),error=>error?.code==='SERVICE_UNAVAILABLE'&&!String(error.message).includes('private detail'));
 });
});

test('resource binding cannot be changed during storage read', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});
  const [{createFoxyConversationRepository},{createFoxyTurnRepository},{createFoxyResourceRepository}]=await Promise.all([import('./conversation-repository.ts'),import('./turn-repository.ts'),import('./resource-repository.ts')]);
  const tx={query:x.query},context={kind:'GENERAL'},conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
  const {conversation}=await conversations.create(tx,x.f.teacherActor,{requestId:randomUUID(),title:'Otra',context},hash);
  const {turn}=await turns.enqueue(tx,x.f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Otro',selection:{topicIds:[],sourceIds:[]}},
   {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await x.query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1",turn.id,JSON.stringify({schemaVersion:'foxy-answer-v1',title:'Otro',markdown:'Texto',references:[],warnings:[],missingInformation:[]}));
  const {resource}=await resources.fromTurn(tx,x.f.teacherActor,conversation.id,turn.id);
  const {reader:r}=await reader(x,async()=>{await assert.rejects(x.query('UPDATE foxy_publications SET resource_id=$2 WHERE id=$1',x.publication.id,resource.id),e=>e.code==='23514');return bytes;});
  const result=await r.readFile({id:x.f.teacherActor},x.publication.id,'preview');assert.deepEqual(Buffer.from(result.bytes),Buffer.from(bytes));
 });
});

test('published material deleted during real storage read returns opaque NOT_FOUND', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.completion.finish(x.lease,{state:'READY'});
  const [{createFoxyUnitOfWork},{createFoxyPublicationFileReader},{createFoxyPublicationConfirmationRepository},{createLibraryMaterialPublisher},{FileService},{createFileAccess}]=await Promise.all([
   import('./unit-of-work.ts'),import('./publication-file-reader.ts'),import('./publication-confirmation-repository.ts'),import('../classrooms/public/index.ts'),import('../files/service.ts'),import('../files/access.ts')]);
  let materialId;const access=createFileAccess({authenticate:async(_tx,req)=>req.id,authorizeAttemptWrite:async()=>{throw Error('unexpected');}});
  const files=new FileService({database:x.database,access,storage:{get:async()=>{await x.query('UPDATE materials SET deleted_at=clock_timestamp() WHERE id=$1',materialId);return Buffer.from(bytes);},put:async()=>{throw Error('unexpected');},remove:async()=>{throw Error('unexpected');}},scanner:{scan:async()=>{throw Error('unexpected');}},draftQuotaBytes:100000n});
  const uow=createFoxyUnitOfWork({database:x.database,authenticate:async(_tx,req)=>req.id}),request={id:x.f.teacherActor},repo=createFoxyPublicationConfirmationRepository({library:createLibraryMaterialPublisher({files:files.store})});
  const [p]=await x.query('SELECT revision FROM foxy_publications WHERE id=$1',x.publication.id),[room]=await x.query('SELECT revision FROM classrooms WHERE id=$1',x.f.rooms.teach.id);
  const receipt=await uow.run(request,true,(tx,actor)=>repo.confirm(tx,request,actor.id,x.publication.id,{requestId:randomUUID(),publicationRevision:String(p.revision),classroomRevision:String(room.revision),confirm:true}));materialId=receipt.materialId;
  const r=createFoxyPublicationFileReader({uow,files});await assert.rejects(r.readFile(request,x.publication.id,'preview'),e=>e?.code==='NOT_FOUND');
 });
});
