import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const hash='a'.repeat(64),digest='b'.repeat(64);
async function fixture(pool,{artifactDigest=digest,removed=false}={}){
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
  await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'foxy-ai.pdf','pdf','application/pdf',100,'APPROVED','CLEAN',now(),now())`,
    fileId,f.rooms.teach.id,f.teacherActor,`synthetic/${fileId}`);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',0,now())",randomUUID(),fileId);
  await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",fileId,digest);
  if(removed){await query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,deleted_at) VALUES($1,now(),$2,'Tombstone sintético',$3,$4,now())`,randomUUID(),f.rooms.teach.id,fileId,f.teacherActor);await query('UPDATE files SET blob_deleted_at=clock_timestamp() WHERE id=$1',fileId);}
  await query(`UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=100,artifact_page_count=2,renderer_version='foxy-text-pdf-v1' WHERE id=$1`,publication.id,fileId,artifactDigest);
  return {query,f,database,completion:createFoxyPublicationCompletion({database}),lease,publication,fileId,conversation,resource,resources};
}

test('READY requires database-backed clean file proof and completes once without publication', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);assert.equal(await x.completion.finish(x.lease,{state:'READY'}),true);
    assert.equal(await x.completion.finish(x.lease,{state:'READY'}),false);
    const [row]=await x.query('SELECT state,lease_nonce,lease_until FROM foxy_publications WHERE id=$1::uuid',x.publication.id);
    assert.equal(row.state,'READY');assert.equal(row.lease_nonce,null);assert.equal(row.lease_until,null);
    const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
  });
});

test('forged or expired lease and unready or changed proof cannot complete READY', {timeout:120000},async()=>{
  for(const cause of ['nonce','expiry','scan','digest','upload','source','user','classroom'])await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool,{artifactDigest:cause==='digest'?'c'.repeat(64):digest}),lease=cause==='nonce'?{...x.lease,leaseNonce:randomUUID()}:x.lease;
    if(cause==='expiry')await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",x.publication.id);
    if(cause==='scan')await x.query("UPDATE files SET scan_status='ERROR' WHERE id=$1::uuid",x.fileId);
    if(cause==='upload')await x.query("UPDATE uploads SET status='FAILED',completed_at=NULL WHERE file_id=$1::uuid",x.fileId);
    if(cause==='source')await x.resources.edit({query:x.query},x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Nuevo',markdown:'Cambió'});
    if(cause==='user')await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid',x.f.teacherActor);
    if(cause==='classroom')await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid',x.f.rooms.teach.id);
    let result,error;try{result=await x.completion.finish(lease,{state:'READY'});}catch(e){error=e;}if(!error)assert.equal(result,false,cause);
    const [row]=await x.query('SELECT state FROM foxy_publications WHERE id=$1::uuid',x.publication.id);assert.notEqual(row.state,'READY',cause);
    const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
  });
});

test('FAILED closes an existing lease even after user permission is revoked', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid',x.f.teacherActor);
    assert.equal(await x.completion.finish(x.lease,{state:'FAILED',errorCode:'FILE_NOT_READY'}),true);
    assert.equal(await x.completion.finish(x.lease,{state:'FAILED',errorCode:'FILE_NOT_READY'}),false);
    const [row]=await x.query('SELECT state,error_code FROM foxy_publications WHERE id=$1::uuid',x.publication.id);assert.equal(row.state,'FAILED');assert.equal(row.error_code,'FILE_NOT_READY');
  });
});

test('READY cannot accept caller-supplied proof to bypass database custody', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool);await x.query("UPDATE files SET scan_status='ERROR' WHERE id=$1::uuid",x.fileId);
    let result,error;try{result=await x.completion.finish(x.lease,{state:'READY',proof:{fileId:x.fileId,digest,ready:true}});}catch(e){error=e;}
    if(!error)assert.equal(result,false);const [row]=await x.query('SELECT state FROM foxy_publications WHERE id=$1::uuid',x.publication.id);assert.notEqual(row.state,'READY');
  });
});

test('READY cannot complete when the associated blob was removed', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool,{removed:true});
    let result,error;try{result=await x.completion.finish(x.lease,{state:'READY'});}catch(e){error=e;}
    if(!error)assert.equal(result,false);const [row]=await x.query('SELECT state FROM foxy_publications WHERE id=$1::uuid',x.publication.id);
    assert.notEqual(row.state,'READY');
  });
});
