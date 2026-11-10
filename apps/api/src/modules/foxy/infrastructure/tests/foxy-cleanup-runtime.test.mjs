import { createFoxyFileOperations } from "../../../../bootstrap/foxy-file-integration.ts";
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

test('runtime with AI disabled schedules cleanup using injected storage and drains remove before shutdown',async()=>{
 const {createFoxyRuntime}=await import("../../../../bootstrap/foxy-runtime.ts");const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout,timers=[];
 globalThis.setTimeout=(fn,ms)=>{const timer={fn,ms,cleared:false,unref(){}};timers.push(timer);return timer;};globalThis.clearTimeout=t=>{if(t)t.cleared=true;};
 try{const candidate={id:randomUUID(),classroom_id:randomUUID(),file_id:randomUUID()};let nonce=null,entered,release,calls=0,queries=0;
  const started=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  const database={$transaction:async fn=>fn({$queryRawUnsafe:async(sql,...args)=>{queries++;
   if(sql.includes('SELECT p.id,p.classroom_id,p.file_id'))return [candidate];
   if(sql.includes('SELECT id FROM classrooms'))return [{id:candidate.classroom_id}];
   if(sql.includes('SELECT id FROM foxy_publications WHERE'))return [{id:candidate.id}];
   if(sql.includes('SELECT f.storage_key,c.phase'))return [{storage_key:'synthetic/key',phase:'deleting',operation_id:nonce,lease_active:nonce!==null,blob_deleted:false}];
   if(sql.includes('UPDATE file_custodies SET operation_id=')){nonce=args[1];return [{file_id:candidate.file_id}];}return [];
  }})};
  const storage={remove:async key=>{assert.equal(key,'synthetic/key');calls++;entered();await gate;}};
  const runtime=createFoxyRuntime({database,storage,fileOperations:createFoxyFileOperations({store:{}}),authenticate:async()=>null,classrooms:{run:async()=>{},classroom:async()=>{}},configuration:null,provider:null});
  assert.equal(queries,0);assert.equal(timers.length,0);assert.equal(runtime.worker,null);runtime.onModuleInit();runtime.onModuleInit();
  const ticks=timers.filter(t=>t.ms===5000);assert.equal(ticks.length,2);for(const timer of ticks)timer.fn();
  await Promise.race([started,new Promise((_,reject)=>realSet(()=>reject(Error('cleanup did not run')),1000))]);
  let done=false;const stopping=runtime.onModuleDestroy().then(()=>{done=true;});await Promise.resolve();assert.equal(done,false);release();await stopping;assert.equal(calls,1);assert.ok(timers.every(t=>t.cleared || ticks.includes(t)));
 }finally{globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;}
});


test('runtime rejects absent or malformed storage before timers, database or provider',async()=>{
 const {createFoxyRuntime}=await import("../../../../bootstrap/foxy-runtime.ts");const realSet=globalThis.setTimeout;let timers=0,io=0;
 globalThis.setTimeout=(...args)=>{timers++;return realSet(...args);};
 try{for(const storage of [undefined,null,{}, {remove:null},{remove:'remove'}]){
  assert.throws(()=>createFoxyRuntime({database:{$transaction:async()=>{io++;}},storage,fileOperations:createFoxyFileOperations({store:{}}),authenticate:async()=>{io++;},classrooms:{run:async()=>{},classroom:async()=>{}},configuration:null,provider:null}),e=>e?.code==='SERVICE_UNAVAILABLE');
 }assert.equal(timers,0);assert.equal(io,0);}finally{globalThis.setTimeout=realSet;}
});
