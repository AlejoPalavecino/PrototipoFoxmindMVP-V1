import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { withAiDatabase } from '../../../../../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const code = name => error => error?.code === name;
async function setup(pool, database) {
 const [{createFoxyPrivateAssetEditorialService},{createFoxyPrivateAssetEditorialRepository},{createFoxyPrivateAssetReadRepository},{createFoxyUnitOfWork},{createFoxyConversationRepository},{createFoxyPrivateAssetRepository},{createFoxyPrivateAssetClaims},{createFoxyPrivateAssetAuthority},{createFoxyVisualPublicationRepository}]=await Promise.all([
  import('../../../private-assets/application/private-asset-editorial-service.ts'),import('../../../private-assets/infrastructure/private-asset-editorial-repository.ts'),import('../../../private-assets/infrastructure/private-asset-read-repository.ts'),import('../../../conversations/infrastructure/unit-of-work.ts'),import('../../../conversations/infrastructure/conversation-repository.ts'),import('../../../private-assets/infrastructure/private-asset-repository.ts'),import('../../../private-assets/infrastructure/private-asset-claims.ts'),import('../../../../../bootstrap/foxy-service-factories.ts'),import('../../../publications/infrastructure/visual-publication-repository.ts')]);
 const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor};
 const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,request)=>request.id});
 const conversation=(await uow.run(owner,true,(tx,a)=>createFoxyConversationRepository().create(tx,a.id,{requestId:randomUUID(),title:'Editorial sintético',context:{kind:'GENERAL'}},'a'.repeat(64)))).conversation;
 const asset=(await uow.run(owner,true,(tx,a)=>createFoxyPrivateAssetRepository().reserve(tx,a.id,conversation.id,{requestId:randomUUID(),conversationRevision:'0',kind:'IMAGE',aspectRatio:'1:1'},10485760n))).asset;
 const lease=await createFoxyPrivateAssetClaims({database}).claim({assetId:asset.id,ownerId:owner.id}),authority=createFoxyPrivateAssetAuthority({database}),signal=new AbortController().signal,scope=await authority.open(lease,signal);
 const digest=createHash('sha256').update('synthetic').digest('hex');
 await authority.bind(scope.capability,{digest,sizeBytes:9,mimeType:'image/png',width:10,height:10,producerVersion:'foxy-image-original-v1',title:'Original',description:'Texto original',diagram:null},signal);
 await authority.complete(scope.capability,{digest,sizeBytes:9,mimeType:'image/png',width:10,height:10,validatedDigest:digest,scannedDigest:digest},signal);
 authority.close(scope);
 const reads=createFoxyPrivateAssetReadRepository(),edits=createFoxyPrivateAssetEditorialRepository(),service=createFoxyPrivateAssetEditorialService({uow,assets:edits,reads});
 return {query,f,owner,asset,conversation,uow,service,reads,publications:createFoxyVisualPublicationRepository({assets:reads}),inspect:()=>uow.run(owner,false,(tx,a)=>reads.inspect(tx,a.id,asset.id))};
}
const edit=(changes={})=>({expectedRevision:'0',requestId:randomUUID(),title:'Título editado',description:'Texto editado',...changes});

test('editorial saves independently of bytes, replays and rejects stale or cross-action commands', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),before=await x.inspect(),command=edit(),first=await x.service.edit(x.owner,x.asset.id,command);
 assert.equal(before.editorial.revision,'0');assert.equal(first.editorial.revision,'1');assert.equal(first.asset.revision,before.asset.revision);assert.deepEqual(first.payload,before.payload);
 assert.deepEqual(first.editorial,{revision:'1',title:command.title,description:command.description});assert.equal(first.receipt.action,'EDIT');
 assert.deepEqual((await x.service.edit(x.owner,x.asset.id,command)).receipt,first.receipt);
 await assert.rejects(x.service.edit(x.owner,x.asset.id,{...command,title:'Otro'}),code('CONFLICT'));
 await assert.rejects(x.service.edit(x.owner,x.asset.id,edit()),code('CONFLICT'));
 await x.service.edit(x.owner,x.asset.id,edit({expectedRevision:'1',description:''}));
 const replay=await x.service.edit(x.owner,x.asset.id,command);assert.equal(replay.editorial.revision,'2');assert.equal(replay.receipt.editorialRevision,'1');
 const [{createFoxyPrivateAssetDiscardRepository}]=await Promise.all([import('../../../private-assets/infrastructure/private-asset-discard-repository.ts')]);
 await assert.rejects(x.uow.run(x.owner,true,(tx,a)=>createFoxyPrivateAssetDiscardRepository().discard(tx,a.id,x.asset.id,{requestId:command.requestId,assetRevision:before.asset.revision,confirm:true})),code('CONFLICT'));
 await assert.rejects(x.query('UPDATE foxy_visual_assets SET title=$2 WHERE id=$1',x.asset.id,'Mutation'));
 await assert.rejects(x.query('UPDATE foxy_visual_assets SET editorial_revision=0 WHERE id=$1',x.asset.id));
 await assert.rejects(x.query('DELETE FROM foxy_private_asset_commands WHERE asset_id=$1',x.asset.id));
}));

