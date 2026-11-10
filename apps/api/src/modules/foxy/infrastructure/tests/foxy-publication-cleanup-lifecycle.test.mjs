import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyPublicationCleanup } from "../publication-cleanup.ts";

test('cleanup lifecycle has no constructor IO, one five-second timer, and stops idempotently',async()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,timers=[];let queries=0,removes=0;
 globalThis.setTimeout=(fn,ms)=>{const timer={fn,ms,cleared:false,unrefed:false,unref(){this.unrefed=true;}};timers.push(timer);return timer;};
 globalThis.clearTimeout=timer=>{if(timer)timer.cleared=true;};
 try {const worker=createFoxyPublicationCleanup({database:{$transaction:async fn=>fn({$queryRawUnsafe:async()=>{queries++;return [];}})},storage:{remove:async()=>{removes++;}}});
  assert.equal(queries,0);assert.equal(timers.length,0);worker.onModuleInit();worker.onModuleInit();
  assert.equal(timers.length,1);assert.equal(timers[0].ms,5000);assert.equal(timers[0].unrefed,true);
  await worker.onModuleDestroy();await worker.onModuleDestroy();assert.equal(timers[0].cleared,true);const before=queries;
  assert.equal(await worker.sweep(),false);timers[0].fn();await Promise.resolve();assert.equal(queries,before);assert.equal(removes,0);
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});

test('cleanup shutdown drains an in-flight sweep and refuses later work',async()=>{
 let entered,release,queries=0;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r);
 const worker=createFoxyPublicationCleanup({database:{$transaction:async fn=>fn({$queryRawUnsafe:async()=>{queries++;entered();await gate;return [];}})},storage:{remove:async()=>{throw Error('unexpected');}}});
 const running=worker.sweep();await started;let stopped=false;const closing=worker.onModuleDestroy().then(()=>{stopped=true;});await Promise.resolve();assert.equal(stopped,false);
 release();assert.equal(await running,false);await closing;assert.equal(stopped,true);const before=queries;assert.equal(await worker.sweep(),false);assert.equal(queries,before);
});


test('scheduler reports each failed sweep generically and continues polling',async()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,timers=[],reports=[];let failures=0;
 globalThis.setTimeout=(fn,ms)=>{const timer={fn,ms,cleared:false,unref(){}};timers.push(timer);return timer;};globalThis.clearTimeout=t=>{if(t)t.cleared=true;};
 try{const worker=createFoxyPublicationCleanup({database:{$transaction:async()=>{failures++;throw Error('synthetic private SQL diagnostic');}},storage:{remove:async()=>{throw Error('unexpected');}},onError:(...args)=>reports.push(args)});
  worker.onModuleInit();timers[0].fn();await new Promise(resolve=>setImmediate(resolve));assert.equal(failures,1);assert.deepEqual(reports,[[]]);assert.equal(timers.length,2);assert.equal(timers[1].ms,5000);
  timers[1].fn();await new Promise(resolve=>setImmediate(resolve));assert.equal(failures,2);assert.deepEqual(reports,[[],[]]);await worker.onModuleDestroy();
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
