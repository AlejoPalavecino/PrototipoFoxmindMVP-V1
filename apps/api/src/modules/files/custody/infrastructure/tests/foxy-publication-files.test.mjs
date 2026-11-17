import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { withAgendaDatabase } from '../../../../../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const hash='a'.repeat(64);
async function fixture(pool,{onPut,onScan,scanError,wrapDatabase,claim=true}={}){
  const [{createDurableFoxyPublicationFiles},{createFoxyPublicationAuthority},{createFoxyPublicationQueue},{createFoxyPublicationRepository},
    {createFoxyResourceRepository},{createFoxyConversationRepository},{createFoxyTurnRepository},{FileService}]=await Promise.all([
    import('../../../../../bootstrap/files-foxy-publication-composition.ts'),import('../../../../../bootstrap/foxy-service-factories.ts'),import('../../../../foxy/publications/infrastructure/publication-queue.ts'),import('../../../../foxy/publications/infrastructure/publication-repository.ts'),
    import('../../../../foxy/resources/infrastructure/resource-repository.ts'),import('../../../../foxy/conversations/infrastructure/conversation-repository.ts'),import('../../../../foxy/turns/infrastructure/turn-repository.ts'),import('../service.ts')]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=wrapDatabase ? wrapDatabase(transactionDatabase(pool)) : transactionDatabase(pool),tx={query},context={kind:'GENERAL'};
  const conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
    JSON.stringify({schemaVersion:'foxy-answer-v1',title:'Recurso',markdown:'Contenido',references:[],warnings:[],missingInformation:[]}));
  const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
  const {publication}=await createFoxyPublicationRepository().prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:resource.revision,
    classroomId:f.rooms.teach.id,title:'Material',unitId:null,topicId:null});
  const lease=claim ? await createFoxyPublicationQueue({database}).claim() : null,authority=createFoxyPublicationAuthority({database}),controller=new AbortController();
  const scope=lease ? await authority.open(lease,controller.signal) : null,blobs=new Map(),calls=[];
  const storage={put:async(key,bytes)=>{calls.push('put');blobs.set(key,Buffer.from(bytes));await onPut?.({query,f,publication,controller});},
    get:async key=>{calls.push('get');return blobs.get(key);},remove:async key=>{calls.push('remove');blobs.delete(key);}};
  const scanner={scan:async()=>{calls.push('scan');await onScan?.({query,f,publication,controller});if(scanError)throw scanError;}};
  const files=new FileService({database,access:{authenticate:async()=>{throw Error('no fake request');},authorize:async()=>{throw Error('no fake request');}},storage,scanner,draftQuotaBytes:1000000n});
  const bridge=createDurableFoxyPublicationFiles({files,authority}),pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
  const artifact={digest:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length,pageCount:1,rendererVersion:'foxy-text-pdf-v1'};
  return {query,f,database,files,storage,publication,lease,authority,scope,controller,bridge,artifact,bytes,calls,blobs};
}

test('opaque scope allocates, scans and proves only its associated PDF through real FileService', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),signal=x.controller.signal;
    const allocated=await x.bridge.ensureFile(x.scope.capability,x.artifact,signal);assert.equal(allocated.created,true);
    const child=await x.authority.createFileCapability(x.scope.capability,signal);
    await x.bridge.receive(child.capability,x.bytes,signal);const proof=await x.bridge.proof(child.capability,signal);
    assert.equal(proof.fileId,allocated.fileId);assert.equal(proof.digest,x.artifact.digest);assert.equal(proof.sizeBytes,x.bytes.length);
    assert.ok(x.calls.includes('put') && x.calls.includes('scan') && x.calls.includes('get'));
    const [row]=await x.query('SELECT state FROM foxy_publications WHERE id=$1::uuid',x.publication.id);assert.equal(row.state,'PREPARING');
    const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
    await assert.rejects(x.bridge.receive({},x.bytes,signal));await assert.rejects(x.bridge.proof(structuredClone(child.capability),signal));
    x.authority.close(x.scope);
  });
});

test('mismatched bytes and scanner rejection or outage cannot produce proof', {timeout:120000},async()=>{
  for(const cause of ['digest','size','rejected','outage'])await withAgendaDatabase(async({pool})=>{
    const {FileError}=await import('../../../domain/errors.ts');
    const error=cause==='rejected'?new FileError('FILE_REJECTED'):cause==='outage'?Error('offline'):undefined;
    const x=await fixture(pool,{scanError:error}),signal=x.controller.signal;await x.bridge.ensureFile(x.scope.capability,x.artifact,signal);
    const child=await x.authority.createFileCapability(x.scope.capability,signal);
    const bytes=cause==='digest'?Buffer.alloc(x.bytes.length,42):cause==='size'?x.bytes.subarray(0,5):x.bytes;
    await assert.rejects(x.bridge.receive(child.capability,bytes,signal));await assert.rejects(x.bridge.proof(child.capability,signal));
    const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
    x.authority.close(x.scope);
  });
});

