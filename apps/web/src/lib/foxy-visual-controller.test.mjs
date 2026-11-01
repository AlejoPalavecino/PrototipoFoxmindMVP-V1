import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from '../../../../tests/helpers/load-ts-module.mjs';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture({list=async()=>({items:[],nextAfterId:null}),start}={}){
 const conversation={id:randomUUID(),revision:'0',context:{kind:'GENERAL'}},job={id:randomUUID(),conversationId:conversation.id,state:'READY',kind:'IMAGE',assetId:randomUUID()},calls=[];
 const client={listVisuals:list,startVisual:async(...args)=>{calls.push(args);return start?start(job,...args):{job,conversationRevision:'1'};},getVisual:async()=>job};
 const {createFoxyVisualController}=loadTsModule('apps/web/src/lib/foxy-visual-controller.ts');const c=createFoxyVisualController({client,onChange:()=>{},current:()=>({conversation,selection:{topicIds:[],sourceIds:[]},canGenerate:true,busy:false,enabled:{IMAGE:true,DIAGRAM:true}}),onRevision:()=>{}});return {c,job,calls};
}
test('retry of uncertain request preserves the new draft or disallows editing until resolved',async()=>{
 let attempt=0;const f=fixture({start:async job=>{if(++attempt===1)throw Object.assign(Error('synthetic'),{code:'SERVICE_UNAVAILABLE'});return {job,conversationRevision:'1'};}});
 try{f.c.syncContext();await Promise.resolve();f.c.setPrompt('Original');await f.c.start();assert.ok(f.c.getState().pending);f.c.setPrompt('Nuevo borrador');const edited=f.c.getState().prompt;assert.ok(edited==='Original'||edited==='Nuevo borrador');await f.c.retry();if(edited==='Nuevo borrador')assert.equal(f.c.getState().prompt,'Nuevo borrador');assert.equal(f.calls.length,2);assert.deepEqual(f.calls[0][1],f.calls[1][1]);}finally{f.c.dispose();}
});
test('old list response cannot erase a newer acknowledged visual job',async()=>{
 const gate=deferred(),f=fixture({list:()=>gate.promise});try{f.c.syncContext();f.c.setPrompt('Imagen nueva');await f.c.start();assert.ok(f.c.getState().jobs.some(j=>j.id===f.job.id));gate.resolve({items:[],nextAfterId:null});await new Promise(r=>setImmediate(r));assert.ok(f.c.getState().jobs.some(j=>j.id===f.job.id));}finally{f.c.dispose();}
});

test('definitive input and empty-content errors release the request while uncertain failures remain retryable',async()=>{
 for(const code of ['AI_INPUT_LIMIT','EMPTY_CONTENT','SERVICE_UNAVAILABLE']){
  const f=fixture({start:async()=>{throw Object.assign(Error('synthetic'),{code});}});
  try{f.c.syncContext();await Promise.resolve();f.c.setPrompt('Borrador docente');await f.c.start();
   if(code==='SERVICE_UNAVAILABLE')assert.ok(f.c.getState().pending,code);
   else {assert.equal(f.c.getState().pending,null,code);assert.equal(f.c.getState().prompt,'Borrador docente');}
  }finally{f.c.dispose();}
 }
});