test('current ownership, role, verification, visibility and input apply to edit and replay', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),command=edit();
 for(const id of [x.f.other,x.f.pupil])await assert.rejects(x.service.edit({id},x.asset.id,command));
 for(const patch of [{expectedRevision:'01'},{expectedRevision:'9223372036854775808'},{title:' '},{title:'a\nb'},{title:'x'.repeat(201)},{description:'x'.repeat(12001)},{description:'\u0000'},{extra:true}])await assert.rejects(x.service.edit(x.owner,x.asset.id,{...command,...patch}),code('INVALID_INPUT'));
 await x.service.edit(x.owner,x.asset.id,command);await x.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',x.owner.id);
 await assert.rejects(x.service.edit(x.owner,x.asset.id,command));await x.query('UPDATE users SET email_verified_at=now() WHERE id=$1',x.owner.id);
 await x.query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1',x.conversation.id);await assert.rejects(x.service.edit(x.owner,x.asset.id,command),code('NOT_FOUND'));
}));

test('same request races replay once, competing revisions have exactly one winner', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),command=edit(),pair=await Promise.all([x.service.edit(x.owner,x.asset.id,command),x.service.edit(x.owner,x.asset.id,command)]);
 assert.deepEqual(pair[0],pair[1]);
 const results=await Promise.allSettled([x.service.edit(x.owner,x.asset.id,edit({expectedRevision:'1',title:'A'})),x.service.edit(x.owner,x.asset.id,edit({expectedRevision:'1',title:'B'}))]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'CONFLICT');assert.equal((await x.inspect()).editorial.revision,'2');
}));

test('prepared visual snapshots retain title and body through edits and deduplicate per editorial revision', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),before=await x.inspect(),command={requestId:randomUUID(),assetRevision:before.asset.revision,editorialRevision:'0',classroomId:x.f.rooms.teach.id,title:'Publicación original',unitId:null,topicId:null};
 const prepare=input=>x.uow.run(x.owner,true,(tx,a)=>x.publications.prepare(tx,a.id,x.asset.id,input));
 const old=await prepare(command);await x.service.edit(x.owner,x.asset.id,edit());
 assert.equal((await prepare(command)).publication.id,old.publication.id);
 await assert.rejects(prepare({...command,requestId:randomUUID()}),code('CONFLICT'));
 const current={...command,requestId:randomUUID(),editorialRevision:'1',title:'Publicación editada'};
 const results=await Promise.all([prepare(current),prepare({...current,requestId:randomUUID()})]);assert.equal(results[0].publication.id,results[1].publication.id);assert.notEqual(results[0].publication.id,old.publication.id);
 const {createFoxyPublicationRepository}=await import('../../../publications/infrastructure/publication-repository.ts');
 const inspect=(owner,id)=>x.uow.run(owner,false,(tx,a)=>createFoxyPublicationRepository().inspect(tx,a.id,id));
 assert.deepEqual((await inspect(x.owner,old.publication.id)).editorialSnapshot,{title:'Publicación original',description:'Texto original',revision:'0'});
 await assert.rejects(inspect({id:x.f.other},old.publication.id),code('NOT_FOUND'));
 const rows=await x.query('SELECT snapshot_title,snapshot_description,source_editorial_revision FROM foxy_publications WHERE source_asset_id=$1 ORDER BY source_editorial_revision',x.asset.id);
 assert.deepEqual(rows.map(r=>[r.snapshot_title,r.snapshot_description,String(r.source_editorial_revision)]),[['Publicación original','Texto original','0'],['Publicación editada','Texto editado','1']]);
 await assert.rejects(x.query('UPDATE foxy_publications SET snapshot_description=$2 WHERE id=$1',old.publication.id,'Changed'));
}));

