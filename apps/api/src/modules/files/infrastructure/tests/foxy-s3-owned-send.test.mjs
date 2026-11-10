import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {S3Storage} from '../storage.ts';

function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}
for(const outcome of ['resolve','reject'])test(`timed-out S3 send remains owned until late ${outcome} and close drains it`,async()=>{
 const gate=deferred(),entered=deferred();let calls=0,aborted=false;
 const client={send(_command,{abortSignal}){calls++;abortSignal.addEventListener('abort',()=>{aborted=true},{once:true});entered.resolve();return gate.promise;},destroy(){}};
 const storage=new S3Storage(client,'synthetic-private',20),key=`foxy-assets/${randomUUID()}/${randomUUID()}`;
 const first=storage.put(key,Buffer.from('synthetic'));await entered.promise;
 try{
  await assert.rejects(first,e=>e?.code==='SERVICE_UNAVAILABLE');assert.equal(aborted,true);
  await assert.rejects(storage.put(key,Buffer.from('again')),e=>e?.code==='SERVICE_UNAVAILABLE');assert.equal(calls,1);
  assert.equal(typeof storage.close,'function');let closed=false;const closing=storage.close().then(()=>{closed=true});await Promise.resolve();assert.equal(closed,false);
  if(outcome==='resolve')gate.resolve({});else gate.reject(Error('synthetic late error'));
  await closing;assert.equal(closed,true);
 }finally{gate.resolve({});}
});
test('storage close does not resolve before an aborted send actually settles',async()=>{
 const gate=deferred();let destroyed=false;const client={send:()=>gate.promise,destroy:()=>{destroyed=true}},storage=new S3Storage(client,'synthetic-private',20),key=`foxy-assets/${randomUUID()}/${randomUUID()}`;
 try{
  await assert.rejects(storage.put(key,Buffer.from('synthetic')),e=>e?.code==='SERVICE_UNAVAILABLE');
  assert.equal(typeof storage.close,'function');let finished=false;const close=storage.close().then(()=>{finished=true});await Promise.resolve();assert.equal(finished,false);assert.equal(destroyed,false);
  await assert.rejects(storage.put(key,Buffer.from('after close')),e=>e?.code==='SERVICE_UNAVAILABLE');
  gate.resolve({});await close;assert.equal(finished,true);assert.equal(destroyed,true);
 }finally{gate.resolve({});}
});
test('drain times out without forgetting the live send or releasing its slot',async()=>{
 const gate=deferred();let calls=0;const client={send:()=>{calls++;return gate.promise},destroy:()=>{}},storage=new S3Storage(client,'synthetic-private',20,35),key=`foxy-assets/${randomUUID()}/${randomUUID()}`;
 try{
  await assert.rejects(storage.put(key,Buffer.from('synthetic')),e=>e?.code==='SERVICE_UNAVAILABLE');assert.equal(typeof storage.drain,'function');
  await assert.rejects(storage.drain(),e=>e?.code==='SERVICE_UNAVAILABLE');await assert.rejects(storage.put(key,Buffer.from('again')),e=>e?.code==='SERVICE_UNAVAILABLE');assert.equal(calls,1);
  gate.resolve({});await storage.drain();await storage.close();
 }finally{gate.resolve({});}
});
test('independent healthy P4 writes can run in parallel',async()=>{
 const gate=deferred(),entered=deferred();let calls=0;const client={send:()=>{calls++;entered.resolve();return gate.promise},destroy(){}},storage=new S3Storage(client,'synthetic-private',2000,2000);
 const key1=`p4/${randomUUID()}/one`,key2=`p4/${randomUUID()}/two`,first=storage.put(key1,Buffer.from('first')).then(()=>null,e=>e);await entered.promise;
 const second=storage.put(key2,Buffer.from('second')).then(()=>null,e=>e);
 try{await new Promise(r=>setTimeout(r,25));assert.equal(calls,2,'independent writes must reach SDK without waiting for each other');}
 finally{gate.resolve({});await Promise.all([first,second]);await storage.close();}
});
test('close aborts active sends before waiting for drain',async()=>{
 const entered=deferred();let aborted=false,destroyed=false;
 const client={send:(_command,{abortSignal})=>new Promise((resolve,reject)=>{abortSignal.addEventListener('abort',()=>{aborted=true;reject(Error('synthetic abort'))},{once:true});entered.resolve();}),destroy:()=>{destroyed=true}};
 const storage=new S3Storage(client,'synthetic-private',500,50),key=`p4/${randomUUID()}/abort`,pending=storage.put(key,Buffer.from('synthetic')).then(()=>null,e=>e);await entered.promise;
 try{await storage.close();assert.equal(aborted,true);assert.equal(destroyed,true);assert.ok(await pending);}
 finally{await pending;}
});
test('uncertain visual PUT fences visual mutations while allowing exact-key GET and independent P4 writes',async()=>{
 const gate=deferred(),started=deferred(),owner=randomUUID(),first=`foxy-assets/${owner}/${randomUUID()}`,second=`foxy-assets/${owner}/${randomUUID()}`,p4=`p4/${randomUUID()}/plan`;let calls=[];
 const client={send(command){const name=command.constructor.name;calls.push({name,key:command.input.Key});if(name==='PutObjectCommand'&&command.input.Key===first){started.resolve();return gate.promise;}if(name==='GetObjectCommand')return Promise.resolve({ContentLength:3,Body:(async function*(){yield Buffer.from('one')})()});return Promise.resolve({});},destroy(){}};
 const storage=new S3Storage(client,'synthetic-private',30,1000),pending=storage.put(first,Buffer.from('one'));await started.promise;
 try{
  await assert.rejects(pending,e=>e?.code==='SERVICE_UNAVAILABLE');
  await assert.rejects(storage.put(second,Buffer.from('two')),e=>e?.code==='SERVICE_UNAVAILABLE');
  assert.equal((await storage.get(first,3)).toString(),'one');await storage.put(p4,Buffer.from('p4'));
  assert.equal(calls.filter(x=>x.name==='PutObjectCommand'&&x.key===first).length,1);assert.equal(calls.some(x=>x.key===second),false);assert.equal(calls.some(x=>x.key===p4),true);
 }finally{gate.resolve({});await storage.drain();await storage.close();}
});
test('close reports drain timeout and destroys client even when real send remains pending',async()=>{
 const gate=deferred();let destroyed=0;const storage=new S3Storage({send:()=>gate.promise,destroy:()=>{destroyed++}},'synthetic-private',20,35),key=`p4/${randomUUID()}/plan`;
 try{await assert.rejects(storage.put(key,Buffer.from('one')),e=>e?.code==='SERVICE_UNAVAILABLE');await assert.rejects(storage.close(),e=>e?.code==='SERVICE_UNAVAILABLE');assert.equal(destroyed,1);}
 finally{gate.resolve({});await storage.drain();}
});
test('drain timeout configuration rejects values greater than 30000ms',()=>{
 const client={send:async()=>({}),destroy(){}};assert.throws(()=>new S3Storage(client,'synthetic-private',20,30001),e=>e?.code==='SERVICE_UNAVAILABLE');
});
for(const family of ['p4','foxy-assets'])test(`uncertain ${family} mutation fences its scope only, not other owners`,async()=>{
 const gate=deferred(),started=deferred(),scope=randomUUID(),other=randomUUID(),first=`${family}/${scope}/${family==='p4'?'first':randomUUID()}`,
  same=`${family}/${scope}/${family==='p4'?'second':randomUUID()}`,different=`${family}/${other}/${family==='p4'?'third':randomUUID()}`;let sent=[];
 const storage=new S3Storage({send(command){sent.push(command.input.Key);if(command.input.Key===first){started.resolve();return gate.promise;}return Promise.resolve({});},destroy(){}},'synthetic-private',30,1000);
 const pending=storage.put(first,Buffer.from('first'));await started.promise;
 try{await assert.rejects(pending,e=>e?.code==='SERVICE_UNAVAILABLE');await assert.rejects(storage.put(same,Buffer.from('same')),e=>e?.code==='SERVICE_UNAVAILABLE');
  await storage.put(different,Buffer.from('other'));assert.deepEqual(sent,[first,different]);
 }finally{gate.resolve({});await storage.drain();await storage.close();}
});
test('GET aborted by close rejects even when destroy resolves the pending read as EOF',async()=>{
 const reading=deferred(),done=deferred();let index=0,destroyed=false;
 const body={destroy(){destroyed=true;done.resolve({done:true})},[Symbol.asyncIterator](){return this;},next(){if(index++===0)return Promise.resolve({done:false,value:Buffer.from('a')});reading.resolve();return done.promise;}};
 const storage=new S3Storage({send:async()=>({ContentLength:1,Body:body}),destroy(){}},'synthetic-private',1000,1000),key=`p4/${randomUUID()}/read`;
 const get=storage.get(key,1).then(value=>({value}),error=>({error}));await reading.promise;await storage.close();
 const outcome=await get;assert.equal(destroyed,true);assert.equal(outcome.error?.code,'SERVICE_UNAVAILABLE');assert.equal(outcome.value,undefined);
});
