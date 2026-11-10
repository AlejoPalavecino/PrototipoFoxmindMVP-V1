import { createFoxyFileOperations } from "../../../../bootstrap/foxy-file-integration.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {withAiDatabase} from "../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const profileImage={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const profileDiagram={kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'};
const config={enabled:{IMAGE:true,DIAGRAM:true},profiles:{IMAGE:profileImage,DIAGRAM:profileDiagram},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const graph={schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Esquema sintético',direction:'TOP_DOWN',nodes:[{id:'agua',label:'Agua'},{id:'vapor',label:'Vapor'}],edges:[{from:'agua',to:'vapor',label:'evaporación'}]};
const sha=value=>createHash('sha256').update(value).digest('hex');
test('job frozen profile survives restart without dispatch under changed configuration',{timeout:120000},async()=>{ const kind='IMAGE',classroom=false;
 const [{createFoxyRuntime},{FileService},{FileError}]=await Promise.all([import("../../../../bootstrap/foxy-runtime.ts"),import("../../../files/infrastructure/service.ts"),import("../../../files/domain/errors.ts")]);
 await withAiDatabase(async({pool,database})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor},events=[],blobs=new Map(),pending=new Set();
  const own=fn=>{const promise=Promise.resolve().then(fn);pending.add(promise);void promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;};
  const storage={put:(key,bytes)=>own(async()=>{events.push('put');if(blobs.has(key))throw new FileError('UPLOAD_CONFLICT');blobs.set(key,Buffer.from(bytes));}),
   get:(key,max)=>own(async()=>{events.push('get');const found=blobs.get(key);if(!found)throw new FileError('NOT_FOUND');assert.ok(found.length<=max);return Buffer.from(found);}),
   remove:key=>own(async()=>{events.push('remove');blobs.delete(key)}),drain:async()=>{await Promise.allSettled([...pending]);events.push('drain');}};
  const scanner={scan:async bytes=>{events.push('scan');assert.ok(bytes.length>0);}},files=new FileService({database,access:{authenticate:async()=>{throw Error('unexpected');},authorize:async()=>{throw Error('unexpected');}},storage,scanner,draftQuotaBytes:0n});
  const png=await sharp({create:{width:40,height:30,channels:3,background:'#42886c'}}).png().toBuffer(),provider=type=>({countTokens:async()=>{events.push(`${type}:count`);return 12;},generate:async()=>{events.push(`${type}:generate`);return type==='IMAGE'?{bytes:png,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}}:{diagram:graph,usage:{inputTokens:12,outputTokens:20}};}});
  const options={database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},fileOperations:createFoxyFileOperations(files),storage,configuration:null,provider:null,
   visualConfiguration:config,visualProviders:{IMAGE:provider('IMAGE'),DIAGRAM:provider('DIAGRAM')},visualBudgetLimits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}};
  const runtime=createFoxyRuntime(options);
  try{
   const activity=classroom?await f.activity('teach'):null;if(activity)await query("UPDATE activities SET instructions_text='Actividad sintética' WHERE id=$1",activity.id);
   const context=classroom?{kind:'CLASSROOM',classroomId:f.rooms.teach.id}:{kind:'GENERAL'};
   const {conversation}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Visual sintético',context});
   const started=await runtime.services.visuals.start(owner,conversation.id,{requestId:randomUUID(),revision:'0',kind,prompt:'Crear recurso sintético',selection:{topicIds:[],sourceIds:activity?[`activity:${activity.id}`]:[]},aspectRatio:'1:1'});
   assert.equal(started.job.state,'QUEUED');await runtime.onModuleDestroy();
   const changed={...config,profiles:{...config.profiles,IMAGE:{...profileImage,imageOutputUsdPerMillion:'29',outputUsdPerMillion:'29'}}};
   const restarted=createFoxyRuntime({...options,visualConfiguration:changed});
   try{assert.equal(await restarted.visualWorker.runOnce(),true);const job=await restarted.services.visuals.get(owner,conversation.id,started.job.id);assert.equal(job.state,'FAILED');assert.equal(job.errorCode,'AI_UNAVAILABLE');assert.ok(!events.includes('IMAGE:count'));assert.ok(!events.includes('IMAGE:generate'));const [row]=await query('SELECT dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',job.id);assert.equal(row.dispatch_count,0);assert.equal(BigInt(row.reserved_microusd),0n);}finally{await restarted.onModuleDestroy();}
  }finally{await runtime.onModuleDestroy();}
 });
});