test('revocation and abort during storage or scan prevent ready proof', {timeout:120000},async()=>{
  for(const phase of ['put','scan','abort'])await withAgendaDatabase(async({pool})=>{
    const revoke=async({query,f})=>query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid',f.teacherActor);
    const options=phase==='put'?{onPut:revoke}:phase==='scan'?{onScan:revoke}:{onScan:async({controller})=>controller.abort()};
    const x=await fixture(pool,options),signal=x.controller.signal;await x.bridge.ensureFile(x.scope.capability,x.artifact,signal);
    const child=await x.authority.createFileCapability(x.scope.capability,signal);
    await assert.rejects(x.bridge.receive(child.capability,x.bytes,signal));await assert.rejects(x.bridge.proof(child.capability,signal));x.authority.close(x.scope);
  });
});


test('uncommitted receive reservation fences reclaim after the publication lease expires', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{
    let arrived,release;const entered=new Promise(r=>arrived=r),gate=new Promise(r=>release=r);let paused=false;
    const wrapDatabase=base=>({$transaction:fn=>base.$transaction(tx=>fn({$queryRawUnsafe:async(sql,...args)=>{
      const result=await tx.$queryRawUnsafe(sql,...args);
      if(!paused && sql.includes("UPDATE file_custodies SET phase='receiving'")){paused=true;arrived();await gate;}
      return result;
    }}))});
    const x=await fixture(pool,{wrapDatabase}),signal=x.controller.signal;await x.bridge.ensureFile(x.scope.capability,x.artifact,signal);
    const child=await x.authority.createFileCapability(x.scope.capability,signal);
    await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()+interval '2 seconds' WHERE id=$1::uuid",x.publication.id);
    const receiving=x.bridge.receive(child.capability,x.bytes,signal).then(()=>null,error=>error);
    await entered;await new Promise(r=>setTimeout(r,2200));
    const {createFoxyPublicationQueue}=await import('../../../../foxy/publications/infrastructure/publication-queue.ts');
    const queue=createFoxyPublicationQueue({database:transactionDatabase(pool)});
    const claiming=queue.claim();let early;
    try { early=await Promise.race([claiming.then(value=>({done:true,value})),new Promise(r=>setTimeout(()=>r({done:false}),250))]); }
    finally {release();}
    const claimed=await claiming;await receiving;
    if(early.done)assert.equal(early.value,null,'claim must not acquire while receiving is uncommitted');
    assert.equal(claimed,null,'live P4 lease must prevent reclaim');
    assert.equal(x.calls.includes('put'),false,'expired publication authority must not write storage');
    x.authority.close(x.scope);
  });
});


function gate(){let open;const promise=new Promise(r=>open=r);return {promise,open};}
function gatedDatabase(entered,unblock){let paused=false;return base=>({$transaction:fn=>base.$transaction(tx=>fn({$queryRawUnsafe:async(sql,...args)=>{
  const result=await tx.$queryRawUnsafe(sql,...args);if(!paused && sql.includes("UPDATE file_custodies SET phase='receiving'")){paused=true;entered.open();await unblock.promise;}return result;
}}))});}

test('release waits for uncommitted receiving and refuses while the P4 lease is live', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const entered=gate(),unblock=gate(),storageEntered=gate(),storageGate=gate();
    const x=await fixture(pool,{wrapDatabase:gatedDatabase(entered,unblock),onPut:async()=>{storageEntered.open();await storageGate.promise;}}),signal=x.controller.signal;
    await x.bridge.ensureFile(x.scope.capability,x.artifact,signal);const child=await x.authority.createFileCapability(x.scope.capability,signal);
    const receiving=x.bridge.receive(child.capability,x.bytes,signal).catch(e=>e);await entered.promise;
    const {createFoxyPublicationQueue}=await import('../../../../foxy/publications/infrastructure/publication-queue.ts');const queue=createFoxyPublicationQueue({database:transactionDatabase(pool)});
    const releasing=queue.release(x.lease);let early;try{early=await Promise.race([releasing.then(value=>({done:true,value})),new Promise(r=>setTimeout(()=>r({done:false}),250))]);}finally{unblock.open();}
    await storageEntered.promise;let result;try{result=await releasing;}finally{storageGate.open();}await receiving;
    if(early.done)assert.equal(early.value,false);assert.equal(result,false);x.authority.close(x.scope);
  });
});

