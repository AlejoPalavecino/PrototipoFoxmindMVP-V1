import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {createFoxyFileOperations} from '../../../../../bootstrap/foxy-file-integration.ts';
import {withAiDatabase} from '../../../../../../../../tests/classroom-ai-database.test.mjs';
import {homeFixture} from '../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs';

for(const kind of ['IMAGE','DIAGRAM']) test(`${kind} old prepared publication survives edits and new explicit publication keeps its own body`,{timeout:120000},async()=>{
 const [{createFoxyRuntime},{FileService}]=await Promise.all([import('../../../../../bootstrap/foxy-runtime.ts'),import('../../../../files/custody/infrastructure/service.ts')]);
 await withAiDatabase(async({pool,database})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor},blobs=new Map();
  const storage={put:async(key,bytes)=>{assert.equal(blobs.has(key),false);blobs.set(key,Buffer.from(bytes));},get:async(key)=>{assert.ok(blobs.has(key));return Buffer.from(blobs.get(key));},remove:async key=>{blobs.delete(key)},drain:async()=>{}};
  const files=new FileService({database,access:{authenticate:async(_tx,req)=>req.id,authorize:async()=>{}},storage,scanner:{scan:async()=>{}},draftQuotaBytes:0n});
  const bytes=await sharp({create:{width:40,height:30,channels:3,background:'#228866'}}).png().toBuffer();
  const diagram={schemaVersion:'foxy-diagram-v1',title:'Original',description:'Texto original',direction:'TOP_DOWN',nodes:[{id:'a',label:'Agua'},{id:'b',label:'Vapor'}],edges:[{from:'a',to:'b',label:'Evaporación'}]};
  const profile={kind,model:kind==='IMAGE'?'gemini-3.1-flash-lite-image':'synthetic',profileVersion:kind==='IMAGE'?'foxy-gemini-image-v1':'foxy-diagram-provider-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',...(kind==='IMAGE'?{textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'}:{})};
  const provider={countTokens:async()=>12,generate:async()=>({...kind==='IMAGE'?{bytes,declaredMimeType:'image/png'}:{diagram},usage:{inputTokens:12,outputTokens:20}})};
  const visualConfiguration={enabled:{IMAGE:kind==='IMAGE',DIAGRAM:kind==='DIAGRAM'},profiles:{IMAGE:kind==='IMAGE'?profile:null,DIAGRAM:kind==='DIAGRAM'?profile:null},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
  const runtime=createFoxyRuntime({database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},fileOperations:createFoxyFileOperations(files),storage,configuration:null,provider:null,visualConfiguration,visualProviders:{[kind]:provider},visualBudgetLimits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}});
  try {
   const {conversation}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Versiones sintéticas',context:{kind:'GENERAL'}});
   const started=await runtime.services.visuals.start(owner,conversation.id,{requestId:randomUUID(),revision:'0',kind,prompt:'Visual original',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1'});
   assert.equal(await runtime.visualWorker.runOnce(),true);
   const job=await runtime.services.visuals.get(owner,conversation.id,started.job.id);assert.equal(job.state,'READY',JSON.stringify(job));
   const assetId=started.job.assetId,original=await runtime.services.privateAssetReadService.inspect(owner,assetId),assetRow=(await query('SELECT * FROM foxy_visual_assets WHERE id=$1',assetId))[0],originalBytes=Buffer.from(blobs.get(assetRow.storage_key));
   const prepare={requestId:randomUUID(),assetRevision:original.asset.revision,editorialRevision:'0',classroomId:f.rooms.teach.id,title:'Primera publicación',unitId:null,topicId:null};
   const old=await runtime.services.publications.prepareVisual(owner,assetId,prepare);
   const saved=await runtime.services.privateAssetEditorial.edit(owner,assetId,{requestId:randomUUID(),expectedRevision:'0',title:'Edición guardada',description:'Texto editorial nuevo'});
   assert.equal(saved.asset.revision,original.asset.revision);assert.deepEqual(saved.payload,original.payload);
   const catalog=await runtime.services.creations.list(owner,{limit:20,after:null});assert.equal(catalog.items.find(row=>row.assetId===assetId).title,'Edición guardada');
   assert.equal(await runtime.publicationWorker.runOnce(),true);
   async function publish(id) {const inspection=await runtime.services.publications.inspect(owner,id);assert.equal(inspection.publication.state,'READY');const command={requestId:randomUUID(),publicationRevision:inspection.publication.revision,classroomRevision:inspection.classroomRevision,confirm:true};const receipt=await runtime.services.publications.confirm(owner,id,command);assert.deepEqual(await runtime.services.publications.confirm(owner,id,command),receipt);return receipt;}
   const first=await publish(old.publication.id);
   const current=await runtime.services.publications.prepareVisual(owner,assetId,{...prepare,requestId:randomUUID(),editorialRevision:'1',title:saved.editorial.title});
   assert.notEqual(current.publication.id,old.publication.id);assert.equal(await runtime.publicationWorker.runOnce(),true);
   const second=await publish(current.publication.id);
   const materials=await query('SELECT id,title,body FROM materials WHERE id=ANY($1::uuid[]) ORDER BY title',[first.materialId,second.materialId]);
   assert.deepEqual(materials.map(row=>[row.title,row.body]),[['Edición guardada','Texto editorial nuevo'],['Primera publicación',original.editorial.description]]);
   assert.deepEqual(blobs.get(assetRow.storage_key),originalBytes);
   for(const receipt of [first,second]){const [row]=await query('SELECT f.storage_key FROM materials m JOIN files f ON f.id=m.file_id WHERE m.id=$1',receipt.materialId);assert.deepEqual(blobs.get(row.storage_key),originalBytes);}
   await runtime.services.privateAssetEditorial.edit(owner,assetId,{requestId:randomUUID(),expectedRevision:'1',title:'Otra versión',description:'No cambia las copias'});
   assert.deepEqual(await query('SELECT id,title,body FROM materials WHERE id=ANY($1::uuid[]) ORDER BY title',[first.materialId,second.materialId]),materials);
  } finally {await runtime.onModuleDestroy();}
 });
});
