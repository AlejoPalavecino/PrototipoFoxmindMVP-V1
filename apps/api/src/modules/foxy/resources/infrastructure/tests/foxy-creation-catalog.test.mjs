import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { homeFixture } from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
import { createFoxyConversationRepository } from "../../../conversations/infrastructure/conversation-repository.ts";
import { createFoxyTurnRepository } from "../../../turns/infrastructure/turn-repository.ts";
import { createFoxyResourceRepository } from "../resource-repository.ts";
const hash='a'.repeat(64);
test('FOX-01 filters precede pagination, includes unopened READY tools and edited titles, isolates owners', {timeout:120000}, async()=>{
  const {createFoxyCreationRepository}=await import("../creation-repository.ts");
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{
    const f=await homeFixture(query), tx={query}, conversations=createFoxyConversationRepository(), turns=createFoxyTurnRepository();
    const creations=createFoxyCreationRepository(), ids=[];
    for(const [purpose,title] of [['STUDY_MATERIAL','Álgebra 100%_'],['LESSON_PLAN','Plan'],['ACTIVITY_IDEAS','Actividad'],['RUBRIC','Rúbrica'],['CHAT','Charla'],['SUMMARY','Resumen'],['STUDY_MATERIAL','Falta fuente']]){
      const context={kind:'GENERAL'};
      const {conversation:c}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title,context},hash);
      const {turn}=await turns.enqueue(tx,f.teacherActor,c.id,{requestId:randomUUID(),revision:'0',purpose,text:'Crear',selection:{topicIds:[],sourceIds:[]}},
        {context,curriculum:null,sources:[]},hash,{model:'synthetic',promptVersion:'foxy-chat-v2',schemaVersion:'foxy-answer-v1'});
      await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map='[]'::jsonb,source_report='[]'::jsonb WHERE id=$1::uuid",turn.id,
        JSON.stringify({schemaVersion:'foxy-answer-v1',title,markdown:'Contenido',references:[],warnings:[],missingInformation:title==='Falta fuente'?['Falta información seleccionada']:[]}));
      ids.push({c,turn});
    }
    const all=await creations.listPage(tx,f.teacherActor,{limit:2,after:null,q:'',context:'ALL',type:'ALL',status:'ALL'});
    assert.equal(all.items.length,2); assert.ok(all.next);
    const next=await creations.listPage(tx,f.teacherActor,{limit:2,after:all.next,q:'',context:'ALL',type:'ALL',status:'ALL'});
    assert.equal(next.items.length,2); assert.equal(next.next,null);
    assert.equal(new Set([...all.items,...next.items].map(x=>x.id)).size,4);
    assert.deepEqual((await creations.listPage(tx,f.other,{limit:20,after:null})).items,[]);
    const found=await conversations.listPage(tx,f.teacherActor,{limit:1,after:null,q:'100%_',context:'GENERAL'});
    assert.equal(found.items.length,1); assert.equal(found.items[0].id,ids[0].c.id);
    const {conversation:classroomConversation}=await conversations.create(tx,f.teacherActor,{requestId:randomUUID(),title:'Clase privada',context:{kind:'CLASSROOM',classroomId:f.rooms.teach.id}},hash);
    const classroomPage=await conversations.listPage(tx,f.teacherActor,{limit:1,after:null,context:f.rooms.teach.id});
    assert.deepEqual(classroomPage.items.map(c=>c.id),[classroomConversation.id]);
    assert.equal((await conversations.listPage(tx,f.teacherActor,{limit:1,after:null,context:f.rooms.foreign.id})).items.length,0);
    assert.equal((await creations.listPage(tx,f.teacherActor,{limit:1,after:null,context:f.rooms.teach.id})).items.length,0);
    const resources=createFoxyResourceRepository();
    const {resource}=await resources.fromTurn(tx,f.teacherActor,ids[0].c.id,ids[0].turn.id);
    await resources.edit(tx,f.teacherActor,resource.id,{requestId:randomUUID(),revision:resource.revision,title:'Editado privado',markdown:'Contenido'});
    const filtered=await creations.listPage(tx,f.teacherActor,{limit:1,after:null,q:'Editado',type:'NOTE',status:'PRIVATE',context:'GENERAL'});
    assert.equal(filtered.items.length,1); assert.equal(filtered.items[0].title,'Editado privado');
    assert.equal(filtered.items[0].brief,'Crear'); assert.deepEqual(filtered.items[0].selection,{topicIds:[],sourceIds:[]});
    assert.equal(filtered.items[0].turnId,ids[0].turn.id); assert.deepEqual(filtered.items[0].destinations,[]);
    assert.equal((await creations.listPage(tx,f.teacherActor,{limit:1,after:null,q:'100%_'})).items.length,0);
    const {createFoxyPublicationRepository}=await import("../../../publications/infrastructure/publication-repository.ts");
    await createFoxyPublicationRepository().prepare(tx,f.teacherActor,resource.id,{requestId:randomUUID(),resourceRevision:'1',
      classroomId:f.rooms.teach.id,unitId:null,topicId:null,title:'Material'});
    let prepared=(await creations.listPage(tx,f.teacherActor,{limit:1,after:null,status:'PREPARING'})).items[0];
    assert.equal(prepared.id,ids[0].turn.id); assert.equal(prepared.destinations[0].classroomId,f.rooms.teach.id);
    assert.equal(prepared.destinations[0].id,null); assert.equal(prepared.context.kind,'GENERAL');
    const activity=await f.activity('archived',{status:'DRAFT'}),foreign=await f.activity('foreign',{status:'PUBLISHED'});
    for(const a of [activity,foreign]) await query(`INSERT INTO foxy_resource_requests(owner_id,request_id,resource_id,input_hash,result)
      VALUES($1,$2,$3,$4,$5::jsonb)`,f.teacherActor,randomUUID(),resource.id,hash,JSON.stringify({activityId:a.id,classroomId:a.room,revision:'1'}));
    let draft=(await creations.listPage(tx,f.teacherActor,{limit:1,after:null,status:'DRAFT'})).items[0];
    assert.equal(draft.destinations.length,2); assert.ok(draft.destinations.some(d=>d.id===activity.id));
    assert.ok(draft.destinations.every(d=>d.classroomId!==foreign.room));
    await query(`UPDATE activities SET status='PUBLISHED',published_at=now() WHERE id=$1`,activity.id);
    const published=(await creations.listPage(tx,f.teacherActor,{limit:1,after:null,status:'PUBLISHED'})).items[0];
    assert.equal(published.id,ids[0].turn.id); assert.equal(published.destinations.find(d=>d.kind==='ACTIVITY').state,'PUBLISHED');
    await query(`UPDATE activities SET status='WITHDRAWN' WHERE id=$1`,activity.id);
    assert.equal((await creations.listPage(tx,f.teacherActor,{limit:1,after:null,status:'PUBLISHED'})).items.length,0);
    await conversations.remove(tx,f.teacherActor,ids[0].c.id,(await conversations.get(tx,f.teacherActor,ids[0].c.id)).revision);
    assert.equal((await creations.listPage(tx,f.teacherActor,{limit:1,after:null,q:'Editado'})).items.length,0);
  }));
});