test('uncommitted P4 reservation counts toward global capacity across classrooms', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const entered=gate(),unblock=gate(),storageEntered=gate(),storageGate=gate();
    const a=await fixture(pool,{wrapDatabase:gatedDatabase(entered,unblock),onPut:async()=>{storageEntered.open();await storageGate.promise;}});
    const b=await fixture(pool),c=await fixture(pool,{claim:false});assert.notEqual(a.f.rooms.teach.id,c.f.rooms.teach.id);assert.ok(b.lease);
    const signal=a.controller.signal;await a.bridge.ensureFile(a.scope.capability,a.artifact,signal);const child=await a.authority.createFileCapability(a.scope.capability,signal);
    await a.query("UPDATE foxy_publications SET lease_until=clock_timestamp()+interval '2 seconds' WHERE id=$1::uuid",a.publication.id);
    const receiving=a.bridge.receive(child.capability,a.bytes,signal).catch(e=>e);await entered.promise;await new Promise(r=>setTimeout(r,2200));
    const {createFoxyPublicationQueue}=await import('../../../../foxy/publications/infrastructure/publication-queue.ts');const queue=createFoxyPublicationQueue({database:transactionDatabase(pool)});
    const claiming=queue.claim();let early;try{early=await Promise.race([claiming.then(value=>({done:true,value})),new Promise(r=>setTimeout(()=>r({done:false}),250))]);}finally{unblock.open();}
    let claimed;try{claimed=await claiming;}finally{storageGate.open();}await receiving;
    if(early.done)assert.equal(early.value,null);assert.equal(claimed,null,'A P4 and B publication consume both global slots');
    a.authority.close(a.scope);b.authority.close(b.scope);
  });
});

test('inspect classifies reserved, live receiving, expired receiving and READY without storage access', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),signal=x.controller.signal;
    const allocated=await x.bridge.ensureFile(x.scope.capability,x.artifact,signal),child=await x.authority.createFileCapability(x.scope.capability,signal);
    await assert.rejects(x.bridge.inspect({},signal));assert.equal(x.calls.length,0);
    assert.equal(await x.bridge.inspect(child.capability,signal),'RECEIVABLE');
    await x.query("UPDATE file_custodies SET phase='receiving',operation_id=$2::uuid,lease_until=clock_timestamp()+interval '1 minute' WHERE file_id=$1::uuid",allocated.fileId,randomUUID());
    assert.equal(await x.bridge.inspect(child.capability,signal),'BUSY');
    await x.query("UPDATE file_custodies SET lease_until=clock_timestamp()-interval '1 second' WHERE file_id=$1::uuid",allocated.fileId);
    assert.equal(await x.bridge.inspect(child.capability,signal),'RECEIVABLE');assert.equal(x.calls.length,0);
    await x.bridge.receive(child.capability,x.bytes,signal);x.calls.length=0;
    assert.equal(await x.bridge.inspect(child.capability,signal),'READY');assert.equal(x.calls.length,0);
    x.authority.close(x.scope);
  });
});

// Only on the disposable fixture: recreate an exact historical row atomically.
// Current guards forbid both removing an active blob and unlinking its immutable
// artifact. Keep those guards enabled; the synthetic row has no command receipts.
async function removeHistoricalBlob(client,x,fileId){
  const removed=await client.query(`DELETE FROM foxy_publications WHERE id=$1::uuid
    RETURNING file_id,to_jsonb(foxy_publications)::text AS snapshot`,[x.publication.id]);
  assert.equal(removed.rows.length,1);assert.equal(removed.rows[0].file_id,fileId);
  const snapshot=removed.rows[0].snapshot;
  await client.query('UPDATE files SET blob_deleted_at=clock_timestamp() WHERE id=$1::uuid',[fileId]);
  await client.query(`INSERT INTO foxy_publications SELECT * FROM jsonb_populate_record(NULL::foxy_publications,$1::jsonb)`,[snapshot]);
  const restored=await client.query('SELECT to_jsonb(p)::text AS snapshot FROM foxy_publications p WHERE id=$1::uuid',[x.publication.id]);
  assert.equal(restored.rows[0].snapshot,snapshot,'historical fixture must preserve every publication field');
}