test('additive migration preserves populated assets, legacy duplicate snapshots and discard receipts', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),original=await x.inspect(),snapshot={kind:'VISUAL',assetId:x.asset.id,assetRevision:original.asset.revision,digest:createHash('sha256').update('synthetic').digest('hex'),sizeBytes:9,mimeType:'image/png',width:10,height:10,producerVersion:'foxy-image-original-v1'};
 await x.query(`DROP TRIGGER foxy_visual_editorial_guard ON foxy_visual_assets; DROP FUNCTION guard_foxy_visual_editorial();
 DROP TRIGGER foxy_publication_editorial_immutable ON foxy_publications; DROP FUNCTION preserve_foxy_publication_editorial();
 ALTER TABLE foxy_visual_assets DROP COLUMN editorial_revision,DROP COLUMN editorial_title,DROP COLUMN editorial_description;
 ALTER TABLE foxy_publications DROP COLUMN source_editorial_revision,DROP COLUMN snapshot_description;
 ALTER TABLE foxy_private_asset_commands DROP COLUMN editorial_revision;
 ALTER TABLE foxy_publication_command_requests DROP CONSTRAINT foxy_command_action_check;
 ALTER TABLE foxy_publication_command_requests ADD CONSTRAINT foxy_command_action_check CHECK(action IN ('RETRY','DISCARD'));
 ALTER TABLE foxy_private_asset_commands ADD CONSTRAINT foxy_private_asset_commands_action_check CHECK(action='DISCARD');`);
 const ids=[randomUUID(),randomUUID()];
 for(const id of ids)await x.query(`INSERT INTO foxy_publications(id,owner_id,request_id,input_hash,source_kind,source_asset_id,source_asset_revision,snapshot_title,snapshot_visual,classroom_id,title)
 VALUES($1,$2,$3,$4,'VISUAL',$5,$6,'Legacy',$7::jsonb,$8,'Legacy')`,id,x.owner.id,randomUUID(),'b'.repeat(64),x.asset.id,original.asset.revision,JSON.stringify(snapshot),x.f.rooms.teach.id);
 await x.query(`INSERT INTO foxy_private_asset_commands(owner_id,request_id,asset_id,action,input_hash,asset_revision) VALUES($1,$2,$3,'DISCARD',$4,$5)`,x.owner.id,randomUUID(),x.asset.id,'c'.repeat(64),original.asset.revision);
 const before={assets:await x.query('SELECT to_jsonb(a) AS row FROM foxy_visual_assets a WHERE id=$1',x.asset.id),publications:await x.query('SELECT to_jsonb(p) AS row FROM foxy_publications p WHERE source_asset_id=$1 ORDER BY id',x.asset.id),receipts:await x.query('SELECT to_jsonb(c) AS row FROM foxy_private_asset_commands c WHERE asset_id=$1',x.asset.id)};
 const {readFile}=await import('node:fs/promises');await x.query(await readFile('prisma/migrations/202611160002_foxy_visual_editorial/migration.sql','utf8'));
 assert.deepEqual(await x.query("SELECT to_jsonb(a)-ARRAY['editorial_revision','editorial_title','editorial_description'] AS row FROM foxy_visual_assets a WHERE id=$1",x.asset.id),before.assets);
 assert.deepEqual(await x.query("SELECT to_jsonb(p)-ARRAY['source_editorial_revision','snapshot_description'] AS row FROM foxy_publications p WHERE source_asset_id=$1 ORDER BY id",x.asset.id),before.publications);
 assert.deepEqual(await x.query("SELECT to_jsonb(c)-'editorial_revision' AS row FROM foxy_private_asset_commands c WHERE asset_id=$1",x.asset.id),before.receipts);
 assert.deepEqual((await x.inspect()).editorial,{revision:'0',title:'Original',description:'Texto original'});
 const {createFoxyPublicationRepository}=await import('../../../publications/infrastructure/publication-repository.ts');
 const legacyInspection=await x.uow.run(x.owner,false,(tx,a)=>createFoxyPublicationRepository().inspect(tx,a.id,ids[0]));
 assert.deepEqual(legacyInspection.editorialSnapshot,{title:'Legacy',description:null,revision:null});
 const existing=await x.uow.run(x.owner,true,(tx,a)=>x.publications.prepare(tx,a.id,x.asset.id,{requestId:randomUUID(),assetRevision:original.asset.revision,editorialRevision:'0',classroomId:x.f.rooms.teach.id,title:'Legacy',unitId:null,topicId:null}));
 assert.equal(existing.created,false);assert.ok(ids.includes(existing.publication.id));assert.equal((await x.service.edit(x.owner,x.asset.id,edit())).editorial.revision,'1');
}));


