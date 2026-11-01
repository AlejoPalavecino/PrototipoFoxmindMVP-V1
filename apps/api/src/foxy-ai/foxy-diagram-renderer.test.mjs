import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const renderer=async(options)=>{const module=await import('./diagram-renderer.ts');assert.equal(typeof module.createFoxyDiagramRenderer,'function');return module.createFoxyDiagramRenderer(options);};
const diagram=(changes={})=>({schemaVersion:'foxy-diagram-v1',title:'Fotosintesis',description:'La luz ayuda a la planta.',direction:'TOP_DOWN',
 nodes:[{id:'luz',label:'Luz'},{id:'planta',label:'Planta'}],edges:[{from:'luz',to:'planta',label:'absorbe'}],...changes});
const ratios={'1:1':[1600,1600],'4:3':[1600,1200],'3:4':[1200,1600],'16:9':[1920,1080]};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function render(input,aspectRatio='1:1',signal=new AbortController().signal){return (await renderer()).render({diagram:input,aspectRatio,signal});}
async function invalid(input,aspectRatio='1:1'){await assert.rejects(()=>render(input,aspectRatio),error=>error?.code==='INVALID_INPUT');}

test('renders deterministic bounded PNG for each supported aspect ratio with matching digest',async()=>{
 const instance=await renderer();
 for(const [aspectRatio,[width,height]] of Object.entries(ratios)){
  const request={diagram:diagram(),aspectRatio,signal:new AbortController().signal};const first=await instance.render(request),second=await instance.render(request);
  assert.equal(first.mimeType,'image/png');assert.equal(first.rendererVersion,'foxy-diagram-png-v1');assert.equal(first.width,width);assert.equal(first.height,height);
  assert.ok(first.bytes instanceof Uint8Array);assert.ok(first.bytes.byteLength>0&&first.bytes.byteLength<=10*1024*1024);assert.ok(width*height<=4_000_000);
  assert.deepEqual(Array.from(first.bytes.subarray(0,8)),[137,80,78,71,13,10,26,10]);assert.equal(first.digest,sha(first.bytes));assert.equal(second.digest,first.digest);
  const meta=await sharp(first.bytes).metadata();assert.equal(meta.format,'png');assert.equal(meta.width,width);assert.equal(meta.height,height);
 }
});

test('renders escaped XML-like text as labels without interpreting markup',async()=>{
 const input=diagram({title:'A < B & "C"',nodes:[{id:'a',label:'</text><image href="https://invalid.example/x"/><text>'},{id:'b',label:"Planta & luz < > ' \""}],edges:[{from:'a',to:'b',label:'<script>&amp;</script>'}]});
 const result=await render(input);assert.equal(result.mimeType,'image/png');assert.equal(result.digest,sha(result.bytes));assert.equal((await sharp(result.bytes).metadata()).format,'png');
});

test('rejects empty or oversized graphs, unknown endpoints and malformed inputs before rendering',async()=>{
 await renderer();
 const nodes=Array.from({length:31},(_,i)=>({id:`n${i}`,label:`Nodo ${i}`}));
 const legal=nodes.slice(0,30),edges=Array.from({length:61},(_,i)=>({from:'n0',to:'n1',label:`Enlace ${i}`}));
 for(const bad of [diagram({nodes:[],edges:[]}),diagram({nodes,edges:[]}),diagram({nodes:legal,edges}),
  diagram({nodes:[{id:'a',label:'A'},{id:'a',label:'B'}],edges:[]}),diagram({edges:[{from:'missing',to:'planta',label:'x'}]}),
  diagram({title:'',nodes:legal,edges:[]}),diagram({nodes:[{id:'a',label:'x'.repeat(201)}],edges:[]})])await invalid(bad);
 await invalid(diagram(),'9:16');
});

test('supports both directions and the maximum graph cardinality without executing model markup',async()=>{
 const nodes=Array.from({length:30},(_,i)=>({id:`n${i}`,label:`N${i}`}));
 const edges=Array.from({length:60},(_,i)=>({from:`n${i%30}`,to:`n${(i+1)%30}`,label:''}));
 for(const direction of ['TOP_DOWN','LEFT_RIGHT']){const result=await render(diagram({nodes,edges,direction}),'16:9');assert.equal(result.mimeType,'image/png');assert.equal(result.digest,sha(result.bytes));}
});

test('does not silently truncate a valid long label: it renders the differing suffix or rejects layout explicitly',async()=>{
 const label='A'.repeat(199);let first,second;await renderer();
 try{first=await render(diagram({nodes:[{id:'only',label:`${label}A`}],edges:[]}));second=await render(diagram({nodes:[{id:'only',label:`${label}B`}],edges:[]}));}
 catch(error){assert.equal(error?.code,'AI_INPUT_LIMIT');return;}
 assert.notEqual(first.digest,second.digest,'distinct valid suffixes must change rendered PNG');
});

