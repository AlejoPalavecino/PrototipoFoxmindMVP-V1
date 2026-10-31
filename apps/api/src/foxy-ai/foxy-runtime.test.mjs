import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const teacher = randomUUID(), student = randomUUID(), request = { id:teacher };
const configuration = { model:'synthetic-model', maxInputTokens:1000, maxOutputTokens:100, maxConcurrency:1,
  deadlineMs:30000, maxJobAgeMs:300000, dailyActorRequests:5, dailyGlobalRequests:20,
  inputUsdPerMillion:2, outputUsdPerMillion:3, dailyBudgetUsd:1 };
function fixture(config = null, provider = null) {
  const calls = [], database = { $transaction: async fn => { calls.push('transaction'); return fn({ $queryRawUnsafe: async (sql,...args) => {
    calls.push('query'); if (/\busers\b/iu.test(sql) && /FOR (SHARE|UPDATE)/iu.test(sql)) return [{id:args[0],account_role:args[0]===student?'student':'teacher',email_verified_at:new Date()}]; return [];
  } }); }, $disconnect: async () => calls.push('disconnect') };
  const authenticate = async (_tx, req) => { calls.push('authenticate'); return req.id; };
  const classrooms = { run:async () => { calls.push('classrooms'); }, classroom:async () => { calls.push('classroom'); } };
  const files = { read:async () => { calls.push('read'); }, close:async () => calls.push('filesClose') };
  return { calls, options:{database,authenticate,classrooms,files,configuration:config,provider} };
}
async function create(f) { const api=await import('./runtime.ts'); assert.equal(typeof api.createFoxyRuntime,'function'); return api.createFoxyRuntime(f.options); }

test('disabled runtime composes reading services without DB or provider calls on construction', async () => {
  for (const [config,provider] of [[null,null],[configuration,null],[null,{ countTokens:async()=>1, generate:async()=>({}) }]]) {
    const f=fixture(config,provider), runtime=await create(f); assert.deepEqual(f.calls,[]); assert.equal(runtime.worker,null);
    for (const name of ['conversations','turns','catalog','citations','capabilities']) assert.ok(runtime.services[name],name);
    const caps=await runtime.services.capabilities(request);
    assert.deepEqual(caps,{textGeneration:{enabled:false},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}});
    await assert.rejects(runtime.services.capabilities({id:student}));
    const page=await runtime.services.conversations.list(request,{limit:10}); assert.deepEqual(page.items,[]);
    runtime.onModuleInit(); runtime.onModuleInit(); await runtime.onModuleDestroy(); await runtime.onModuleDestroy();
    assert.equal(f.calls.includes('disconnect'),false); assert.equal(f.calls.includes('filesClose'),false);
  }
});

test('enabled runtime uses injected provider without starting work during construction and has idempotent lifecycle', async () => {
  const originalSet=globalThis.setTimeout, originalClear=globalThis.clearTimeout, timers=[];
  globalThis.setTimeout = fn => { const timer={fn,cleared:false,unrefed:false,unref(){this.unrefed=true;}}; timers.push(timer); return timer; };
  globalThis.clearTimeout = timer => { if(timer) timer.cleared=true; };
  try {
    const f=fixture(configuration,{ countTokens:async()=>{throw Error('unexpected');}, generate:async()=>{throw Error('unexpected');} });
    const runtime=await create(f); assert.deepEqual(f.calls,[]); assert.ok(runtime.worker);
    assert.deepEqual(await runtime.services.capabilities(request),{textGeneration:{enabled:true},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}});
    runtime.onModuleInit(); runtime.onModuleInit(); assert.equal(timers.length,2); assert.ok(timers.every(timer=>timer.unrefed));
    await runtime.onModuleDestroy(); await runtime.onModuleDestroy(); assert.ok(timers.every(timer=>timer.cleared));
    assert.equal(f.calls.includes('disconnect'),false); assert.equal(f.calls.includes('filesClose'),false);
  } finally { globalThis.setTimeout=originalSet; globalThis.clearTimeout=originalClear; }
});

test('invalid budget, rates and limits cannot enable a worker or provider dispatch', async () => {
  const cases=[];
  for (const key of ['inputUsdPerMillion','outputUsdPerMillion','dailyBudgetUsd'])
    for (const value of [0,-1,NaN,Infinity]) cases.push([key,value]);
  for (const key of ['maxInputTokens','maxOutputTokens','maxConcurrency','deadlineMs','maxJobAgeMs','dailyActorRequests','dailyGlobalRequests'])
    for (const value of [0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1]) cases.push([key,value]);
  for (const [key,value] of cases) {
    let providerCalls=0; const provider={countTokens:async()=>{providerCalls++;return 1;},generate:async()=>{providerCalls++;return {};}};
    const f=fixture({...configuration,[key]:value},provider); let runtime;
    try { runtime=await create(f); } catch (error) { assert.ok(['AI_UNAVAILABLE','INVALID_INPUT'].includes(error?.code), `${key}=${value}: unexpected ${error}`); assert.equal(providerCalls,0,`${key}=${value}`); continue; }
    assert.equal(runtime.worker,null,`${key}=${value}`);
    assert.equal((await runtime.services.capabilities(request)).textGeneration.enabled,false,`${key}=${value}`);
    runtime.onModuleInit(); await runtime.onModuleDestroy(); assert.equal(providerCalls,0,`${key}=${value}`);
  }
});

test('disabled runtime starts serial recovery maintenance without claims or provider', async () => {
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,timers=[];
  globalThis.setTimeout=fn=>{const timer={fn,cleared:false,unref(){}};timers.push(timer);return timer;};
  globalThis.clearTimeout=timer=>{if(timer)timer.cleared=true;};
  try {
    const f=fixture(null,null),sql=[];
    f.options.database.$transaction=async fn=>fn({$queryRawUnsafe:async statement=>{sql.push(statement);return [];}});
    const runtime=await create(f); runtime.onModuleInit(); runtime.onModuleInit();
    assert.equal(timers.length,2); timers[0].fn(); await new Promise(resolve=>originalSet(resolve,0));
    assert.ok(sql.some(s=>/pg_advisory_xact_lock\(78123002\)/iu.test(s)));
    assert.ok(sql.some(s=>/lease_until\s*<=/iu.test(s))); assert.equal(sql.some(s=>/SET state='RUNNING'/iu.test(s)),false);
    await runtime.onModuleDestroy(); assert.equal(timers[1].cleared,true); assert.equal(timers.at(-1).cleared,true);
  } finally { globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear; }
});

test('model longer than repository metadata limit cannot enable runtime', async () => {
  let dispatched=0; const f=fixture({...configuration,model:'x'.repeat(201)},{countTokens:async()=>{dispatched++;return 1;},generate:async()=>{dispatched++;return {};}});
  let runtime; try {runtime=await create(f);} catch(error) {assert.ok(['AI_UNAVAILABLE','INVALID_INPUT'].includes(error?.code));assert.equal(dispatched,0);return;}
  assert.equal(runtime.worker,null); assert.equal((await runtime.services.capabilities(request)).textGeneration.enabled,false);
  await runtime.onModuleDestroy(); assert.equal(dispatched,0);
});
