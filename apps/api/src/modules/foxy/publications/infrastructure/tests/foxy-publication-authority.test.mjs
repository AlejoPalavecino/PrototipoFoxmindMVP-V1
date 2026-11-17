import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { transactionDatabase } from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const hash='a'.repeat(64),meta={digest:'b'.repeat(64),sizeBytes:100,pageCount:2,rendererVersion:'foxy-text-pdf-v1'};
async function fixture(pool){
  const [{createFoxyPublicationAuthority},{createFoxyPublicationQueue},{createFoxyPublicationRepository},{createFoxyResourceRepository},
    {createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([import("../../../../../bootstrap/foxy-service-factories.ts"),import("../publication-queue.ts"),
      import("../publication-repository.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../conversations/infrastructure/conversation-repository.ts"),import("../../../turns/infrastructure/turn-repository.ts")]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),tx={query};
  const context={kind:'GENERAL'},conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
    JSON.stringify({schemaVersion:'foxy-answer-v1',title:'Recurso',markdown:'Texto revisado',references:[],warnings:[],missingInformation:[]}));
  const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
  const {publication}=await createFoxyPublicationRepository().prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:resource.revision,
    classroomId:f.rooms.teach.id,title:'Material',unitId:null,topicId:null});
  const lease=await createFoxyPublicationQueue({database}).claim();assert.equal(lease.publicationId,publication.id);
  const authority=createFoxyPublicationAuthority({database});
  async function associate(){const fileId=randomUUID(),upload=randomUUID();
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes)
      VALUES($1,now(),$2,$3,$4,'foxy-ai.pdf','pdf',100)`,fileId,f.rooms.teach.id,f.teacherActor,`synthetic/${fileId}`);
    await query('INSERT INTO uploads(id,updated_at,file_id,reserved_bytes) VALUES($1,now(),$2,100)',upload,fileId);
    await query("INSERT INTO file_custodies(file_id,purpose,target_id) VALUES($1,'material',NULL)",fileId);
    await query(`UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=100,artifact_page_count=2,renderer_version=$4 WHERE id=$1`,publication.id,fileId,meta.digest,meta.rendererVersion);
    return fileId;
  }
  return {query,f,database,authority,lease,publication,conversation,resource,resources,associate};
}

test('scope grants derive from database and reject forged, copied or foreign capabilities', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),controller=new AbortController(),signal=controller.signal,scope=await x.authority.open(x.lease,signal);
    assert.deepEqual(scope.snapshot,{title:'Recurso',markdown:'Texto revisado'});
    const granted=await x.authority.authorize(scope.capability,signal);assert.equal(granted.ownerId,x.f.teacherActor);assert.equal(granted.publicationId,x.publication.id);
    await assert.rejects(x.authority.authorize({},signal));await assert.rejects(x.authority.authorize(structuredClone(scope.capability),signal));
    const foreign=(await import("../../../../../bootstrap/foxy-service-factories.ts")).createFoxyPublicationAuthority({database:x.database});await assert.rejects(foreign.authorize(scope.capability,signal));
    await assert.rejects(x.authority.createFileCapability(scope.capability,signal));
    const fileId=await x.associate(), grant=await x.authority.createFileCapability(scope.capability,signal);
    const file=await x.authority.authorizeFile(grant.capability,signal);assert.equal(file.fileId,fileId);assert.equal(file.digest,meta.digest);assert.equal(file.ownerId,x.f.teacherActor);
    if(grant.descriptor)try{grant.descriptor.fileId=randomUUID();}catch{}
    assert.equal((await x.authority.authorizeFile(grant.capability,signal)).fileId,fileId);
    x.authority.close(scope);await assert.rejects(x.authority.authorize(scope.capability,signal));await assert.rejects(x.authority.authorizeFile(grant.capability,signal));
  });
});

test('original abort signal and live lease, user, classroom and source fence every authorization', {timeout:120000},async()=>{
  for(const cause of ['abort','nonce','expiry','user','classroom','conversation','resource'])await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool),controller=new AbortController(),scope=await x.authority.open(x.lease,controller.signal);
    if(cause==='abort')controller.abort();
    if(cause==='nonce')await x.query('UPDATE foxy_publications SET lease_nonce=$2::uuid WHERE id=$1::uuid',x.publication.id,randomUUID());
    if(cause==='expiry')await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",x.publication.id);
    if(cause==='user')await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid',x.f.teacherActor);
    if(cause==='classroom')await x.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid',x.f.rooms.teach.id);
    if(cause==='conversation')await x.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1::uuid',x.conversation.id);
    if(cause==='resource')await x.resources.edit({query:x.query},x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Nuevo',markdown:'Cambio'});
    await assert.rejects(x.authority.authorize(scope.capability,cause==='abort'?new AbortController().signal:controller.signal));x.authority.close(scope);
  });
});

test('authorization using caller transaction never opens a nested transaction', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),signal=new AbortController().signal,fileId=await x.associate();let transactions=0, forbidden=false;
    const guarded={$transaction:async fn=>{if(forbidden)throw Error('nested transaction');transactions++;return x.database.$transaction(fn);}};
    const {createFoxyPublicationAuthority}=await import("../../../../../bootstrap/foxy-service-factories.ts"),authority=createFoxyPublicationAuthority({database:guarded});
    const scope=await authority.open(x.lease,signal),grant=await authority.createFileCapability(scope.capability,signal),before=transactions;
    await x.database.$transaction(async raw=>{const tx={query:raw.$queryRawUnsafe};forbidden=true;
      const result=await authority.authorize(scope.capability,signal,tx);assert.equal(result.publicationId,x.publication.id);
      assert.equal((await authority.authorizeFile(grant.capability,signal,tx)).fileId,fileId);
    });assert.equal(transactions,before);authority.close(scope);
  });
});

test('scope opened before allocation remains valid and child capability fences allocated artifact', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool),controller=new AbortController(),signal=controller.signal,scope=await x.authority.open(x.lease,signal);
    const [{createFoxyPublicationFileAllocator},{createFoxyUnitOfWork},{FileService},{createFileAccess}]=await Promise.all([
      import("../../../../../bootstrap/foxy-service-factories.ts"),import("../../../conversations/infrastructure/unit-of-work.ts"),import("../../../../files/custody/infrastructure/service.ts"),import("../../../../files/custody/infrastructure/access.ts")]);
    const access=createFileAccess({authenticate:async(_tx,req)=>req.id,authorizeAttemptWrite:async()=>{throw Error('unexpected');}});
    const files=new FileService({database:x.database,access,storage:{},scanner:{},draftQuotaBytes:1000000n});
    const uow=createFoxyUnitOfWork({database:x.database,authenticate:async(_tx,req)=>req.id});
    const allocator=createFoxyPublicationFileAllocator({uow,files}),allocated=await allocator.ensureFile({id:x.f.teacherActor},x.lease,meta,signal);
    assert.equal(allocated.created,true);assert.equal((await x.authority.authorize(scope.capability,signal)).publicationId,x.publication.id);
    const child=await x.authority.createFileCapability(scope.capability,signal),file=await x.authority.authorizeFile(child.capability,signal);
    assert.equal(file.fileId,allocated.fileId);assert.equal(file.digest,meta.digest);
    await assert.rejects(x.query('UPDATE foxy_publications SET artifact_digest=$2 WHERE id=$1::uuid',x.publication.id,'c'.repeat(64)),e=>e.code==='23514');
    assert.equal((await x.authority.authorizeFile(child.capability,signal)).digest,meta.digest);
    controller.abort();await assert.rejects(x.authority.authorize(scope.capability,new AbortController().signal));
    x.authority.close(scope);
  });
});

test('existingFile returns null only for an authorized unassigned scope and an authorized child after assignment', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),signal=new AbortController().signal,scope=await x.authority.open(x.lease,signal);
    assert.equal(await x.authority.existingFile(scope.capability,signal),null);
    await assert.rejects(x.authority.existingFile({},signal));
    const fileId=await x.associate(),child=await x.authority.existingFile(scope.capability,signal);
    assert.equal((await x.authority.authorizeFile(child.capability,signal)).fileId,fileId);
    x.authority.close(scope);await assert.rejects(x.authority.existingFile(scope.capability,signal));
  });
});