test('FOX-01 creation HTTP validates filters/cursors and requires admission, preserves opaque cursor envelope', async()=>{
  const {createServer}=await import('node:http');
  const {createFoxyHandler}=await import("../../../presentation/http.ts");
  const {createFoxyCreationService}=await import("../../application/creation-service.ts");
  const calls=[], owner=randomUUID(), next={createdAt:'2026-01-01T00:00:00.123Z',id:randomUUID()};
  const creations=createFoxyCreationService({uow:{run:async(request,write,fn)=>{assert.equal(write,false);return fn({}, {id:owner});}},
    creations:{listPage:async(tx,id,input)=>{calls.push({id,input});return {items:[],next};}}});
  const handler=createFoxyHandler({creations},{admit:async(req)=>{if(!req.headers.cookie)throw Object.assign(Error('AUTH_REQUIRED'),{code:'AUTH_REQUIRED'});}});
  const server=createServer((req,res)=>handler(req,res,()=>res.end()));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/api/v1/foxy-ai/creations`;
  const send=(query='',headers={cookie:'synthetic'})=>fetch(base+query,{headers});
  try{
    assert.equal((await send('',{})).status,401); assert.equal(calls.length,0);
    const after=Buffer.from(JSON.stringify(next)).toString('base64url');
    const response=await send(`?limit=3&q=100%25_&context=GENERAL&type=NOTE&status=PRIVATE&after=${after}`);
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),{items:[],next});
    assert.deepEqual(calls[0],{id:owner,input:{limit:3,q:'100%_',context:'GENERAL',type:'NOTE',status:'PRIVATE',after:next}});
    for(const query of ['?limit=51','?q='+ 'x'.repeat(121),'?context=OTHER','?type=CHAT','?status=READY','?after=bad',
      '?q=a&q=b','?ownerId='+randomUUID(),'?after='+Buffer.from(JSON.stringify({...next,createdAt:'2026-02-30T00:00:00.000Z'})).toString('base64url')])
      assert.equal((await send(query)).status,400,query);
    assert.equal(calls.length,1);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});

test('FOX-01 composed visual catalogue shows only available READY assets and actual confirmed materials', {timeout:120000},async()=>{
  const [{createFoxyRuntime},{FileService},{createFoxyFileOperations},{withAiDatabase},sharpModule]=await Promise.all([
    import("../../../../../bootstrap/foxy-runtime.ts"),import("../../../../files/custody/infrastructure/service.ts"),import("../../../../../bootstrap/foxy-file-integration.ts"),
    import("../../../../../../../../tests/classroom-ai-database.test.mjs"),import('sharp')]);
  await withAiDatabase(async({pool,database})=>{
    const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor},blobs=new Map();
    const storage={put:async(key,bytes)=>{blobs.set(key,Buffer.from(bytes));},get:async key=>Buffer.from(blobs.get(key)),remove:async key=>{blobs.delete(key);}};
    const files=new FileService({database,access:{authenticate:async(_tx,req)=>req.id,authorize:async()=>{}},storage,scanner:{scan:async()=>{}},draftQuotaBytes:0n});
    const profile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
    const bytes=await sharpModule.default({create:{width:40,height:30,channels:3,background:'#228866'}}).png().toBuffer();
    let generationCalls=0;
    const provider={countTokens:async()=>12,generate:async()=>{generationCalls++;return {bytes,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}};}};
    const runtime=createFoxyRuntime({database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},
      fileOperations:createFoxyFileOperations(files),storage,configuration:null,provider:null,
      visualConfiguration:{enabled:{IMAGE:true,DIAGRAM:false},profiles:{IMAGE:profile,DIAGRAM:null},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000},
      visualProviders:{IMAGE:provider,DIAGRAM:provider},visualBudgetLimits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}});
    try{
      const {conversation:c}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Imagen',context:{kind:'GENERAL'}});
      const started=await runtime.services.visuals.start(owner,c.id,{requestId:randomUUID(),revision:'0',kind:'IMAGE',prompt:'Imagen sintética',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1'});
      assert.equal((await runtime.services.creations.list(owner,{limit:5})).items.length,0);
      assert.equal(await runtime.visualWorker.runOnce(),true);
      const list=()=>runtime.services.creations.list(owner,{limit:5,type:'IMAGE'});
      const item=(await list()).items[0];
      assert.equal(item.visualJobId,started.job.id);assert.equal(item.assetId,started.job.assetId);assert.equal(item.turnId,null);
      assert.equal(item.status,'PRIVATE');assert.deepEqual(item.destinations,[]);
      await assert.rejects(runtime.services.creations.list({id:f.pupil},{limit:5}),e=>e.code==='FORBIDDEN');
      assert.deepEqual((await runtime.services.creations.list({id:f.other},{limit:5})).items,[]);
      await query('UPDATE users SET email_verified_at=NULL WHERE id=$1',f.other);
      await assert.rejects(runtime.services.creations.list({id:f.other},{limit:5}),e=>e.code==='FORBIDDEN');
      const [asset]=await query('SELECT revision FROM foxy_visual_assets WHERE id=$1',item.assetId);
      const p=await runtime.services.publications.prepareVisual(owner,item.assetId,{requestId:randomUUID(),assetRevision:String(asset.revision),classroomId:f.rooms.teach.id,title:'Imagen revisada',unitId:null,topicId:null});
      assert.equal((await list()).items[0].status,'PREPARING');
      assert.equal(await runtime.publicationWorker.runOnce(),true);
      const inspection=await runtime.services.publications.inspect(owner,p.publication.id);
      const receipt=await runtime.services.publications.confirm(owner,p.publication.id,{requestId:randomUUID(),publicationRevision:inspection.publication.revision,classroomRevision:inspection.classroomRevision,confirm:true});
      const published=(await list()).items[0];
      assert.equal(published.status,'PUBLISHED');assert.deepEqual(published.destinations,[{kind:'MATERIAL',classroomId:f.rooms.teach.id,classroomName:'teach',id:receipt.materialId,state:'PUBLISHED'}]);
      assert.equal(generationCalls,1);
    }finally{await runtime.onModuleDestroy();}
  });
});
