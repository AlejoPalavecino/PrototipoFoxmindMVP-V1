import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const metadata={digest:'a'.repeat(64),sizeBytes:100,pageCount:2,rendererVersion:'foxy-text-pdf-v1'},hash='a'.repeat(64);
async function fixture(pool){
  const [{createFoxyPublicationQueue},{createFoxyPublicationFileAllocator},{createFoxyPublicationRepository},{createFoxyResourceRepository},
    {createFoxyConversationRepository},{createFoxyTurnRepository},{createFoxyUnitOfWork},{FileService},{createFileAccess}]=await Promise.all([
    import('./publication-queue.ts'),import('./publication-file-allocator.ts'),import('./publication-repository.ts'),import('./resource-repository.ts'),
    import('./conversation-repository.ts'),import('./turn-repository.ts'),import('./unit-of-work.ts'),import('../files/service.ts'),import('../files/access.ts')]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),tx={query},owner={id:f.teacherActor},calls=[];
  const conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository(),publications=createFoxyPublicationRepository();
  const context={kind:'GENERAL'}, {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
    JSON.stringify({schemaVersion:'foxy-answer-v1',title:'Resumen',markdown:'Texto',references:[],warnings:[],missingInformation:[]}));
  const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
  const {publication}=await publications.prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:resource.revision,classroomId:f.rooms.teach.id,title:'Material',unitId:null,topicId:null});
  const queue=createFoxyPublicationQueue({database}),lease=await queue.claim();assert.equal(lease.publicationId,publication.id);
  const access=createFileAccess({authenticate:async(_tx,req)=>req.id,authorizeAttemptWrite:async()=>{throw Error('forbidden');}});
  const storage={put:async()=>calls.push('put'),get:async()=>calls.push('get'),remove:async()=>calls.push('remove')},scanner={scan:async()=>calls.push('scan')};
  const files=new FileService({database,access,storage,scanner,draftQuotaBytes:1000000n}),uow=createFoxyUnitOfWork({database,authenticate:async(_tx,req)=>req.id});
  return {query,f,database,lease,owner,files,calls,publication,resource,resources,conversation,allocator:createFoxyPublicationFileAllocator({uow,files})};
}

test('allocator fences lease and atomically reserves one file with exact artifact metadata', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{assert.match((await pool.query('SELECT current_database() name')).rows[0].name,/_test$/);
    const x=await fixture(pool),signal=new AbortController().signal;
    const first=await x.allocator.ensureFile(x.owner,x.lease,metadata,signal);assert.equal(first.created,true);assert.ok(first.fileId);
    const again=await x.allocator.ensureFile(x.owner,x.lease,{...metadata},signal);assert.deepEqual(again,{fileId:first.fileId,created:false});
    await assert.rejects(x.allocator.ensureFile(x.owner,x.lease,{...metadata,digest:'b'.repeat(64)},signal),e=>e?.code==='CONFLICT');
    const [file]=await x.query(`SELECT f.original_name,c.purpose,c.target_id,u.reserved_bytes::text AS reserved
      FROM files f JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id WHERE f.id=$1::uuid`,first.fileId);
    assert.equal(file.original_name,'foxy-ai.pdf');assert.equal(file.purpose,'material');assert.equal(file.target_id,null);assert.equal(file.reserved,'100');
    assert.deepEqual(x.calls,[]);const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
    assert.equal(await x.allocator.ensureFile(x.owner,{...x.lease,leaseNonce:randomUUID()},metadata,signal),null);
  });
});

test('expired lease, revoked actor, invalid metadata and insufficient quota never reserve an orphan', {timeout:120000},async()=>{
  for(const cause of ['expired','revoked','invalid','quota'])await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool);if(cause==='expired')await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",x.publication.id);
    if(cause==='revoked')await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid',x.f.teacherActor);
    if(cause==='quota')await x.query('UPDATE classrooms SET storage_quota_bytes=99 WHERE id=$1::uuid',x.f.rooms.teach.id);
    const input=cause==='invalid'?{...metadata,pageCount:101}:metadata;
    let result, failure;try {result=await x.allocator.ensureFile(x.owner,x.lease,input,new AbortController().signal);} catch(error) {failure=error;}
    if(cause==='quota') assert.equal(failure?.code,'QUOTA_EXCEEDED');
    else if(!failure) assert.equal(result,null); else assert.ok(failure.code || failure.name==='AbortError');
    const [count]=await x.query('SELECT count(*)::int n FROM files WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(count.n,0);assert.deepEqual(x.calls,[]);
  });
});

test('associated file remains reserved and cannot be claimed by incomplete upload cleanup', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),result=await x.allocator.ensureFile(x.owner,x.lease,metadata,new AbortController().signal);
    await x.query("UPDATE uploads SET last_activity_at=clock_timestamp()-interval '25 hours' WHERE file_id=$1::uuid",result.fileId);
    const outcome=await x.files.cleanup(100);assert.equal(outcome.deleted,0);assert.deepEqual(x.calls,[]);
    const [row]=await x.query('SELECT u.reserved_bytes::text reserved,u.reservation_released_at,c.phase FROM uploads u JOIN file_custodies c ON c.file_id=u.file_id WHERE u.file_id=$1::uuid',result.fileId);
    assert.equal(row.reserved,'100');assert.equal(row.reservation_released_at,null);assert.notEqual(row.phase,'deleted');
  });
});

