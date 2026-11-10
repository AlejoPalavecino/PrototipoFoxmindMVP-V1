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
for(const modality of ['PNG','JPEG','DIAGRAM']) test(`${modality} publication remains private until explicit confirmation and replays atomically`, {timeout:120000},async()=>{
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
   const confirm={requestId:randomUUID(),publicationRevision:inspection.publication.revision,classroomRevision:inspection.classroomRevision,confirm:true},receipt=await runtime.services.publications.confirm(owner,p.publication.id,confirm);assert.deepEqual(await runtime.services.publications.confirm(owner,p.publication.id,confirm),receipt);
   const [after]=await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1',f.rooms.teach.id);assert.equal(after.n,1);assert.ok(receipt.materialId);
   const [published]=await query('SELECT f.detected_mime_type,f.extension FROM materials m JOIN files f ON f.id=m.file_id WHERE m.id=$1',receipt.materialId);assert.equal(published.detected_mime_type,mime);assert.equal(published.extension,mime==='image/jpeg'?'jpg':'png');
   const [{createFoxyPrivateAssetDiscardRepository},{createFoxyPrivateAssetDiscardService},{createFoxyUnitOfWork}]=await Promise.all([import("../private-asset-discard-repository.ts"),import("../../application/private-asset-discard-service.ts"),import("../unit-of-work.ts")]);
   const discard=createFoxyPrivateAssetDiscardService({uow:createFoxyUnitOfWork({database,authenticate:async(_tx,req)=>req.id}),assets:createFoxyPrivateAssetDiscardRepository()});
   const discarded=await discard.discard(owner,started.job.assetId,{requestId:randomUUID(),assetRevision:String(asset.revision),confirm:true});
   await assert.rejects(runtime.services.publications.prepareVisual(owner,started.job.assetId,{...input,requestId:randomUUID(),assetRevision:discarded.assetRevision}));
  }finally{await runtime.onModuleDestroy()}
 });
});
