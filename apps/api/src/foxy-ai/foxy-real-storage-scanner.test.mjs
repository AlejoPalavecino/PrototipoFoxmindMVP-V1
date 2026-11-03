import { createFoxyFileOperations } from '../foxy-file-integration.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {withP4Services} from '../../../../scripts/p4-services.mjs';
import {S3Storage} from '../files/storage.ts';
import {ClamdScanner} from '../files/scanner.ts';
test('isolated real storage and scanner accept a synthetic Foxy image and reject EICAR', {timeout:360000}, async()=>{
 await withP4Services(async env=>{
  const storage=new S3Storage(env.s3,'foxmind-private');const scanner=new ClamdScanner(env.scannerHost,env.scannerPort);
  const key=`foxy-assets/${randomUUID()}/${randomUUID()}`;const png=await sharp({create:{width:20,height:20,channels:3,background:'#227744'}}).png().toBuffer();
  try {await scanner.scan(png);await storage.put(key,png);assert.deepEqual(await storage.get(key,png.length),png);
   await assert.rejects(storage.put(key,png),e=>e.code==='UPLOAD_CONFLICT');
   const eicar=Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
   await assert.rejects(scanner.scan(eicar),e=>e.code==='FILE_REJECTED');
  } finally {await storage.drain();}
 });
});
test('Foxy visual image reaches confirmed library with isolated real S3 and scanner', {timeout:360000}, async()=>{
 await withP4Services(async env=>{
  const [{default:pg},{readdir,readFile},{transactionDatabase},{homeFixture},{createFoxyRuntime},{FileService}]=await Promise.all([import('pg'),import('node:fs/promises'),import('../../../../tests/classroom-ai-database.test.mjs'),import('../../../../tests/foxmind-3d-repository-fixture.test.mjs'),import('./runtime.ts'),import('../files/service.ts')]);
  const pool=new pg.Pool({connectionString:env.databaseUrl,max:10,connectionTimeoutMillis:2000,statement_timeout:5000});
  const storage=new S3Storage(env.s3,'foxmind-private');const scanner=new ClamdScanner(env.scannerHost,env.scannerPort);let runtime;
  try {
   for(const migration of (await readdir('prisma/migrations')).filter(x=>/^\d+_/.test(x)).sort()) await pool.query(await readFile(`prisma/migrations/${migration}/migration.sql`,'utf8'));
   const database=transactionDatabase(pool),query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor};
   const files=new FileService({database,access:{authenticate:async(_tx,req)=>req.id,authorize:async()=>{}},storage,scanner,draftQuotaBytes:0n});
   const bytes=await sharp({create:{width:40,height:30,channels:3,background:'#228866'}}).png().toBuffer();let generations=0;
   const provider={countTokens:async()=>12,generate:async()=>{generations++;return {bytes,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}}}};
   const profile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
   runtime=createFoxyRuntime({database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},fileOperations:createFoxyFileOperations(files),storage,configuration:null,provider:null,visualConfiguration:{enabled:{IMAGE:true,DIAGRAM:false},profiles:{IMAGE:profile,DIAGRAM:null},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000},visualProviders:{IMAGE:provider,DIAGRAM:null},visualBudgetLimits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}});
   const {conversation}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Prueba sintética',context:{kind:'GENERAL'}});
   const started=await runtime.services.visuals.start(owner,conversation.id,{requestId:randomUUID(),revision:'0',kind:'IMAGE',prompt:'Imagen sintética',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1'});
   assert.equal(await runtime.visualWorker.runOnce(),true);const [asset]=await query('SELECT revision,state,storage_key FROM foxy_visual_assets WHERE id=$1',started.job.assetId);assert.equal(asset.state,'READY');assert.deepEqual(await storage.get(asset.storage_key,bytes.length),bytes);
   const p=await runtime.services.publications.prepareVisual(owner,started.job.assetId,{requestId:randomUUID(),assetRevision:String(asset.revision),classroomId:f.rooms.teach.id,title:'Imagen revisada',unitId:null,topicId:null});
   assert.equal((await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1',f.rooms.teach.id))[0].n,0);assert.equal(await runtime.publicationWorker.runOnce(),true);
   const inspection=await runtime.services.publications.inspect(owner,p.publication.id);assert.equal(inspection.publication.state,'READY');
   const receipt=await runtime.services.publications.confirm(owner,p.publication.id,{requestId:randomUUID(),publicationRevision:inspection.publication.revision,classroomRevision:inspection.classroomRevision,confirm:true});
   const [file]=await query('SELECT f.storage_key FROM materials m JOIN files f ON f.id=m.file_id WHERE m.id=$1',receipt.materialId);assert.notEqual(file.storage_key,asset.storage_key);assert.deepEqual(await storage.get(file.storage_key,bytes.length),bytes);assert.equal(generations,1);
  } finally {await runtime?.onModuleDestroy();await storage.drain();await pool.end();}
 });
});