test('deduplicated prepare receipts replay their exact old version after editing or discarding', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),before=await x.inspect();
 const prepare=input=>x.uow.run(x.owner,true,(tx,a)=>x.publications.prepare(tx,a.id,x.asset.id,input));
 const command={requestId:randomUUID(),assetRevision:before.asset.revision,editorialRevision:'0',classroomId:x.f.rooms.teach.id,title:'Antes',unitId:null,topicId:null};
 const first=await prepare(command),alias={...command,requestId:randomUUID()},legacy={...command,requestId:randomUUID()};delete legacy.editorialRevision;
 for(const input of [alias,legacy])assert.equal((await prepare(input)).publication.id,first.publication.id);
 await x.service.edit(x.owner,x.asset.id,edit());
 for(const input of [alias,legacy]){assert.equal((await prepare(input)).publication.id,first.publication.id);await assert.rejects(prepare({...input,title:'Changed'}),code('CONFLICT'));}
 await x.query("UPDATE foxy_publications SET state='DISCARDED',discarded_at=now(),revision=revision+1 WHERE id=$1",first.publication.id);
 for(const input of [alias,legacy]){const result=await prepare(input);assert.equal(result.publication.id,first.publication.id);assert.equal(result.publication.state,'DISCARDED');}
 assert.equal((await x.query('SELECT count(*)::int n FROM foxy_publications WHERE source_asset_id=$1',x.asset.id))[0].n,1);
}));


test('edit racing discard keeps original bytes and a terminal asset that cannot be edited', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),before=await x.inspect(),{createFoxyPrivateAssetDiscardRepository}=await import('../../../private-assets/infrastructure/private-asset-discard-repository.ts');
 const discard=()=>x.uow.run(x.owner,true,(tx,a)=>createFoxyPrivateAssetDiscardRepository().discard(tx,a.id,x.asset.id,{requestId:randomUUID(),assetRevision:before.asset.revision,confirm:true}));
 const results=await Promise.allSettled([x.service.edit(x.owner,x.asset.id,edit()),discard()]);assert.equal(results[1].status,'fulfilled');
 if(results[0].status==='rejected')assert.equal(results[0].reason.code,'CONFLICT');
 const after=await x.inspect();assert.equal(after.asset.state,'DISCARDED');assert.equal(after.canEdit,false);assert.equal(after.editorial,null);
 const [row]=await x.query('SELECT title,description,digest,blob_deleted_at FROM foxy_visual_assets WHERE id=$1',x.asset.id);assert.equal(row.title,'Original');assert.equal(row.description,'Texto original');assert.equal(row.blob_deleted_at,null);
 await assert.rejects(x.service.edit(x.owner,x.asset.id,edit({expectedRevision:results[0].status==='fulfilled'?'1':'0'})),code('CONFLICT'));
}));

test('real HTTP publication inspection carries its frozen editorial snapshot only to the authorized owner', {timeout:120000},async()=>withAiDatabase(async({pool,database})=>{
 const x=await setup(pool,database),before=await x.inspect();
 const [{createFoxyPublicationRepository},{createFoxyPublicationService},{createFoxyUnitOfWork},{createFoxyHandler},{createServer}]=await Promise.all([
  import('../../../publications/infrastructure/publication-repository.ts'),import('../../../publications/application/publication-service.ts'),import('../../../conversations/infrastructure/unit-of-work.ts'),import('../../../presentation/http.ts'),import('node:http')]);
 const prepared=await x.uow.run(x.owner,true,(tx,a)=>x.publications.prepare(tx,a.id,x.asset.id,{requestId:randomUUID(),assetRevision:before.asset.revision,editorialRevision:'0',classroomId:x.f.rooms.teach.id,title:'Frozen title',unitId:null,topicId:null}));
 await x.service.edit(x.owner,x.asset.id,edit({title:'Current title',description:'Current description'}));
 const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,request)=>request.headers['x-fixture-actor']});
 const publications=createFoxyPublicationService({uow,publications:createFoxyPublicationRepository(),confirmations:{}});
 const handler=createFoxyHandler({publications},{admit:async()=>{}}),server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end();}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/v1/foxy-ai/publications/${prepared.publication.id}`;
 try {
  const response=await fetch(url,{headers:{'x-fixture-actor':x.owner.id},signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);
  const result=await response.json();assert.deepEqual(result.editorialSnapshot,{title:'Frozen title',description:'Texto original',revision:'0'});
  assert.equal(response.headers.get('cache-control'),'no-store');
  for(const actor of [x.f.other,x.f.pupil]){const denied=await fetch(url,{headers:{'x-fixture-actor':actor},signal:AbortSignal.timeout(5000)});assert.ok([403,404].includes(denied.status));assert.doesNotMatch(await denied.text(),/Frozen title|Texto original|editorialSnapshot/);}
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}));
