import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

const lease={jobId:randomUUID(),assetId:randomUUID(),ownerId:randomUUID(),conversationId:randomUUID(),leaseNonce:randomUUID()};
const imageProfile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const diagramProfile={kind:'DIAGRAM',model:'synthetic-text',profileVersion:'foxy-diagram-provider-v1',maxInputTokens:1000,maxOutputTokens:500,inputUsdPerMillion:'0.25',outputUsdPerMillion:'1.5'};
const config={enabled:{IMAGE:true,DIAGRAM:true},profiles:{IMAGE:imageProfile,DIAGRAM:diagramProfile},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const graph={schemaVersion:'foxy-diagram-v1',title:'Agua',description:'Ciclo',direction:'TOP_DOWN',nodes:[{id:'a',label:'Agua'}],edges:[]},bytes=Uint8Array.of(137,80,78,71,13,10,26,10,1);
const grounding={context:{kind:'GENERAL'},curriculum:null,sources:[],documents:[],referenceMap:[],warnings:[]};
function fixture(settings={}){
 const calls=[],hit=(operation,...args)=>{calls.push({operation,args})},kind=settings.kind??'IMAGE',profile=kind==='IMAGE'?imageProfile:diagramProfile,assetCapability={},capability={};let claimed=false;
 const scope={capability,assetCapability,snapshot:{context:{kind:'GENERAL'},curriculum:null,sources:[]},documents:[],job:{id:lease.jobId,assetId:lease.assetId,kind,prompt:'Crear imagen',aspectRatio:'1:1',profile,dispatchCount:settings.dispatched?1:0}};
 const database={$transaction:async fn=>{hit('transaction');return fn({$queryRawUnsafe:async()=>[]})}};
 const queue={claim:async()=>{hit('claim');if(claimed)return null;claimed=true;return lease},renew:async()=>{hit('renew');return true},recoverExpired:async()=>0};
 const authority={open:async()=>{hit('open');return scope},authorizeClaim:async()=>{hit('authorize');return {...lease,snapshot:scope.snapshot}},revalidateGrounding:async()=>{hit('revalidate');return !settings.stale},close:()=>hit('close')};
 const loader={load:async()=>{hit('load');return grounding}};
 const provider={countTokens:async()=>{hit('count');return 20},generate:async()=>{hit('generate');if(settings.unknown)throw Object.assign(Error('synthetic'),{code:'PROVIDER_OUTCOME_UNKNOWN'});const usage=settings.overCap?{inputTokens:70000,outputTokens:5000}:{inputTokens:20,outputTokens:40};return kind==='IMAGE'?{bytes,declaredMimeType:'image/png',usage}:{diagram:graph,usage};}};
 const renderer={render:async()=>{hit('render');return {bytes,mimeType:'image/png',width:1600,height:1600,digest:'a'.repeat(64),rendererVersion:'foxy-diagram-png-v1'}}};
 const custody={receive:async()=>{hit('receive');if(settings.storageFailure)throw Object.assign(Error('synthetic'),{code:'SERVICE_UNAVAILABLE'});return {digest:'a'.repeat(64),mimeType:'image/png',width:1600,height:1600,sizeBytes:bytes.length}},recover:async()=>{hit('recover');if(settings.recoverFailure)throw Object.assign(Error('synthetic'),{code:'NOT_FOUND'});return {digest:'a'.repeat(64),mimeType:'image/png',width:1600,height:1600,sizeBytes:bytes.length}}};
 const budget={reserve:async()=>{hit('reserve');return settings.reservation??'RESERVED'},settle:async(...args)=>{hit('settle',...args);return true},settleExpired:async()=>{hit('settleExpired');return true}};
 const completion={finish:async(...args)=>{hit('finish',...args);return true}};
 return {calls,options:{database,queue,authority,loader,providers:{IMAGE:provider,DIAGRAM:provider},renderer,custody,budget,completion,configuration:config}};
}
async function run(f){const {createFoxyVisualWorker}=await import("../visual-worker.ts");return createFoxyVisualWorker(f.options).runOnce();}
const names=f=>f.calls.map(x=>x.operation),finish=f=>f.calls.find(x=>x.operation==='finish')?.args[1];
for(const kind of ['IMAGE','DIAGRAM'])test(`${kind} preflights, fences, reserves, dispatches once and completes custody`,async()=>{
 const f=fixture({kind});assert.equal(await run(f),true);const events=names(f);
 for(const required of ['claim','open','load','count','revalidate','reserve','generate','settle','receive','finish','close'])assert.ok(events.includes(required),required);
 assert.ok(events.indexOf('count')<events.indexOf('reserve')&&events.indexOf('revalidate')<events.indexOf('reserve')&&events.indexOf('reserve')<events.indexOf('generate'));
 assert.ok(events.indexOf('generate')<events.indexOf('settle')&&events.indexOf('settle')<events.indexOf('receive'));assert.equal(events.filter(x=>x==='generate').length,1);
 assert.equal(events.includes('render'),kind==='DIAGRAM');assert.equal(finish(f).state,'READY');
});
test('stale grounding or exhausted budget never calls provider generation',async()=>{
 await import("../visual-worker.ts");
 for(const settings of [{stale:true},{reservation:'NO_BUDGET'},{reservation:'NOT_CURRENT'}]){const f=fixture(settings);try{await run(f)}catch{}assert.equal(names(f).includes('generate'),false);}
});
test('provider uncertain outcome and custody failure cannot cause a second provider dispatch',async()=>{
 for(const settings of [{unknown:true},{storageFailure:true}]){const f=fixture(settings);await run(f);assert.equal(names(f).filter(x=>x==='generate').length,1);assert.equal(finish(f).state,'FAILED');}
});
test('previous dispatch recovers only bound bytes and never invokes provider again',async()=>{
 for(const recoverFailure of [false,true]){const f=fixture({dispatched:true,recoverFailure});await run(f);assert.equal(names(f).includes('generate'),false);assert.ok(names(f).includes('recover'));assert.equal(finish(f).state,recoverFailure?'FAILED':'READY');}
});
test('known provider usage above profile caps is settled before failure and never reaches custody',async()=>{
 const f=fixture({overCap:true});await run(f);const events=names(f),settlement=f.calls.find(x=>x.operation==='settle');
 assert.equal(events.filter(x=>x==='generate').length,1);assert.ok(events.indexOf('settle')>events.indexOf('generate'));assert.ok(events.indexOf('finish')>events.indexOf('settle'));
 assert.ok(settlement.args.some(arg=>arg?.inputTokens===70000&&arg?.outputTokens===5000));assert.equal(events.includes('receive'),false);assert.equal(finish(f).state,'FAILED');assert.equal(finish(f).errorCode,'INVALID_AI_OUTPUT');
});

test('queued job frozen profile cannot dispatch with changed provider model, caps or prices',async()=>{
 for(const [kind,field,value] of [['IMAGE','model','other-model'],['IMAGE','maxInputTokens',1000],['IMAGE','imageOutputUsdPerMillion','999'],['DIAGRAM','model','other-model'],['DIAGRAM','outputUsdPerMillion','99']]){
  const f=fixture({kind});f.options.configuration={...config,profiles:{...config.profiles,[kind]:{...config.profiles[kind],[field]:value}}};await run(f);
  const events=names(f);for(const op of ['count','reserve','generate','receive'])assert.equal(events.includes(op),false,`${kind} ${field} must not ${op}`);assert.equal(finish(f).state,'FAILED');assert.equal(finish(f).errorCode,'AI_UNAVAILABLE');
 }
});
test('previously dispatched bound bytes remain recoverable with a changed or absent provider profile',async()=>{
 const f=fixture({dispatched:true});f.options.configuration={...config,profiles:{...config.profiles,IMAGE:{...imageProfile,model:'different'}}};f.options.providers.IMAGE=null;
 await run(f);assert.ok(names(f).includes('recover'));assert.ok(!names(f).includes('count')&&!names(f).includes('generate'));assert.equal(finish(f).state,'READY');
});