test('multi-codepoint grapheme label remains inside its node or returns AI_INPUT_LIMIT',async()=>{
 const family=String.fromCodePoint(0x1f468,0x200d,0x1f469,0x200d,0x1f467,0x200d,0x1f466).repeat(20);
 let result;try{result=await render(diagram({title:'Grapheme layout',description:'Accessible family label',nodes:[{id:'n',label:family}],edges:[]}));}
 catch(error){assert.equal(error?.code,'AI_INPUT_LIMIT');return;}
 const {data,info}=await sharp(result.bytes).extract({left:943,top:150,width:600,height:65}).removeAlpha().raw().toBuffer({resolveWithObject:true});
 let dark=0;for(let i=0;i<data.length;i+=info.channels)if(data[i]<80&&data[i+1]<100&&data[i+2]<110)dark++;
 assert.equal(dark,0,'node text must not overflow its box');
});

test('honors cancellation before and during rendering without returning bytes',async()=>{
 const instance=await renderer(),before=new AbortController();before.abort();
 await assert.rejects(()=>instance.render({diagram:diagram(),aspectRatio:'1:1',signal:before.signal}));
 const during=new AbortController(),pending=instance.render({diagram:diagram(),aspectRatio:'16:9',signal:during.signal});during.abort();
 await assert.rejects(()=>pending);
});

test('render input is captured before worker dispatch even when caller mutates the graph',async()=>{
 const {EventEmitter}=await import('node:events');let worker;
 class CapturingWorker extends EventEmitter {constructor(){super();this.messages=[];}postMessage(value){this.messages.push(structuredClone(value));}terminate(){return Promise.resolve(0);}}
 const instance=await renderer({workerFactory:()=>{worker=new CapturingWorker();return worker;},timeoutMs:10000});const input=diagram(),controller=new AbortController();
 const pending=instance.render({diagram:input,aspectRatio:'1:1',signal:controller.signal});input.nodes[0].label='MUTATED_AFTER_CALL';
 await Promise.resolve();assert.ok(worker);assert.doesNotMatch(JSON.stringify(worker.messages),/MUTATED_AFTER_CALL/);controller.abort();await assert.rejects(()=>pending);
});

test('timeout, abort, worker crash and forged result drain the worker before rejecting',async()=>{
 const {EventEmitter}=await import('node:events');
 for(const cause of ['timeout','abort','crash','forged']){
  let release;const termination=new Promise(resolve=>{release=resolve;});
  class FakeWorker extends EventEmitter {constructor(){super();this.terminations=0;}postMessage(){}terminate(){this.terminations++;return termination;}}
  const worker=new FakeWorker(),controller=new AbortController(),instance=await renderer({workerFactory:()=>worker,timeoutMs:cause==='timeout'?10:10000});
  let settled=false;const pending=instance.render({diagram:diagram(),aspectRatio:'1:1',signal:controller.signal}).then(()=>{settled=true;return 'resolved';},()=>{settled=true;return 'rejected';});
  await Promise.resolve();if(cause==='abort')controller.abort();if(cause==='crash')worker.emit('error',Error('synthetic private detail'));
  if(cause==='forged')worker.emit('message',{ok:true,result:{bytes:Uint8Array.of(1),mimeType:'image/png',width:1600,height:1600,digest:'forged',rendererVersion:'foxy-diagram-png-v1'}});
  if(cause==='timeout')await new Promise(resolve=>setTimeout(resolve,30));else await Promise.resolve();
  assert.equal(worker.terminations,1,cause);assert.equal(settled,false,cause);release(0);assert.equal(await pending,'rejected',cause);
 }
});

test('invalid graph and already-aborted input never start a worker',async()=>{
 let created=0;const instance=await renderer({workerFactory:()=>{created++;throw Error('must not construct');}});
 await assert.rejects(()=>instance.render({diagram:diagram({nodes:[],edges:[]}),aspectRatio:'1:1',signal:new AbortController().signal}),error=>error?.code==='INVALID_INPUT');
 const aborted=new AbortController();aborted.abort();await assert.rejects(()=>instance.render({diagram:diagram(),aspectRatio:'1:1',signal:aborted.signal}));assert.equal(created,0);
});

for(const cause of ['factory','postMessage','terminate'])test(`worker setup, dispatch and termination errors are sanitized: ${cause}`,async()=>{
 const {EventEmitter}=await import('node:events'),privateDetail='synthetic-private-native-detail';
  let terminated=0;
  class FakeWorker extends EventEmitter {
   postMessage(){if(cause==='postMessage')throw Error(privateDetail);queueMicrotask(()=>this.emit('error',Error(privateDetail)));}
   terminate(){terminated++;if(cause==='terminate')return Promise.reject(Error(privateDetail));return Promise.resolve(0);}
  }
  const instance=await renderer({workerFactory:()=>{if(cause==='factory')throw Error(privateDetail);return new FakeWorker();}});
  await assert.rejects(()=>instance.render({diagram:diagram(),aspectRatio:'1:1',signal:new AbortController().signal}),error=>{
   assert.equal(error?.code,'SERVICE_UNAVAILABLE',cause);assert.doesNotMatch(String(error),new RegExp(privateDetail),cause);return true;
  });
  assert.equal(terminated,cause==='factory'?0:1,cause);
});