test('cleanup revalidates publication association even after stale candidate selection', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),result=await x.allocator.ensureFile(x.owner,x.lease,metadata,new AbortController().signal);
    await x.query("UPDATE uploads SET last_activity_at=clock_timestamp()-interval '25 hours' WHERE file_id=$1::uuid",result.fileId);
    const original=x.files.store.transaction.bind(x.files.store);let injected=false;
    x.files.store.transaction=fn=>original(tx=>fn({query:async(sql,...args)=>{
      if(!injected && /SELECT f\.id FROM files f/iu.test(sql)){injected=true;return [{id:result.fileId}];}
      return tx.query(sql,...args);
    }}));
    const outcome=await x.files.cleanup(100);assert.equal(injected,true);assert.equal(outcome.deleted,0);assert.deepEqual(x.calls,[]);
    const [row]=await x.query('SELECT reserved_bytes::text reserved,reservation_released_at FROM uploads WHERE file_id=$1::uuid',result.fileId);
    assert.equal(row.reserved,'100');assert.equal(row.reservation_released_at,null);
  });
});

test('lease expiring after file insertion rolls back all file rows and reserved quota', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),original=x.files.beginInTransaction.bind(x.files);let inserted;
    x.files.beginInTransaction=async(tx,...args)=>{const result=await original(tx,...args);inserted=result.id;
      await tx.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",x.publication.id);return result;};
    let output,error;try {output=await x.allocator.ensureFile(x.owner,x.lease,metadata,new AbortController().signal);}catch(e){error=e;}
    assert.ok(inserted);if(!error)assert.equal(output,null);
    assert.equal((await x.query('SELECT id FROM files WHERE id=$1::uuid',inserted)).length,0);
    const [row]=await x.query('SELECT count(*)::int n FROM uploads WHERE file_id=$1::uuid',inserted);assert.equal(row.n,0);
    const [usage]=await x.query('SELECT COALESCE(sum(size_bytes),0)::text used FROM files WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(usage.used,'0');assert.deepEqual(x.calls,[]);
  });
});

test('artifact metadata is snapshotted before await and cannot diverge from file quota', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),artifact={...metadata};
    const pending=x.allocator.ensureFile(x.owner,x.lease,artifact,new AbortController().signal);
    artifact.sizeBytes=99999999;artifact.digest='b'.repeat(64);artifact.pageCount=101;
    const result=await pending;assert.equal(result.created,true);
    const [row]=await x.query(`SELECT p.artifact_digest,p.artifact_size_bytes,p.artifact_page_count,f.size_bytes::text AS file_size,u.reserved_bytes::text AS reserved
      FROM foxy_publications p JOIN files f ON f.id=p.file_id JOIN uploads u ON u.file_id=f.id WHERE p.id=$1::uuid`,x.publication.id);
    assert.equal(row.artifact_digest,metadata.digest);assert.equal(Number(row.artifact_size_bytes),metadata.sizeBytes);
    assert.equal(Number(row.artifact_page_count),metadata.pageCount);assert.equal(row.file_size,'100');assert.equal(row.reserved,'100');assert.deepEqual(x.calls,[]);
  });
});

for(const cause of ['deleted','edited']) test(`${cause} source prevents file allocation`, {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{
    const x=await fixture(pool);
    if(cause==='deleted')await x.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1::uuid',x.conversation.id);
    else await x.resources.edit({query:x.query},x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Editado',markdown:'Cambió'});
    let result,error;try{result=await x.allocator.ensureFile(x.owner,x.lease,metadata,new AbortController().signal);}catch(e){error=e;}
    if(!error)assert.equal(result,null);const [row]=await x.query('SELECT file_id FROM foxy_publications WHERE id=$1::uuid',x.publication.id);assert.equal(row.file_id,null);
    const [count]=await x.query('SELECT count(*)::int n FROM files WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(count.n,0);assert.deepEqual(x.calls,[]);
  });
});

for(const cause of ['deleted conversation','edited resource']) test(`queue never reclaims publication with ${cause}`, {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),{createFoxyPublicationQueue}=await import('./publication-queue.ts');
    if(cause==='deleted conversation')await x.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1::uuid',x.conversation.id);
    else await x.resources.edit({query:x.query},x.f.teacherActor,x.resource.id,{requestId:randomUUID(),revision:x.resource.revision,title:'Nuevo',markdown:'Cambio'});
    await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",x.publication.id);
    const queue=createFoxyPublicationQueue({database:x.database});assert.equal(await queue.claim(),null);assert.equal(await queue.claim(),null);
  });
});

for(const cause of ['deleted conversation','edited resource']) test(`stale ${cause} does not starve another valid publication`, {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const stale=await fixture(pool),valid=await fixture(pool),{createFoxyPublicationQueue}=await import('./publication-queue.ts');
    if(cause==='deleted conversation')await stale.query('UPDATE foxy_conversations SET deleted_at=clock_timestamp() WHERE id=$1::uuid',stale.conversation.id);
    else await stale.resources.edit({query:stale.query},stale.f.teacherActor,stale.resource.id,{requestId:randomUUID(),revision:stale.resource.revision,title:'Nuevo',markdown:'Cambio'});
    await stale.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id IN ($1::uuid,$2::uuid)",stale.publication.id,valid.publication.id);
    const queue=createFoxyPublicationQueue({database:stale.database}),lease=await queue.claim();
    assert.ok(lease);assert.equal(lease.publicationId,valid.publication.id);assert.notEqual(lease.publicationId,stale.publication.id);
    assert.equal(await queue.claim(),null);
  });
});