test('inspect marks a historical removed blob unavailable and never touches storage', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),signal=x.controller.signal;
    const {fileId}=await x.bridge.ensureFile(x.scope.capability,x.artifact,signal),child=await x.authority.createFileCapability(x.scope.capability,signal);
    await x.bridge.receive(child.capability,x.bytes,signal);
    await x.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,deleted_at)
      VALUES($1,now(),$2,'Synthetic tombstone',$3,$4,now())`,randomUUID(),x.f.rooms.teach.id,fileId,x.f.teacherActor);
    await assert.rejects(x.query('UPDATE files SET blob_deleted_at=clock_timestamp() WHERE id=$1::uuid',fileId),
      /Referenced file cannot be removed/);
    const client=await pool.connect();try{await client.query('BEGIN');await removeHistoricalBlob(client,x,fileId);await client.query('COMMIT');}
    finally{await client.query('ROLLBACK').catch(()=>{});client.release();}x.calls.length=0;
    assert.equal(await x.bridge.inspect(child.capability,signal),'UNAVAILABLE');assert.equal(x.calls.length,0);x.authority.close(x.scope);
  });
});

test('inspect reports BUSY while real FileService scan is in progress', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const entered=gate(),finish=gate(),x=await fixture(pool,{onScan:async()=>{entered.open();await finish.promise;}}),signal=x.controller.signal;
    await x.bridge.ensureFile(x.scope.capability,x.artifact,signal);const child=await x.authority.createFileCapability(x.scope.capability,signal);
    const receiving=x.bridge.receive(child.capability,x.bytes,signal);await entered.promise;x.calls.length=0;
    try {assert.equal(await x.bridge.inspect(child.capability,signal),'BUSY');assert.equal(x.calls.length,0);} finally {finish.open();await receiving;}
    x.authority.close(x.scope);
  });
});

test('inspect observes historical blob deletion committed while waiting for classroom lock', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),signal=x.controller.signal;
  const {fileId}=await x.bridge.ensureFile(x.scope.capability,x.artifact,signal),child=await x.authority.createFileCapability(x.scope.capability,signal);
  await x.bridge.receive(child.capability,x.bytes,signal);
  await x.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,deleted_at)
    VALUES($1,now(),$2,'Synthetic tombstone',$3,$4,now())`,randomUUID(),x.f.rooms.teach.id,fileId,x.f.teacherActor);
  x.calls.length=0;const locker=await pool.connect();let inspection;
  try{await locker.query('BEGIN');await locker.query('SELECT id FROM classrooms WHERE id=$1 FOR UPDATE',[x.f.rooms.teach.id]);
   const [{pid}]= (await locker.query('SELECT pg_backend_pid() AS pid')).rows;
   inspection=x.bridge.inspect(child.capability,signal);
   let blocked=false;for(let i=0;i<100;i++){const [row]=await x.query('SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))) AS blocked',pid);if(row.blocked){blocked=true;break;}await new Promise(r=>setTimeout(r,20));}
   assert.equal(blocked,true,'inspect must reach the held classroom lock');
   await removeHistoricalBlob(locker,x,fileId);await locker.query('COMMIT');
   assert.equal(await inspection,'UNAVAILABLE');assert.equal(x.calls.length,0);
  }finally{await locker.query('ROLLBACK').catch(()=>{});locker.release();if(inspection)await inspection.catch(()=>{});x.authority.close(x.scope);}
 });
});


test('runtime restarts with text AI disabled and durably completes an already uploaded publication', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await fixture(pool),signal=x.controller.signal;
  const allocated=await x.bridge.ensureFile(x.scope.capability,x.artifact,signal),child=await x.authority.createFileCapability(x.scope.capability,signal);
  await x.bridge.receive(child.capability,x.bytes,signal);x.authority.close(x.scope);
  const {createFoxyRuntime}=await import(new URL("../../../../../../../../.build/api/apps/api/src/bootstrap/foxy-runtime.js",import.meta.url));
  const {createFoxyFileOperations}=await import(new URL("../../../../../../../../.build/api/apps/api/src/bootstrap/foxy-file-integration.js",import.meta.url));
  const options={database:x.database,fileOperations:createFoxyFileOperations(x.files),storage:x.storage,authenticate:async()=>x.f.teacherActor,classrooms:{run:async()=>{},classroom:async()=>{}},configuration:null,provider:null};
  const first=createFoxyRuntime(options);assert.equal(first.worker,null);first.onModuleInit();await first.onModuleDestroy();
  await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",x.publication.id);
  const before=x.calls.filter(c=>c==='put').length,runtime=createFoxyRuntime(options);runtime.onModuleInit();
  try{let row;for(let i=0;i<100;i++){[row]=await x.query('SELECT state,file_id,error_code FROM foxy_publications WHERE id=$1::uuid',x.publication.id);if(row.state!=='PREPARING')break;await new Promise(r=>setTimeout(r,100));}
   assert.equal(row.state,'READY','publication error: '+row.error_code);assert.equal(row.file_id,allocated.fileId);assert.equal(x.calls.filter(c=>c==='put').length,before);
   const [file]=await x.query("SELECT u.status,c.phase,f.scan_status FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id WHERE f.id=$1::uuid",allocated.fileId);
   assert.equal(file.status,'COMPLETED');assert.equal(file.phase,'ready');assert.equal(file.scan_status,'CLEAN');
   const [materials]=await x.query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1::uuid',x.f.rooms.teach.id);assert.equal(materials.n,0);
  }finally{await runtime.onModuleDestroy();}
 });
});
