import { createFoxyFileOperations } from '../foxy-file-integration.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const teacher=randomUUID(),student=randomUUID(),request={id:teacher};
const image={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const diagram={kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'};
const visualConfiguration={enabled:{IMAGE:true,DIAGRAM:true},profiles:{IMAGE:image,DIAGRAM:diagram},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const visualBudgetLimits={dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:10};
function fixture(options={}){
 const calls=[],database={$transaction:async run=>run({$queryRawUnsafe:async(sql,...args)=>{calls.push(['sql',sql]);if(/FROM users/u.test(sql))return [{id:args[0],account_role:args[0]===student?'student':'teacher',email_verified_at:new Date()}];if(/count\(\*\)/iu.test(sql))return [{count:0}];return [];}})};
 const authenticate=async(_tx,req)=>req.id,files={store:{database,draftQuotaBytes:0n},storage:{get:async()=>{calls.push(['get']);throw Error('unexpected')},put:async()=>{calls.push(['put']);throw Error('unexpected')},remove:async()=>{calls.push(['remove']);},drain:async()=>{calls.push(['drain']);}},scanner:{scan:async()=>{calls.push(['scan']);}}};
 const provider=kind=>({countTokens:async()=>{calls.push([kind,'count']);throw Error('unexpected')},generate:async()=>{calls.push([kind,'generate']);throw Error('unexpected')}});
 return {calls,options:{database,authenticate,classrooms:{run:async()=>{},classroom:async()=>{}},fileOperations:createFoxyFileOperations(files),storage:files.storage,configuration:null,provider:null,
  visualConfiguration,visualProviders:{IMAGE:provider('image'),DIAGRAM:provider('diagram')},visualBudgetLimits,...options}};
}
const create=async f=>(await import('./runtime.ts')).createFoxyRuntime(f.options);
test('absent visual configuration does not expose gates or invoke provider and storage',async()=>{
 const f=fixture({visualConfiguration:null}),runtime=await create(f);assert.deepEqual(f.calls,[]);assert.equal(runtime.visualWorker,null);
 const caps=await runtime.services.capabilities(request);assert.equal(caps.imageGeneration.enabled,false);assert.equal(caps.diagramGeneration.enabled,false);
 runtime.onModuleInit();await runtime.onModuleDestroy();assert.equal(f.calls.some(x=>['image','diagram','get','put','scan'].includes(x[0])),false);
});
for(const [enabled,providers,expected] of [
 [{IMAGE:true,DIAGRAM:false},{IMAGE:true,DIAGRAM:true},[true,false]],
 [{IMAGE:false,DIAGRAM:true},{IMAGE:true,DIAGRAM:true},[false,true]],
 [{IMAGE:true,DIAGRAM:true},{IMAGE:false,DIAGRAM:true},[false,true]],
 [{IMAGE:true,DIAGRAM:true},{IMAGE:true,DIAGRAM:false},[true,false]],
])test(`visual capability gates are independent: ${JSON.stringify({enabled,providers})}`,async()=>{
 const f=fixture(),both=f.options.visualProviders;f.options.visualConfiguration={...visualConfiguration,enabled};f.options.visualProviders={IMAGE:providers.IMAGE?both.IMAGE:null,DIAGRAM:providers.DIAGRAM?both.DIAGRAM:null};
 const runtime=await create(f);assert.ok(runtime.services.visuals);assert.ok(runtime.visualWorker);const caps=await runtime.services.capabilities(request);
 assert.deepEqual([caps.imageGeneration.enabled,caps.diagramGeneration.enabled],expected);await assert.rejects(runtime.services.capabilities({id:student}));assert.equal(f.calls.some(x=>['image','diagram','get','put','scan'].includes(x[0])),false);
 runtime.onModuleInit();runtime.onModuleInit();await runtime.onModuleDestroy();await runtime.onModuleDestroy();
});
test('visual worker empty queue does not dispatch and runtime closes custody after worker drain',async()=>{
 const f=fixture(),runtime=await create(f);assert.ok(runtime.visualWorker);assert.equal(await runtime.visualWorker.runOnce(),false);assert.equal(f.calls.some(x=>['image','diagram','get','put','scan'].includes(x[0])),false);
 runtime.onModuleInit();await runtime.onModuleDestroy();assert.ok(f.calls.some(x=>x[0]==='drain'),'runtime must drain shared storage after visual worker');
});
