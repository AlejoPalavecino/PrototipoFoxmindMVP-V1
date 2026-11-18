import { createFoxyFileOperations } from "../../../../../bootstrap/foxy-file-integration.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {withAiDatabase} from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const profileImage={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const profileDiagram={kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'};
const config={enabled:{IMAGE:true,DIAGRAM:true},profiles:{IMAGE:profileImage,DIAGRAM:profileDiagram},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const graph={schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Esquema sintético',direction:'TOP_DOWN',nodes:[{id:'agua',label:'Agua'},{id:'vapor',label:'Vapor'}],edges:[{from:'agua',to:'vapor',label:'evaporación'}]};
const sha=value=>createHash('sha256').update(value).digest('hex');
const openingBrief='Para enseñar apertura, dibujá sobre fondo blanco dos círculos del mismo tamaño, uno con abertura pequeña y otro con abertura grande. Dos flechas frente al primero y seis frente al segundo. Una comparación sencilla y sin texto.';
for(const [kind,classroom,local] of [['IMAGE',false,false],['DIAGRAM',true,false],['IMAGE',false,true]])test(`${kind} ${local?'local':'provider'} visual is scanned, persisted and served privately`,{timeout:120000},async()=>{
 const [{createFoxyRuntime},{FileService},{FileError}]=await Promise.all([import("../../../../../bootstrap/foxy-runtime.ts"),import("../../../../files/custody/infrastructure/service.ts"),import("../../../../files/domain/errors.ts")]);
 await withAiDatabase(async({pool,database})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor},events=[],blobs=new Map(),pending=new Set();
  const own=fn=>{const promise=Promise.resolve().then(fn);pending.add(promise);void promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;};
  const storage={put:(key,bytes)=>own(async()=>{events.push('put');if(blobs.has(key))throw new FileError('UPLOAD_CONFLICT');blobs.set(key,Buffer.from(bytes));}),
   get:(key,max)=>own(async()=>{events.push('get');const found=blobs.get(key);if(!found)throw new FileError('NOT_FOUND');assert.ok(found.length<=max);return Buffer.from(found);}),
   remove:key=>own(async()=>{events.push('remove');blobs.delete(key)}),drain:async()=>{await Promise.allSettled([...pending]);events.push('drain');}};
  const scanner={scan:async bytes=>{events.push('scan');assert.ok(bytes.length>0);}},files=new FileService({database,access:{authenticate:async()=>{throw Error('unexpected');},authorize:async()=>{throw Error('unexpected');}},storage,scanner,draftQuotaBytes:0n});
  const png=await sharp({create:{width:40,height:30,channels:3,background:'#42886c'}}).png().toBuffer(),provider=type=>({countTokens:async()=>{events.push(`${type}:count`);return 12;},generate:async()=>{events.push(`${type}:generate`);return type==='IMAGE'?{bytes:png,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}}:{diagram:graph,usage:{inputTokens:12,outputTokens:20}};}});
  const options={database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},fileOperations:createFoxyFileOperations(files),storage,configuration:null,provider:null,
   visualConfiguration:local?{...config,privateQuotaBytes:20971520n,profiles:{...config.profiles,IMAGE:{...profileImage,profileVersion:'foxy-gemini-image-v4'}}}:config,
   visualProviders:{IMAGE:provider('IMAGE'),DIAGRAM:provider('DIAGRAM')},visualBudgetLimits:{dailyBudgetUsd:local?0.000001:1,dailyActorRequests:local?1:5,dailyGlobalRequests:10}};
  const runtime=createFoxyRuntime(options);
  try{
   const activity=classroom?await f.activity('teach'):null;if(activity)await query("UPDATE activities SET instructions_text='Actividad sintética' WHERE id=$1",activity.id);
   const context=classroom?{kind:'CLASSROOM',classroomId:f.rooms.teach.id}:{kind:'GENERAL'};
   const {conversation}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Visual sintético',context});
   const input={requestId:randomUUID(),revision:'0',kind,prompt:local?openingBrief:'Crear recurso sintético',selection:{topicIds:[],sourceIds:activity?[`activity:${activity.id}`]:[]},aspectRatio:'1:1'};
   const started=await runtime.services.visuals.start(owner,conversation.id,input);
   assert.equal(started.job.state,'QUEUED');await assert.rejects(runtime.services.privateAssetReader.readFile(owner,started.job.assetId,'preview',new AbortController().signal));
   assert.equal(await runtime.visualWorker.runOnce(),true);const job=await runtime.services.visuals.get(owner,conversation.id,started.job.id);assert.equal(job.state,'READY');assert.equal(job.assetId,started.job.assetId);
   const result=await runtime.services.privateAssetReader.readFile(owner,job.assetId,'preview',new AbortController().signal),imageBytes=Buffer.from(result.bytes),info=await sharp(imageBytes).metadata();
   assert.equal(result.headers['Content-Type'],'image/png');assert.equal(info.format,'png');assert.equal(events.filter(x=>x===`${kind}:count`).length,local?0:1);assert.equal(events.filter(x=>x===`${kind}:generate`).length,local?0:1);
   assert.ok(events.includes('put')&&events.includes('scan')&&events.includes('get'));const [asset]=await query('SELECT state,digest,validated_digest,scanned_digest FROM foxy_visual_assets WHERE id=$1',job.assetId);
   assert.equal(asset.state,'READY');assert.equal(asset.digest,sha(imageBytes));assert.equal(asset.validated_digest,asset.digest);assert.equal(asset.scanned_digest,asset.digest);
   await assert.rejects(runtime.services.privateAssetReader.readFile({id:f.other},job.assetId,'preview',new AbortController().signal));await assert.rejects(runtime.services.privateAssetReader.readFile({id:f.pupil},job.assetId,'preview',new AbortController().signal));
   assert.ok((await runtime.services.visuals.list(owner,conversation.id,{limit:10,afterId:null})).items.some(item=>item.id===job.id));
   if(local){
    assert.deepEqual([info.width,info.height],[1600,1600]);
    const [dispatch]=await query('SELECT dispatch_count,preflight_tokens,reserved_microusd,input_tokens,output_tokens FROM foxy_visual_jobs WHERE id=$1',job.id);
    assert.deepEqual(dispatch,{dispatch_count:1,preflight_tokens:null,reserved_microusd:'0',input_tokens:'0',output_tokens:null});
    const usage=await query("SELECT request_count,reserved_microusd,consumed_microusd,input_tokens,output_tokens FROM ai_usage_daily WHERE scope IN ('global',$1)",owner.id);
    assert.equal(usage.length,2);
    for(const row of usage) assert.deepEqual(row,{request_count:1,reserved_microusd:'0',consumed_microusd:'0',input_tokens:'0',output_tokens:'0'});
    const nextChat=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Otro visual',context});
    const next=await runtime.services.visuals.start(owner,nextChat.conversation.id,{...input,requestId:randomUUID()});
    assert.equal(await runtime.visualWorker.runOnce(),true);
    const exceeded=await runtime.services.visuals.get(owner,nextChat.conversation.id,next.job.id);
    assert.equal(exceeded.state,'FAILED');assert.equal(exceeded.errorCode,'AI_BUDGET_EXCEEDED');
   }
   await runtime.onModuleDestroy();const restarted=createFoxyRuntime(options);
   try{const loaded=await restarted.services.visuals.get(owner,conversation.id,job.id);assert.equal(loaded.state,'READY');const again=await restarted.services.privateAssetReader.readFile(owner,loaded.assetId,'download',new AbortController().signal);assert.equal(sha(again.bytes),asset.digest);assert.equal(events.filter(x=>x===`${kind}:generate`).length,local?0:1);}
   finally{await restarted.onModuleDestroy();}
  }finally{await runtime.onModuleDestroy();}
 });
});
