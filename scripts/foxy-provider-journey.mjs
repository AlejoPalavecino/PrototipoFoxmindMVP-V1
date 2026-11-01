import { loadEnvFile } from 'node:process';
import { randomUUID } from 'node:crypto';
import { mkdir, open, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import pg from 'pg';
import sharp from 'sharp';
import { withP4Services } from './p4-services.mjs';
import { transactionDatabase } from '../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../tests/foxmind-3d-repository-fixture.test.mjs';
import { S3Storage } from '../apps/api/src/files/storage.ts';
import { ClamdScanner } from '../apps/api/src/files/scanner.ts';
import { FileService } from '../apps/api/src/files/service.ts';
import { createFileAccess } from '../apps/api/src/files/access.ts';
import { createFoxyRuntime } from '../apps/api/src/foxy-ai/runtime.ts';
import { readAiConfiguration } from '../apps/api/src/ai/configuration.ts';
import { readFoxyVisualConfiguration } from '../apps/api/src/foxy-ai/visual-configuration.ts';
import { createGeminiFoxyImageAdapter } from '../apps/api/src/ai/foxy-image-adapter.ts';
import { createGeminiFoxyDiagramAdapter } from '../apps/api/src/ai/foxy-diagram-adapter.ts';

async function main() {
  const arg = process.argv.find(x => x.startsWith('--attempt-id='));
  const id = arg?.slice('--attempt-id='.length);
  const synthetic = process.argv.includes('--synthetic');
  if (synthetic && process.argv.includes('--live-authorized')) throw new Error('Synthetic and live modes are mutually exclusive');
  if ((!synthetic && !process.argv.includes('--live-authorized')) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id ?? '')) throw new Error('Explicit authorization and UUID attempt required');
  if (!synthetic && Object.keys(process.env).some(k => k.startsWith('AI_') || k === 'FOXY_PRIVATE_ASSET_QUOTA_BYTES')) throw new Error('Inherited AI configuration is not allowed');
  await mkdir('.test-artifacts', { recursive: true });
  const receipt = await open(resolve('.test-artifacts', `foxy-live-${id}.jsonl`), 'wx', 0o600);
  async function record(event) { await receipt.write(`${JSON.stringify(event)}\n`); await receipt.sync(); }
  try {
    await record({ stage: 'CREATED' });
    if (!synthetic) loadEnvFile('.env.foxy-test');
    const ai = synthetic ? {dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10} : readAiConfiguration(process.env);
    const profiles = synthetic ? {
      IMAGE:{kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'},
      DIAGRAM:{kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'},
    } : null;
    const host = synthetic ? {configuration:{enabled:{IMAGE:true,DIAGRAM:true},profiles,privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000},providerDeadlineMs:30000} : readFoxyVisualConfiguration(process.env, ai);
    if (!ai || !host?.configuration.profiles.IMAGE || !host.configuration.profiles.DIAGRAM) throw new Error('Visual configuration incomplete');
    const adapters = {};
    for (const kind of ['IMAGE','DIAGRAM']) {
      const p = host.configuration.profiles[kind], config = { model:p.model, profileVersion:p.profileVersion,maxInputTokens:p.maxInputTokens,maxOutputTokens:p.maxOutputTokens,deadlineMs:host.providerDeadlineMs };
      const png = synthetic && kind === 'IMAGE' ? await sharp({create:{width:40,height:30,channels:3,background:'#228866'}}).png().toBuffer() : null;
      const graph = {schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Esquema sintÃƒÆ’Ã‚Â©tico',direction:'TOP_DOWN',nodes:[{id:'agua',label:'Agua'},{id:'vapor',label:'Vapor'}],edges:[{from:'agua',to:'vapor',label:'evaporaciÃƒÆ’Ã‚Â³n'}]};
      const adapter = synthetic ? {countTokens:async()=>12,generate:async()=>kind === 'IMAGE' ? {bytes:png,declaredMimeType:'image/png',usage:{inputTokens:12,outputTokens:20}} : {diagram:graph,usage:{inputTokens:12,outputTokens:20}}} : kind === 'IMAGE' ? createGeminiFoxyImageAdapter({apiKey:ai.apiKey,configuration:config}) : createGeminiFoxyDiagramAdapter({apiKey:ai.apiKey,configuration:config});
      let counted = false, dispatched = false;
      adapters[kind] = { async countTokens(input) { if (counted) throw new Error('Repeated count refused'); counted=true; return adapter.countTokens(input); }, async generate(input) { if (dispatched) throw new Error('Repeated dispatch refused'); dispatched=true; await record({stage:'DISPATCHING',kind}); return adapter.generate(input); } };
    }
    await withP4Services(async env => {
      const pool = new pg.Pool({connectionString:env.databaseUrl,max:10,connectionTimeoutMillis:2000,statement_timeout:5000});
      const storage = new S3Storage(env.s3,'foxmind-private'), scanner = new ClamdScanner(env.scannerHost,env.scannerPort); let runtime;
      try {
        for (const m of (await readdir('prisma/migrations')).filter(x=>/^\d+_/.test(x)).sort()) await pool.query(await readFile(`prisma/migrations/${m}/migration.sql`,'utf8'));
        const database=transactionDatabase(pool), query=async(sql,...args)=>(await pool.query(sql,args)).rows;
        const files=new FileService({database,access:createFileAccess({authenticate:async(_tx,req)=>req.id,authorizeAttemptWrite:async()=>{throw new Error('FORBIDDEN');}}),storage,scanner,draftQuotaBytes:0n});
        runtime=createFoxyRuntime({database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},files,storage,configuration:null,provider:null,visualConfiguration:host.configuration,visualProviders:adapters,visualBudgetLimits:{dailyBudgetUsd:ai.dailyBudgetUsd,dailyActorRequests:ai.dailyActorRequests,dailyGlobalRequests:ai.dailyGlobalRequests}});
        for(const kind of ['IMAGE','DIAGRAM']) await journey({kind,runtime,query,files,storage,record});
      } finally { try { await runtime?.onModuleDestroy(); } finally { try { await storage.drain(); } finally { await pool.end(); } } }
    });
    await record({stage:'COMPLETE'});
  } finally { await receipt.close(); }
}
async function journey({kind,runtime,query,files,storage,record}) {
  const f=await homeFixture(query), owner={id:f.teacherActor}, room=f.rooms.teach;
  await query('UPDATE classrooms SET storage_quota_bytes=$2 WHERE id=$1',room.id,20971520);
  const {conversation}=await runtime.services.conversations.create(owner,{requestId:randomUUID(),title:'Prueba sintÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tica',context:{kind:'GENERAL'}});
  const started=await runtime.services.visuals.start(owner,conversation.id,{requestId:randomUUID(),revision:'0',kind,prompt:kind==='IMAGE'?'IlustraciÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³n educativa simple del ciclo del agua.':'Esquema educativo simple del ciclo del agua.',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1'});
  assert.equal(await runtime.visualWorker.runOnce(),true);
  const [asset]=await query('SELECT revision,state,storage_key,size_bytes FROM foxy_visual_assets WHERE id=$1',started.job.assetId);
  if (asset.state !== 'READY') { const [failed]=await query('SELECT error_code FROM foxy_visual_jobs WHERE id=$1',started.job.id); throw Object.assign(new Error('Job did not reach READY'),{code:failed?.error_code}); }
  const bytes=await storage.get(asset.storage_key,Number(asset.size_bytes));
  const preview=await runtime.services.privateAssetReader.readFile(owner,started.job.assetId,'preview',new AbortController().signal); assert.deepEqual(Buffer.from(preview.bytes),bytes);
  const [job]=await query('SELECT dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1',started.job.id); assert.equal(job.dispatch_count,1); assert.equal(String(job.reserved_microusd),'0');
  const p=await runtime.services.publications.prepareVisual(owner,started.job.assetId,{requestId:randomUUID(),assetRevision:String(asset.revision),classroomId:room.id,title:'Material sintÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tico',unitId:room.unit,topicId:room.topic});
  assert.equal((await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1',room.id))[0].n,0);
  assert.equal(await runtime.publicationWorker.runOnce(),true);
  const inspection=await runtime.services.publications.inspect(owner,p.publication.id); assert.equal(inspection.publication.state,'READY');
  const [pending]=await query('SELECT file_id FROM foxy_publications WHERE id=$1',p.publication.id);
  await assert.rejects(files.read({id:f.pupil},pending.file_id,'preview'), error => error.code === 'FORBIDDEN');
  const request={requestId:randomUUID(),publicationRevision:inspection.publication.revision,classroomRevision:inspection.classroomRevision,confirm:true};
  const result=await runtime.services.publications.confirm(owner,p.publication.id,request), replay=await runtime.services.publications.confirm(owner,p.publication.id,request);
  assert.equal(result.materialId,replay.materialId);
  const [file]=await query('SELECT f.id,f.storage_key FROM materials m JOIN files f ON f.id=m.file_id WHERE m.id=$1',result.materialId);
  assert.notEqual(file.storage_key,asset.storage_key); assert.deepEqual(await storage.get(file.storage_key,bytes.length),bytes);
  const studentFile=await files.read({id:f.pupil},file.id,'preview'); assert.deepEqual(Buffer.from(studentFile.bytes),bytes);
  const [material]=await query('SELECT unit_id,topic_id FROM materials WHERE id=$1',result.materialId); assert.equal(material.unit_id,room.unit); assert.equal(material.topic_id,room.topic); assert.equal((await query('SELECT count(*)::int n FROM materials WHERE classroom_id=$1',room.id))[0].n,1);
  await assert.rejects(files.read({id:f.outsider},file.id,'preview'), error => error.code === 'FORBIDDEN');
  await record({stage:'PUBLISHED',kind,bytes:bytes.length}); console.log(`${kind}: PUBLISHED`);
}
main().catch(error=>{ const allowed=new Set(['INVALID_AI_OUTPUT','AI_INPUT_LIMIT','AI_TIMEOUT','AI_RATE_LIMITED','AI_BUDGET_EXCEEDED','CONFLICT','SERVICE_UNAVAILABLE','PROVIDER_OUTCOME_UNKNOWN']); console.error(`Journey failed (authorization required for live run): ${allowed.has(error?.code)?error.code:'CHECK_FAILED'}`); process.exitCode=1; });
