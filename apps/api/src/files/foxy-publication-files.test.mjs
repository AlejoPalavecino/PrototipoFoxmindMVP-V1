import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const hash='a'.repeat(64);
async function fixture(pool,{onPut,onScan,scanError}={}){
  const [{createDurableFoxyPublicationFiles},{createFoxyPublicationAuthority},{createFoxyPublicationQueue},{createFoxyPublicationRepository},
    {createFoxyResourceRepository},{createFoxyConversationRepository},{createFoxyTurnRepository},{FileService}]=await Promise.all([
    import('./foxy-publication-files.ts'),import('../foxy-ai/publication-authority.ts'),import('../foxy-ai/publication-queue.ts'),import('../foxy-ai/publication-repository.ts'),
    import('../foxy-ai/resource-repository.ts'),import('../foxy-ai/conversation-repository.ts'),import('../foxy-ai/turn-repository.ts'),import('./service.ts')]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),database=transactionDatabase(pool),tx={query},context={kind:'GENERAL'};
  const conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
  const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
  const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
    {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
    JSON.stringify({schemaVersion:'foxy-answer-v1',title:'Recurso',markdown:'Contenido',references:[],warnings:[],missingInformation:[]}));
  const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
  const {publication}=await createFoxyPublicationRepository().prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:resource.revision,
    classroomId:f.rooms.teach.id,title:'Material',unitId:null,topicId:null});
  const lease=await createFoxyPublicationQueue({database}).claim(),authority=createFoxyPublicationAuthority({database}),controller=new AbortController();
  const scope=await authority.open(lease,controller.signal),blobs=new Map(),calls=[];
  const storage={put:async(key,bytes)=>{calls.push('put');blobs.set(key,Buffer.from(bytes));await onPut?.({query,f,publication,controller});},
    get:async key=>{calls.push('get');return blobs.get(key);},remove:async key=>{calls.push('remove');blobs.delete(key);}};
  const scanner={scan:async()=>{calls.push('scan');await onScan?.({query,f,publication,controller});if(scanError)throw scanError;}};
  const files=new FileService({database,access:{authenticate:async()=>{throw Error('no fake request');},authorize:async()=>{throw Error('no fake request');}},storage,scanner,draftQuotaBytes:1000000n});
  const bridge=createDurableFoxyPublicationFiles({files,authority}),pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
  const artifact={digest:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length,pageCount:1,rendererVersion:'foxy-text-pdf-v1'};
  return {query,f,publication,lease,authority,scope,controller,bridge,artifact,bytes,calls,blobs};
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
    const {FileError}=await import('./errors.ts');
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
