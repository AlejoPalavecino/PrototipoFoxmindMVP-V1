import test from 'node:test';
import assert from 'node:assert/strict';
const lease={publicationId:'pub',ownerId:'teacher',classroomId:'room',leaseNonce:'nonce'};
const scope={capability:{},snapshot:{title:'Guía',markdown:'Contenido'}},child={capability:{}},artifact={bytes:Buffer.from('pdf'),digest:'a'.repeat(64),pageCount:1,rendererVersion:'foxy-text-pdf-v1'};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture({existing=null,status='RECEIVABLE'}={}){
 const calls=[];let claimed=false;
 const options={queue:{claim:async()=>{calls.push('claim');if(claimed)return null;claimed=true;return lease;},renew:async()=>{calls.push('renew');return true;},release:async()=>{calls.push('release');return true;}},
 authority:{open:async()=>{calls.push('open');return scope;},existingFile:async()=>{calls.push('existingFile');return existing;},createFileCapability:async()=>{calls.push('child');return child;},close:()=>calls.push('close')},
 files:{inspect:async()=>{calls.push('inspect');return status;},ensureFile:async()=>{calls.push('ensure');return {created:true,fileId:'private'};},receive:async()=>{calls.push('receive');},proof:async()=>{calls.push('proof');return {};}},
 renderer:{render:async()=>{calls.push('render');return artifact;}},completion:{finish:async(_lease,outcome)=>{calls.push(`finish:${outcome.state}`);return true;}}};
 return {options,calls};
}
async function create(f){const {createFoxyPublicationWorker}=await import("../publication-worker.ts");return createFoxyPublicationWorker(f.options);}
test('ready existing file resumes with proof and finish without render or upload',async()=>{const f=fixture({existing:child,status:'READY'}),w=await create(f);assert.equal(await w.runOnce(),true);assert.deepEqual(f.calls,['claim','open','existingFile','inspect','proof','finish:READY','close']);await w.onModuleDestroy();});
for(const existing of [null,child])test(`fresh or receivable file is rendered and uploaded (${existing?'resume':'new'})`,async()=>{const f=fixture({existing}),w=await create(f);assert.equal(await w.runOnce(),true);assert.ok(f.calls.indexOf('render')>f.calls.indexOf('existingFile'));assert.ok(f.calls.indexOf('receive')>f.calls.indexOf('render'));assert.ok(f.calls.indexOf('proof')>f.calls.indexOf('receive'));assert.ok(f.calls.includes('finish:READY'));assert.equal(f.calls.at(-1),'close');await w.onModuleDestroy();});
test('busy file and upload conflict defer without marking failed or uploading twice',async()=>{for(const mode of ['busy','conflict']){const f=fixture({existing:child,status:mode==='busy'?'BUSY':'RECEIVABLE'});if(mode==='conflict')f.options.files.receive=async()=>{f.calls.push('receive');throw Object.assign(Error('busy'),{code:'UPLOAD_CONFLICT'});};const w=await create(f);await w.runOnce();assert.ok(!f.calls.some(x=>x.startsWith('finish:FAILED')));assert.ok(f.calls.filter(x=>x==='receive').length<=1);assert.ok(!f.calls.includes('finish:READY'));await w.onModuleDestroy();}});
test('simultaneous runs share one claim and shutdown waits for receive without late side effects',async()=>{const f=fixture(),entered=deferred(),gate=deferred();f.options.files.receive=async()=>{f.calls.push('receive');entered.resolve();await gate.promise;};const w=await create(f),a=w.runOnce(),b=w.runOnce();await entered.promise;assert.equal(f.calls.filter(x=>x==='claim').length,1);let stopped=false;const closing=w.onModuleDestroy().then(()=>{stopped=true;});await Promise.resolve();assert.equal(stopped,false);gate.resolve();await Promise.all([a,b,closing]);const count=f.calls.length;assert.equal(await w.runOnce(),false);assert.equal(f.calls.length,count);});

test('lost heartbeat lease aborts active work without proof or successful finish',async()=>{
 const f=fixture(),entered=deferred(),gate=deferred();let workSignal;
 f.options.renderer.render=async(_input,signal)=>{f.calls.push('render');workSignal=signal;entered.resolve();await gate.promise;return artifact;};
 f.options.queue.renew=async()=>{f.calls.push('renew');return false;};
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,timers=[];
 globalThis.setTimeout=(fn,ms)=>{const t={fn,ms,unref(){}};timers.push(t);return t;};globalThis.clearTimeout=()=>{};
 try{const w=await create(f),run=w.runOnce();await entered.promise;const beat=timers.find(t=>t.ms===30000);assert.ok(beat);await beat.fn();await Promise.resolve();assert.equal(workSignal.aborted,true);gate.resolve();await run;assert.ok(!f.calls.includes('proof'));assert.ok(!f.calls.includes('finish:READY'));await w.onModuleDestroy();}
 finally{gate.resolve();globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

test('deadline aborts a slow render and initialization and shutdown are idempotent',async()=>{
 const f=fixture(),entered=deferred(),gate=deferred();let workSignal;
 f.options.renderer.render=async(_input,signal)=>{workSignal=signal;entered.resolve();await gate.promise;return artifact;};
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,timers=[];
 globalThis.setTimeout=(fn,ms)=>{const t={fn,ms,unref(){}};timers.push(t);return t;};globalThis.clearTimeout=()=>{};
 try{const w=await create(f);w.onModuleInit();w.onModuleInit();assert.equal(timers.filter(t=>t.ms!==120000 && t.ms!==30000).length,1);
 const run=w.runOnce();await entered.promise;const deadline=timers.find(t=>t.ms===120000);assert.ok(deadline);deadline.fn();assert.equal(workSignal.aborted,true);gate.resolve();await run;assert.ok(!f.calls.includes('finish:READY'));await w.onModuleDestroy();await w.onModuleDestroy();}
 finally{gate.resolve();globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

test('a rejected READY finalization attempts a safe FAILED outcome using the same lease',async()=>{
 const f=fixture({existing:child,status:'READY'}),attempts=[];
 f.options.completion.finish=async(received,outcome)=>{attempts.push({received,outcome});return outcome.state!=='READY';};
 const w=await create(f);assert.equal(await w.runOnce(),true);
 assert.deepEqual(attempts.map(x=>x.outcome.state),['READY','FAILED']);
 assert.deepEqual(attempts.map(x=>x.received),[lease,lease]);assert.ok(attempts[1].outcome.errorCode);
 assert.ok(!f.calls.includes('render'));assert.ok(!f.calls.includes('receive'));assert.equal(f.calls.at(-1),'close');await w.onModuleDestroy();
});

test('a database error during READY finalization is left for recovery without pretending failure persisted',async()=>{
 const f=fixture({existing:child,status:'READY'});let attempts=0;
 f.options.completion.finish=async()=>{attempts++;throw Error('synthetic database outage');};
 const w=await create(f);await w.runOnce().catch(()=>{});assert.ok(attempts>=1);assert.ok(!f.calls.includes('release'));assert.equal(f.calls.at(-1),'close');await w.onModuleDestroy();
});
