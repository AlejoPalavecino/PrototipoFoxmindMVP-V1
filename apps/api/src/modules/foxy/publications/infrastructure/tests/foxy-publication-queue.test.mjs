import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAgendaDatabase} from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import {transactionDatabase} from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const hash='a'.repeat(64);
async function setup(pool){
  const [{createFoxyPublicationQueue},{createFoxyPublicationRepository},{createFoxyResourceRepository},{createFoxyConversationRepository},{createFoxyTurnRepository}]=await Promise.all([
    import("../publication-queue.ts"),import("../publication-repository.ts"),import("../../../resources/infrastructure/resource-repository.ts"),import("../../../conversations/infrastructure/conversation-repository.ts"),import("../../../turns/infrastructure/turn-repository.ts")]);
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,database=transactionDatabase(pool),queue=createFoxyPublicationQueue({database});
  async function publication(){const f=await homeFixture(query),tx={query},context={kind:'GENERAL'},conversations=createFoxyConversationRepository(),turns=createFoxyTurnRepository(),resources=createFoxyResourceRepository();
    const {conversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Chat',context},hash);
    const {turn}=await turns.enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'CHAT',text:'Hola',selection:{topicIds:[],sourceIds:[]}},
      {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
    await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
      JSON.stringify({schemaVersion:'foxy-answer-v1',title:'R',markdown:'Texto',references:[],warnings:[],missingInformation:[]}));
    const {resource}=await resources.fromTurn(tx,f.teacherActor,conversation.id,turn.id);
    const {publication}=await createFoxyPublicationRepository().prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:resource.revision,classroomId:f.rooms.teach.id,title:'Material',unitId:null,topicId:null});
    return {f,publication,resource,resources,conversation};}
  async function attach(x){const id=randomUUID(),operation=randomUUID();
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes)
      VALUES($1,now(),$2,$3,$4,'foxy-ai.pdf','pdf',100)`,id,x.f.rooms.teach.id,x.f.teacherActor,`synthetic/${id}`);
    await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes) VALUES($1,now(),$2,'UPLOADING',100)",randomUUID(),id);
    await query("INSERT INTO file_custodies(file_id,purpose,phase,operation_id,lease_until) VALUES($1,'material','receiving',$2,clock_timestamp()+interval '1 minute')",id,operation);
    await query("UPDATE foxy_publications SET file_id=$2,artifact_digest=$3,artifact_size_bytes=100,artifact_page_count=1,renderer_version='foxy-text-pdf-v1' WHERE id=$1",x.publication.id,id,hash);return id;}
  return {query,database,queue,publication,attach};
}

test('renew and release are fenced and never revive an expired or revoked lease', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await setup(pool),p=await x.publication(),lease=await x.queue.claim();
    assert.equal(typeof x.queue.renew,'function');assert.equal(typeof x.queue.release,'function');
    const [before]=await x.query('SELECT lease_until FROM foxy_publications WHERE id=$1::uuid',p.publication.id);
    assert.equal(await x.queue.renew({...lease,leaseNonce:randomUUID()}),false);assert.equal(await x.queue.release({...lease,ownerId:randomUUID()}),false);
    assert.equal(await x.queue.renew(lease),true);const [after]=await x.query('SELECT lease_until FROM foxy_publications WHERE id=$1::uuid',p.publication.id);assert.ok(after.lease_until>=before.lease_until);
    assert.equal(await x.queue.release(lease),true);assert.equal(await x.queue.release(lease),false);
    const current=await x.queue.claim();await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",p.publication.id);
    assert.equal(await x.queue.renew(current),false);assert.equal(await x.queue.release(current),false);
  });
});

test('active file lease blocks reclaim and release until expiry, then file is reused', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await setup(pool),p=await x.publication(),lease=await x.queue.claim(),fileId=await x.attach(p);
    assert.equal(await x.queue.release(lease),false);
    await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",p.publication.id);
    assert.equal(await x.queue.claim(),null);
    await x.query("UPDATE file_custodies SET lease_until=clock_timestamp()-interval '1 second' WHERE file_id=$1::uuid",fileId);
    const recovered=await x.queue.claim();assert.equal(recovered.publicationId,p.publication.id);
    const [row]=await x.query('SELECT file_id FROM foxy_publications WHERE id=$1::uuid',p.publication.id);assert.equal(row.file_id,fileId);
    const [count]=await x.query('SELECT count(*)::int n FROM files WHERE classroom_id=$1::uuid',p.f.rooms.teach.id);assert.equal(count.n,1);
  });
});

test('global capacity counts active file reservations once across publication and P4 leases', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool})=>{const x=await setup(pool),a=await x.publication(),b=await x.publication(),c=await x.publication();
    const first=await x.queue.claim();assert.equal(first.publicationId,a.publication.id);const fileId=await x.attach(a);
    const second=await x.queue.claim();assert.equal(second.publicationId,b.publication.id);assert.equal(await x.queue.claim(),null);
    await x.query("UPDATE foxy_publications SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid",a.publication.id);
    assert.equal(await x.queue.claim(),null,'live P4 lease continues to consume the slot');
    await x.query("UPDATE file_custodies SET lease_until=clock_timestamp()-interval '1 second' WHERE file_id=$1::uuid",fileId);
    const next=await x.queue.claim();assert.ok(next);assert.ok([a.publication.id,c.publication.id].includes(next.publicationId));
  });
});

test('renew refuses a lease when original teacher permission or source revision is revoked', {timeout:120000},async()=>{
  for(const cause of ['teacher','source'])await withAgendaDatabase(async({pool})=>{
    const x=await setup(pool),p=await x.publication(),lease=await x.queue.claim();assert.equal(typeof x.queue.renew,'function');
    if(cause==='teacher')await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid',p.f.teacherActor);
    else await p.resources.edit({query:x.query},p.f.teacherActor,p.resource.id,{requestId:randomUUID(),revision:p.resource.revision,title:'Nuevo',markdown:'Cambio'});
    assert.equal(await x.queue.renew(lease),false);
  });
});
