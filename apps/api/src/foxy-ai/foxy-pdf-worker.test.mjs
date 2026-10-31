import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createHash } from 'node:crypto';

const input={title:'Guía revisada',markdown:'Educación y acción en el aula.'};
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
class FakeWorker extends EventEmitter {constructor(){super();this.sent=[];this.terminateCalls=0;this.gate=deferred();}postMessage(value){this.sent.push(value);}terminate(){this.terminateCalls++;return this.gate.promise;}}
async function create(options){const api=await import('./pdf-worker.ts');assert.equal(typeof api.createFoxyPdfRenderer,'function');return api.createFoxyPdfRenderer(options);}

test('real worker produces the same deterministic PDF, hash and version as the direct renderer', {timeout:30000},async()=>{
  const {renderFoxyTextPdf}=await import('./resource-pdf.ts'),renderer=await create(),signal=new AbortController().signal;
  const direct=await renderFoxyTextPdf(input,signal),result=await renderer.render(input,signal);
  assert.deepEqual(result.bytes,direct.bytes);assert.equal(result.digest,direct.digest);assert.equal(result.pageCount,direct.pageCount);
  assert.equal(result.rendererVersion,direct.rendererVersion);assert.equal(result.digest,createHash('sha256').update(result.bytes).digest('hex'));
});

test('already aborted signal starts no worker',async()=>{
  let count=0;const renderer=await create({workerFactory:()=>{count++;return new FakeWorker();}}),controller=new AbortController();controller.abort();
  await assert.rejects(renderer.render(input,controller.signal));assert.equal(count,0);
});

for(const cause of ['abort','timeout','crash','invalid'])test(`${cause} waits for worker termination before rejecting`,async()=>{
  const worker=new FakeWorker(),controller=new AbortController(),renderer=await create({workerFactory:()=>worker,timeoutMs:cause==='timeout'?10:10000});
  let settled=false,outcome;const pending=renderer.render(input,controller.signal).then(()=>{settled=true;outcome='resolved';},()=>{settled=true;outcome='rejected';});
  await Promise.resolve();if(cause==='abort')controller.abort();if(cause==='crash')worker.emit('error',Error('synthetic private'));
  if(cause==='invalid')worker.emit('message',{ok:true,result:{bytes:Uint8Array.of(1),digest:'x',pageCount:1,rendererVersion:'fake'}});
  if(cause==='timeout')await new Promise(resolve=>setTimeout(resolve,30));else await Promise.resolve();
  assert.equal(worker.terminateCalls,1);assert.equal(settled,false);worker.gate.resolve(0);await pending;assert.equal(settled,true);assert.equal(outcome,'rejected');
});

test('real long render yields to event loop and rejects oversized page count', {timeout:30000},async()=>{
  const renderer=await create(),signal=new AbortController().signal;let tick=false;
  const work=renderer.render({title:'Largo',markdown:Array.from({length:4000},(_,i)=>`Línea ${i}`).join('\n')},signal);
  setImmediate(()=>{tick=true;});const result=await work;assert.equal(tick,true);assert.ok(result.pageCount<=100);
  await assert.rejects(renderer.render({title:'Demasiado',markdown:Array.from({length:5100},()=> 'x').join('\n')},signal),error=>error?.code==='AI_INPUT_LIMIT');
});

test('invalid or oversized input is rejected before constructing a worker or posting data',async()=>{
  for(const value of [null,{}, {title:'x'.repeat(201),markdown:'válido'}, {title:'válido',markdown:'x'.repeat(50001)}, {title:42,markdown:'válido'}, {title:'válido',markdown:{text:'inválido'}}]){
    let created=0,posted=0;
    const renderer=await create({workerFactory:()=>{created++;const worker=new FakeWorker();worker.gate.resolve(0);worker.postMessage=()=>{posted++;queueMicrotask(()=>worker.emit('message',{invalid:true}));};return worker;}});
    await assert.rejects(renderer.render(value,new AbortController().signal));
    assert.equal(created,0,'invalid input must not create a worker');assert.equal(posted,0,'invalid input must not be copied to another thread');
  }
});
