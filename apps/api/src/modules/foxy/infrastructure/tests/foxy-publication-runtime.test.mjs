import { createFoxyFileOperations } from "../../../../bootstrap/foxy-file-integration.ts";
import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(){
 const {createFoxyRuntime}=await import("../../../../bootstrap/foxy-runtime.ts");const {FileService}=await import("../../../files/infrastructure/service.ts");
 const sql=[],database={$transaction:async fn=>fn({$queryRawUnsafe:async statement=>{sql.push(statement);return [];}})};
 const files=new FileService({database,access:{authenticate:async()=>null,authorize:async()=>{throw Error('unexpected');}},storage:{put:async()=>{throw Error('unexpected');},get:async()=>{throw Error('unexpected');},remove:async()=>{throw Error('unexpected');}},scanner:{scan:async()=>{throw Error('unexpected');}},draftQuotaBytes:1000000n});
 const runtime=createFoxyRuntime({database,fileOperations:createFoxyFileOperations(files),storage:{remove:async()=>{throw Error('unexpected');}},authenticate:async()=>null,classrooms:{run:async()=>{},classroom:async()=>{}},configuration:null,provider:null});return {runtime,sql};
}

test('runtime schedules publication queue recovery with text generation disabled, including after restart',async()=>{
 const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout,timers=[];
 globalThis.setTimeout=(fn,ms)=>{const timer={ms,cleared:false,fired:false,unref(){}};timer.fn=()=>{timer.fired=true;fn();};timers.push(timer);return timer;};globalThis.clearTimeout=timer=>{if(timer)timer.cleared=true;};
 try{
  for(let restart=0;restart<2;restart++){
   const {runtime,sql}=await fixture();runtime.onModuleInit();runtime.onModuleInit();const snapshot=timers.filter(t=>!t.cleared && !t.fired);
   assert.ok(snapshot.length);for(const timer of snapshot)timer.fn();await new Promise(resolve=>originalSet(resolve,20));
   assert.ok(sql.some(statement=>/foxy_publications/iu.test(statement) && /lease_until/iu.test(statement)),'publication recovery must inspect durable queue');
   await runtime.onModuleDestroy();await runtime.onModuleDestroy();assert.ok(timers.every(t=>t.fired || t.cleared));
  }
 }finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
