import { createFoxyFileOperations } from "../../../../bootstrap/foxy-file-integration.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {withAiDatabase} from "../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";
const profile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const config={enabled:{IMAGE:true,DIAGRAM:false},profiles:{IMAGE:profile,DIAGRAM:null},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const diagramProfile={kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'};
const diagram={schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Esquema sintético',direction:'TOP_DOWN',nodes:[{id:'a',label:'Agua'},{id:'b',label:'Vapor'}],edges:[{from:'a',to:'b',label:'Evaporación'}]};
for(const modality of ['PNG','JPEG']) test(`${modality} discarded publication cleans only the P4 copy after lease expiry`, {timeout:180000},async()=>{
 const [{createFoxyRuntime},{FileService},{FileError}]=await Promise.all([import("../../../../bootstrap/foxy-runtime.ts"),import("../../../files/infrastructure/service.ts"),import("../../../files/domain/errors.ts")]);
 await withAiDatabase(async({pool,database})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor},blobs=new Map(),pending=new Set();
  const own=fn=>{const p=Promise.resolve().then(fn);pending.add(p);void p.then(()=>pending.delete(p),()=>pending.delete(p));return p;};
  const storage={put:(key,bytes)=>own(async()=>{if(blobs.has(key))throw new FileError('UPLOAD_CONFLICT');blobs.set(key,Buffer.from(bytes));}),get:(key,max)=>own(async()=>{const b=blobs.get(key);if(!b)throw new FileError('NOT_FOUND');assert.ok(b.length<=max);return Buffer.from(b)}),remove:key=>own(async()=>{blobs.delete(key)}),drain:async()=>{await Promise.allSettled([...pending])}};
  const files=new FileService({database,access:{authenticate:async(_tx,req)=>req.id,authorize:async()=>{}},storage,scanner:{scan:async()=>{}},draftQuotaBytes:0n});
  const kind=modality==='DIAGRAM'?'DIAGRAM':'IMAGE',mime=modality==='JPEG'?'image/jpeg':'image/png',image=sharp({create:{width:40,height:30,channels:3,background:'#228866'}}),bytes=await (modality==='JPEG'?image.jpeg():image.png()).toBuffer();
  const provider={countTokens:async()=>12,generate:async()=>kind==='IMAGE'?{bytes,declaredMimeType:mime,usage:{inputTokens:12,outputTokens:20}}:{diagram,usage:{inputTokens:12,outputTokens:20}}};
  const visualConfiguration={...config,enabled:{IMAGE:true,DIAGRAM:true},profiles:{IMAGE:profile,DIAGRAM:diagramProfile}};
  const runtime=createFoxyRuntime({database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},fileOperations:createFoxyFileOperations(files),storage,configuration:null,provider:null,visualConfiguration,visualProviders:{IMAGE:provider,DIAGRAM:provider},visualBudgetLimits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}});
  try{const {conversation}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Publicación sintética',context:{kind:'GENERAL'}});
   const started=await runtime.services.visuals.start(owner,conversation.id,{requestId:randomUUID(),revision:'0',kind,prompt:'Imagen sintética',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1'});assert.equal(await runtime.visualWorker.runOnce(),true);
   const [asset]=await query('SELECT revision,state FROM foxy_visual_assets WHERE id=$1',started.job.assetId);assert.equal(asset.state,'READY');
   const input={requestId:randomUUID(),assetRevision:String(asset.revision),classroomId:f.rooms.teach.id,title:'Imagen revisada',unitId:null,topicId:null};
   await assert.rejects(runtime.services.publications.prepareVisual({id:f.other},started.job.assetId,{...input,requestId:randomUUID()}));
   await assert.rejects(runtime.services.publications.prepareVisual({id:f.pupil},started.job.assetId,{...input,requestId:randomUUID()}));
   await assert.rejects(runtime.services.publications.prepareVisual(owner,started.job.assetId,{...input,requestId:randomUUID(),assetRevision:'999'}));
   const p=await runtime.services.publications.prepareVisual(owner,started.job.assetId,input),replay=await runtime.services.publications.prepareVisual(owner,started.job.assetId,input);assert.equal(p.created,true);assert.equal(replay.created,false);assert.equal(p.publication.id,replay.publication.id);assert.equal(p.publication.sourceKind,'VISUAL');
   await assert.rejects(query('UPDATE foxy_publications SET snapshot_visual=NULL WHERE id=$1',p.publication.id),e=>e.code==='23514');
   await assert.rejects(query('UPDATE foxy_publications SET resource_id=$2 WHERE id=$1',p.publication.id,randomUUID()),e=>e.code==='23514');
   for(const changed of [{snapshot_visual:null},{snapshot_visual:{}},{resource_id:randomUUID()},{source_asset_id:null}]) {
    const patch={id:randomUUID(),request_id:randomUUID(),...changed};
    await assert.rejects(query(`INSERT INTO foxy_publications SELECT (jsonb_populate_record(NULL::foxy_publications,to_jsonb(p)||$2::jsonb)).* FROM foxy_publications p WHERE p.id=$1`,p.publication.id,JSON.stringify(patch)),e=>e.code==='23514');
   }
   const [before]=await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1',f.rooms.teach.id);assert.equal(before.n,0);
   assert.equal(await runtime.publicationWorker.runOnce(),true);const inspection=await runtime.services.publications.inspect(owner,p.publication.id);assert.equal(inspection.publication.state,'READY');
   const [stillPrivate]=await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1',f.rooms.teach.id);assert.equal(stillPrivate.n,0);
   const {createFoxyPublicationCleanup}=await import("../publication-cleanup.ts");
   await runtime.services.publicationManagement.discard(owner,p.publication.id,{requestId:randomUUID(),publicationRevision:inspection.publication.revision,confirm:true});
   const [copy]=await query('SELECT c.lease_until,clock_timestamp() now,f.storage_key FROM foxy_publications p JOIN file_custodies c ON c.file_id=p.file_id JOIN files f ON f.id=p.file_id WHERE p.id=$1',p.publication.id);
   assert.ok(blobs.has(copy.storage_key));const [source]=await query('SELECT storage_key,charge_bytes FROM foxy_visual_assets WHERE id=$1',started.job.assetId);assert.ok(blobs.has(source.storage_key));
   await new Promise(r=>setTimeout(r,Math.max(0,copy.lease_until-copy.now)+150));const cleanup=createFoxyPublicationCleanup({database,storage});
   try{assert.equal(await cleanup.sweep(),true);assert.equal((await runtime.services.publicationManagement.inspect(owner,p.publication.id)).cleanupState,'DONE');assert.equal(blobs.has(copy.storage_key),false);assert.equal(blobs.has(source.storage_key),true);const [after]=await query('SELECT state,charge_bytes FROM foxy_visual_assets WHERE id=$1',started.job.assetId);assert.equal(after.state,'READY');assert.equal(String(after.charge_bytes),String(source.charge_bytes));}finally{await cleanup.onModuleDestroy();}
  }finally{await runtime.onModuleDestroy()}
 });
});
