import { createFoxyFileOperations } from "../../../../../bootstrap/foxy-file-integration.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {withAiDatabase} from "../../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const profileImage={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const profileDiagram={kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'};
const config={enabled:{IMAGE:true,DIAGRAM:true},profiles:{IMAGE:profileImage,DIAGRAM:profileDiagram},privateQuotaBytes:41943040n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const graph={schemaVersion:'foxy-diagram-v1',title:'Ciclo del agua',description:'Esquema sintético',direction:'TOP_DOWN',nodes:[{id:'agua',label:'Agua'},{id:'vapor',label:'Vapor'}],edges:[{from:'agua',to:'vapor',label:'evaporación'}]};
test('queued image and diagram profiles survive a policy upgrade while changed prices still fence dispatch',{timeout:120000},async()=>{
 const [{createFoxyRuntime},{FileService},{FileError}]=await Promise.all([import("../../../../../bootstrap/foxy-runtime.ts"),import("../../../../files/custody/infrastructure/service.ts"),import("../../../../files/domain/errors.ts")]);
 await withAiDatabase(async({pool,database})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),owner={id:f.teacherActor},events=[],blobs=new Map(),pending=new Set();
  const own=fn=>{const promise=Promise.resolve().then(fn);pending.add(promise);void promise.then(()=>pending.delete(promise),()=>pending.delete(promise));return promise;};
  const storage={put:(key,bytes)=>own(async()=>{events.push('put');if(blobs.has(key))throw new FileError('UPLOAD_CONFLICT');blobs.set(key,Buffer.from(bytes));}),
   get:(key,max)=>own(async()=>{events.push('get');const found=blobs.get(key);if(!found)throw new FileError('NOT_FOUND');assert.ok(found.length<=max);return Buffer.from(found);}),
   remove:key=>own(async()=>{events.push('remove');blobs.delete(key)}),drain:async()=>{await Promise.allSettled([...pending]);events.push('drain');}};
  const scanner={scan:async bytes=>{events.push('scan');assert.ok(bytes.length>0);}},files=new FileService({database,access:{authenticate:async()=>{throw Error('unexpected');},authorize:async()=>{throw Error('unexpected');}},storage,scanner,draftQuotaBytes:0n});
  const png=await sharp({create:{width:40,height:30,channels:3,background:'#42886c'}}).png().toBuffer();
  const provider = type => ({
    async countTokens(input) { events.push(`${type}:count:${input.profileVersion}`); return 12; },
    async generate(input) {
      events.push(`${type}:generate:${input.profileVersion}`);
      const usage = { inputTokens: 12, outputTokens: 20 };
      return type === 'IMAGE' ? { bytes: png, declaredMimeType: 'image/png', usage } : { diagram: graph, usage };
    },
  });
  const options={database,authenticate:async(_tx,req)=>req.id,classrooms:{run:async()=>{},classroom:async()=>{}},fileOperations:createFoxyFileOperations(files),storage,configuration:null,provider:null,
   visualConfiguration:config,visualProviders:{IMAGE:provider('IMAGE'),DIAGRAM:provider('DIAGRAM')},visualBudgetLimits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10}};
  async function enqueue(runtime, profile) {
    const { kind } = profile;
    const { conversation } = await runtime.services.conversations.create(owner, { requestId: randomUUID(), title: 'Visual sintético', context: { kind: 'GENERAL' } });
    const { job } = await runtime.services.visuals.start(owner, conversation.id, { requestId: randomUUID(), revision: '0', kind,
      prompt: 'Crear recurso sintético', selection: { topicIds: [], sourceIds: [] }, aspectRatio: '1:1' });
    assert.equal(job.state, 'QUEUED');
    return { kind, profile, conversationId: conversation.id, jobId: job.id };
  }
  const runtime = createFoxyRuntime(options), historical = [];
  try {
    for (const profile of [profileImage, profileDiagram]) historical.push(await enqueue(runtime, profile));
  } finally { await runtime.onModuleDestroy(); }
  const previousImage = { ...profileImage, profileVersion: 'foxy-gemini-image-v2' };
  const previous = createFoxyRuntime({ ...options, visualConfiguration: { ...config, profiles: { ...config.profiles, IMAGE: previousImage } } });
  try {
    historical.push(await enqueue(previous, previousImage), await enqueue(previous, previousImage));
  } finally { await previous.onModuleDestroy(); }
  const profiles = {
    IMAGE: { ...profileImage, profileVersion: 'foxy-gemini-image-v3' },
    DIAGRAM: { ...profileDiagram, profileVersion: 'foxy-diagram-provider-v2' },
  };
  const restarted = createFoxyRuntime({ ...options, visualConfiguration: { ...config, profiles } });
  try {
    for (const saved of historical.slice(0, 3)) {
      assert.equal(await restarted.visualWorker.runOnce(), true);
      const job = await restarted.services.visuals.get(owner, saved.conversationId, saved.jobId);
      assert.equal(job.state, 'READY');
      const [row] = await query('SELECT profile,dispatch_count FROM foxy_visual_jobs WHERE id=$1', saved.jobId);
      assert.deepEqual(row.profile, saved.profile);
      assert.equal(row.dispatch_count, 1);
      for (const phase of ['count', 'generate'])
        assert.ok(events.includes(`${saved.kind}:${phase}:${row.profile.profileVersion}`));
    }
  } finally { await restarted.onModuleDestroy(); }
  const changed = { ...profiles, IMAGE: { ...profiles.IMAGE, imageOutputUsdPerMillion: '29', outputUsdPerMillion: '29' } };
  const fenced = createFoxyRuntime({ ...options, visualConfiguration: { ...config, profiles: changed } });
  try {
    const saved = historical[3];
    const calls = events.filter(item => item.includes(':')).length;
    assert.equal(await fenced.visualWorker.runOnce(), true);
    const job = await fenced.services.visuals.get(owner, saved.conversationId, saved.jobId);
    assert.equal(job.state, 'FAILED');
    assert.equal(job.errorCode, 'AI_UNAVAILABLE');
    assert.equal(events.filter(item => item.includes(':')).length, calls);
    const [row] = await query('SELECT dispatch_count,reserved_microusd FROM foxy_visual_jobs WHERE id=$1', job.id);
    assert.equal(row.dispatch_count, 0);
    assert.equal(BigInt(row.reserved_microusd), 0n);
  } finally { await fenced.onModuleDestroy(); }
 });
});
