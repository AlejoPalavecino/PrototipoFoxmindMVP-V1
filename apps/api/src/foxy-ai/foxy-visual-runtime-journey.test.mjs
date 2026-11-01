import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {withAiDatabase} from '../../../../tests/classroom-ai-database.test.mjs';
import {homeFixture} from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const profileImage={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const profileDiagram={kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'};
const config={enabled:{IMAGE:true,DIAGRAM:true},profiles:{IMAGE:profileImage,DIAGRAM:profileDiagram},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const graph={schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Esquema sintético',direction:'TOP_DOWN',nodes:[{id:'agua',label:'Agua'},{id:'vapor',label:'Vapor'}],edges:[{from:'agua',to:'vapor',label:'evaporación'}]};
const sha=value=>createHash('sha256').update(value).digest('hex');
for(const [kind,classroom] of [['IMAGE',false],['DIAGRAM',true]])test(`${kind} composed runtime persists, scans, stores and serves private visual bytes`,{timeout:120000},async()=>{
 const [{createFoxyRuntime},{FileService},{FileError}]=await Promise.all([import('./runtime.ts'),import('../files/service.ts'),import('../files/errors.ts')]);
 await withAiDatabase(async({pool,database})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor},events=[],blobs=new Map(),pending=new Set();
  const own=fn=>{const promise=Promise.resolve().then(fn);pending.add(promise);void promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;};
  const storage={put:(key,bytes)=>own(async()=>{events.push('put');if(blobs.has(key))throw new FileError('UPLOAD_CONFLICT');blobs.set(key,Buffer.from(bytes));}),
   get:(key,max)=>own(async()=>{events.push('get');const found=blobs.get(key);if(!found)throw new FileError('NOT_FOUND');assert.ok(found.length<=max);return Buffer.from(found);}),
   remove:key=>own(async()=>{events.push('remove');blobs.delete(key)}),drain:async()=>{await Promise.allSettled([...pending]);events.push('drain');}};
  const scanner={scan:async bytes=>{events.push('scan');assert.ok(bytes.length>0);}},files=new FileService({database,access:{authenticate:async()=>{throw Error('unexpected');},authorize:async()=>{throw Error('unexpected');}},storage,scanner,draftQuotaBytes:0n});
  const png=await sharp({create:{width:40,height:30,channels:3,background:'#42886c'}}).png().toBuffer(),provider=type=>({countTokens:async()=>{events.push(`${type}:count`);return 12;},generate:async()=>{events.push(`${type}:generate`);return type==='IMAGE'?{bytes:png,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}}:{diagram:graph,usage:{inputTokens:12,outputTokens:20}};}});
  const options={database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},files,storage,configuration:null,provider:null,
   visualConfiguration:config,visualProviders:{IMAGE:provider('IMAGE'),DIAGRAM:provider('DIAGRAM')},visualBudgetLimits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}};
  const runtime=createFoxyRuntime(options);
  try{
   const activity=classroom?await f.activity('teach'):null;if(activity)await query("UPDATE activities SET instructions_text='Actividad sintética' WHERE id=$1",activity.id);
   const context=classroom?{kind:'CLASSROOM',classroomId:f.rooms.teach.id}:{kind:'GENERAL'};
   const {conversation}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Visual sintético',context});
   const started=await runtime.services.visuals.start(owner,conversation.id,{requestId:randomUUID(),revision:'0',kind,prompt:'Crear recurso sintético',selection:{topicIds:[],sourceIds:activity?[`activity:${activity.id}`]:[]},aspectRatio:'1:1'});
   assert.equal(started.job.state,'QUEUED');await assert.rejects(runtime.services.privateAssetReader.readFile(owner,started.job.assetId,'preview',new AbortController().signal));
   assert.equal(await runtime.visualWorker.runOnce(),true);const job=await runtime.services.visuals.get(owner,conversation.id,started.job.id);assert.equal(job.state,'READY');assert.equal(job.assetId,started.job.assetId);
   const result=await runtime.services.privateAssetReader.readFile(owner,job.assetId,'preview',new AbortController().signal),imageBytes=Buffer.from(result.bytes),info=await sharp(imageBytes).metadata();
   assert.equal(result.headers['Content-Type'],'image/png');assert.equal(info.format,'png');assert.equal(events.filter(x=>x===`${kind}:count`).length,1);assert.equal(events.filter(x=>x===`${kind}:generate`).length,1);
   assert.ok(events.includes('put')&&events.includes('scan')&&events.includes('get'));const [asset]=await query('SELECT state,digest,validated_digest,scanned_digest FROM foxy_visual_assets WHERE id=$1',job.assetId);
   assert.equal(asset.state,'READY');assert.equal(asset.digest,sha(imageBytes));assert.equal(asset.validated_digest,asset.digest);assert.equal(asset.scanned_digest,asset.digest);
   await assert.rejects(runtime.services.privateAssetReader.readFile({id:f.other},job.assetId,'preview',new AbortController().signal));await assert.rejects(runtime.services.privateAssetReader.readFile({id:f.pupil},job.assetId,'preview',new AbortController().signal));
   assert.ok((await runtime.services.visuals.list(owner,conversation.id,{limit:10,afterId:null})).items.some(item=>item.id===job.id));
   await runtime.onModuleDestroy();const restarted=createFoxyRuntime(options);
   try{const loaded=await restarted.services.visuals.get(owner,conversation.id,job.id);assert.equal(loaded.state,'READY');const again=await restarted.services.privateAssetReader.readFile(owner,loaded.assetId,'download',new AbortController().signal);assert.equal(sha(again.bytes),asset.digest);assert.equal(events.filter(x=>x===`${kind}:generate`).length,1);}
   finally{await restarted.onModuleDestroy();}
  }finally{await runtime.onModuleDestroy();}
 });
});
