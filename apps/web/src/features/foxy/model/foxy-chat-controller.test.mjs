import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from "../../../../../../tests/helpers/load-ts-module.mjs";

const conv=()=>({id:randomUUID(),title:'Chat',context:{kind:'GENERAL'},revision:'0'});
const capability={textGeneration:{enabled:true},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function fixture() {
  const calls=[],timers=[],a=conv(),b=conv(),id=randomUUID(),queue=[];
  const record=(name,fn)=>async(...args)=>{calls.push({name,args});return fn(...args);};
  const client={capabilities:record('capabilities',async()=>capability),listConversations:record('conversations',async()=>({items:[a,b],next:null})),
    createConversation:record('create',async input=>({created:true,conversation:{...a,title:input.title}})),
    listTurns:record('list',async(_id,page)=>({items:[],nextAfterSequence:null})),
    sendMessage:record('send',async()=>{const result=queue.shift();if(result instanceof Error)throw result;return result??{created:true,turn:{id,sequence:1,state:'QUEUED'},conversationRevision:'1'};}),
    getTurn:record('get',async()=>({id,sequence:1,state:'READY',purpose:'CHAT',message:'Hola',answer:{title:'Respuesta',markdown:'Texto',warnings:[],missingInformation:[]},errorCode:null,createdAt:'2026-01-01T00:00:00.000Z'}))};
  const onChange=()=>{}, setTimeout=(fn,ms)=>{const timer={ms,cleared:false,fn:()=>{timer.cleared=true;return fn();}};timers.push(timer);return timer;},clearTimeout=timer=>{timer.cleared=true;};
  const options={client,onChange,setTimeout,clearTimeout,uuid:()=>id};
  return {calls,timers,a,b,id,queue,client,options};
}
function create(f){const api=loadTsModule("apps/web/src/features/foxy/conversations/foxy-chat-controller.ts");assert.equal(typeof api.createFoxyChatController,'function');return api.createFoxyChatController(f.options);}

test('initializes capabilities and conversations and selects a newly created conversation',async()=>{
  const f=fixture(),c=create(f);await c.init();assert.deepEqual(c.getState().capabilities,capability);assert.equal(c.getState().conversations.length,2);
  await c.create({requestId:randomUUID(),title:'Nuevo',context:{kind:'GENERAL'}});assert.equal(c.getState().current.id,f.a.id);
  assert.ok(f.calls.some(x=>x.name==='create'));assert.ok(f.calls.some(x=>x.name==='list'));c.dispose();
});

test('failed send retains exact intent and explicit retry reuses request, revision and selection',async()=>{
  const f=fixture(),c=create(f);await c.init();await c.select(f.a.id);f.queue.push(Error('network'));
  const selection={topicIds:[],sourceIds:[]};await c.send('CHAT','Hola',selection);
  const sent=f.calls.filter(x=>x.name==='send');assert.equal(sent.length,1);const body=sent[0].args[1];
  assert.equal(body.requestId,f.id);assert.equal(body.revision,'0');assert.equal(body.text,'Hola');assert.deepEqual(body.selection,selection);
  assert.deepEqual(c.getState().pending,body);assert.ok(c.getState().error);assert.equal(f.timers.length,0);
  await c.retry();const retried=f.calls.filter(x=>x.name==='send');assert.equal(retried.length,2);assert.deepEqual(retried[1].args[1],body);
  c.dispose();
});

test('receipt triggers serial 2s polling only while queued or running, then fetches real answer',async()=>{
  const f=fixture(),gate=deferred();let count=0;
  f.client.getTurn=async()=>{count++;if(count===1)return gate.promise;return {id:f.id,sequence:1,state:'READY',purpose:'CHAT',message:'Hola',answer:{title:'R',markdown:'real',warnings:[],missingInformation:[]},errorCode:null,createdAt:'2026-01-01T00:00:00.000Z'};};
  const c=create(f);await c.init();await c.select(f.a.id);await c.send('CHAT','Hola',{topicIds:[],sourceIds:[]});
  assert.equal(c.getState().turns.some(t=>t.answer?.markdown==='real'),false);assert.equal(f.timers.at(-1).ms,2000);
  const tick=f.timers.at(-1).fn();await Promise.resolve();assert.equal(count,1);assert.equal(f.timers.length,1);
  gate.resolve({id:f.id,sequence:1,state:'RUNNING',answer:null});await tick;assert.equal(f.timers.at(-1).ms,2000);
  await f.timers.at(-1).fn();assert.equal(count,2);assert.ok(c.getState().turns.some(t=>t.answer?.markdown==='real'));
  assert.equal(f.timers.filter(t=>!t.cleared).length<=1,true);c.dispose();
});

test('changing conversations aborts stale reads, disposal prevents late state changes',async()=>{
  const f=fixture(),gate=deferred();f.client.listTurns=async(id,_page,signal)=>id===f.a.id?gate.promise:{items:[],nextAfterSequence:null};
  const c=create(f);await c.init();const old=c.select(f.a.id);await Promise.resolve();await c.select(f.b.id);
  gate.resolve({items:[{id:randomUUID(),sequence:1,state:'READY',message:'stale'}],nextAfterSequence:null});await old;
  assert.equal(c.getState().current.id,f.b.id);assert.equal(c.getState().turns.some(t=>t.message==='stale'),false);
  const before=structuredClone(c.getState());c.dispose();await Promise.resolve();assert.deepEqual(c.getState(),before);
});

test('follows nextAfterSequence even when first page contains fewer than requested',async()=>{
  const f=fixture();f.client.listTurns=async(_id,page)=>page.afterSequence===0?{items:[{id:randomUUID(),sequence:1,state:'READY'}],nextAfterSequence:1}
    :{items:[{id:randomUUID(),sequence:2,state:'READY'}],nextAfterSequence:null};
  const c=create(f);await c.init();await c.select(f.a.id);assert.equal(c.getState().nextAfterSequence,1);await c.loadMore();
  assert.deepEqual(c.getState().turns.map(t=>t.sequence),[1,2]);assert.equal(c.getState().nextAfterSequence,null);c.dispose();
});

test('reinitialization for another account immediately clears previous conversation, turns and pending prompt',async()=>{
  const f=fixture();let account=0;f.client.listConversations=async()=>({items:account?[f.b]:[f.a],next:null});
  f.client.listTurns=async()=>({items:[{id:randomUUID(),sequence:1,state:'READY',message:'Contenido privado A'}],nextAfterSequence:null});
  const c=create(f);await c.init();await c.select(f.a.id);f.queue.push(Error('network'));await c.send('CHAT','Solicitud privada A',{topicIds:[],sourceIds:[]});
  assert.ok(c.getState().pending);account=1;await c.init();const state=c.getState();
  assert.equal(state.current,null);assert.deepEqual(state.turns,[]);assert.equal(state.pending,null);
  assert.equal(JSON.stringify(state).includes('privada A'),false);assert.deepEqual(state.conversations.map(x=>x.id),[f.b.id]);c.dispose();
});

test('a queued or running receipt fences another send while polling the acknowledged turn',async()=>{
  for(const status of ['QUEUED','RUNNING']) {
    const f=fixture();f.queue.push({created:true,turn:{id:f.id,sequence:1,state:status},conversationRevision:'1'});
    const c=create(f);await c.init();await c.select(f.a.id);await c.send('CHAT','Primero',{topicIds:[],sourceIds:[]});
    assert.ok(f.timers.some(t=>!t.cleared && t.ms===2000));
    await c.send('CHAT','Segundo',{topicIds:[],sourceIds:[]});assert.equal(f.calls.filter(x=>x.name==='send').length,1);
    assert.equal(c.getState().turns.some(t=>t.answer?.markdown),false);c.dispose();
  }
});

test('a running turn found on a later page starts polling and never overlaps reads',async()=>{
  const f=fixture(),gate=deferred();let polls=0;
  f.client.listTurns=async(_id,page)=>page.afterSequence===0?{items:[{id:randomUUID(),sequence:1,state:'READY'}],nextAfterSequence:1}
    :{items:[{id:f.id,sequence:2,state:'RUNNING'}],nextAfterSequence:null};
  f.client.getTurn=async()=>{polls++;return gate.promise;};
  const c=create(f);await c.init();await c.select(f.a.id);await c.loadMore();
  const timer=f.timers.find(t=>!t.cleared);assert.ok(timer);assert.equal(timer.ms,2000);
  const ongoing=timer.fn();await Promise.resolve();assert.equal(polls,1);assert.equal(f.timers.filter(t=>!t.cleared).length,0);
  gate.resolve({id:f.id,sequence:2,state:'READY',answer:{title:'R',markdown:'Texto'}});await ongoing;
  assert.equal(f.timers.filter(t=>!t.cleared).length,0);c.dispose();
});

test('turn pagination merges concurrent newer turn and overlapping page by ID in sequence order',async()=>{
  const f=fixture(),one={id:randomUUID(),sequence:1,state:'READY'},two={id:randomUUID(),sequence:2,state:'READY'},three={id:f.id,sequence:3,state:'READY',answer:{title:'R',markdown:'Texto'}};
  f.client.listTurns=async(_id,page)=>page.afterSequence===0?{items:[one],nextAfterSequence:1}:{items:[two,three],nextAfterSequence:null};
  f.client.getTurn=async()=>three;
  const c=create(f);await c.init();await c.select(f.a.id);await c.send('CHAT','Hola',{topicIds:[],sourceIds:[]});
  await f.timers.at(-1).fn();await c.loadMore();
  assert.deepEqual(c.getState().turns.map(t=>t.sequence),[1,2,3]);assert.equal(new Set(c.getState().turns.map(t=>t.id)).size,3);c.dispose();
});

test('more than 50 conversations remain accessible using server cursor',async()=>{
  const f=fixture(),items=Array.from({length:53},(_,i)=>({...conv(),title:`Chat ${i+1}`})),cursor={updatedAt:'2026-01-01T00:00:00.000Z',id:items[49].id},seen=[];
  f.client.listConversations=async page=>{seen.push(page);return page.after===null?{items:items.slice(0,50),next:cursor}:{items:items.slice(50),next:null};};
  const c=create(f);await c.init();assert.equal(c.getState().conversations.length,50);assert.deepEqual(c.getState().nextConversationCursor,cursor);
  await c.loadMoreConversations();assert.deepEqual(seen[1].after,cursor);assert.equal(c.getState().conversations.length,53);
  assert.equal(c.getState().nextConversationCursor,null);assert.equal(new Set(c.getState().conversations.map(x=>x.id)).size,53);c.dispose();
});

test('terminal receipt with failed read never leaves an active-turn lock or resends the prior intent',async()=>{
  for(const status of ['READY','FAILED','STALE']) {
    const f=fixture();f.queue.push({created:false,turn:{id:f.id,sequence:1,state:status},conversationRevision:'1'});
    f.client.getTurn=async()=>{throw Object.assign(Error('network'),{code:'SERVICE_UNAVAILABLE'});};
    const c=create(f);await c.init();await c.select(f.a.id);await c.send('CHAT','Primero',{topicIds:[],sourceIds:[]});
    assert.ok(c.getState().error);assert.equal(c.getState().activeTurn,null);assert.equal(c.getState().pending,null);
    assert.equal(c.getState().turns.some(t=>t.answer?.markdown),false);
    await c.send('CHAT','Segundo',{topicIds:[],sourceIds:[]});const sends=f.calls.filter(x=>x.name==='send');
    assert.equal(sends.length,2);assert.equal(sends[0].args[1].text,'Primero');assert.equal(sends[1].args[1].text,'Segundo');
    assert.notEqual(sends[0].args[1],sends[1].args[1]);c.dispose();
  }
});

test('disposed controller performs no subsequent client I/O and ignores late completion',async()=>{
  const f=fixture(), gate=deferred(); let pendingSignal;
  f.client.listTurns=async(_id,_page,signal)=>{f.calls.push({name:'list',args:[_id,_page,signal]});pendingSignal=signal;return gate.promise;};
  const c=create(f);await c.init();const selecting=c.select(f.a.id);await Promise.resolve();
  assert.ok(pendingSignal instanceof AbortSignal);c.dispose();assert.equal(pendingSignal.aborted,true);
  const before=structuredClone(c.getState()),calls=f.calls.length;
  gate.resolve({items:[{id:randomUUID(),sequence:1,state:'READY',message:'late private'}],nextAfterSequence:null});await selecting;
  await c.init();await c.select(f.b.id);await c.create({requestId:randomUUID(),title:'Nuevo',context:{kind:'GENERAL'}});
  await c.send('CHAT','Texto',{topicIds:[],sourceIds:[]});await c.retry();await c.loadMore();await c.loadMoreConversations();
  assert.equal(f.calls.length,calls);assert.deepEqual(c.getState(),before);
});

test('late terminal read never clears a newer queued turn or its polling',async()=>{
  const f=fixture(),oldId=randomUUID(),newId=randomUUID(),gate=deferred();let reads=0;
  f.queue.push({created:false,turn:{id:oldId,sequence:1,state:'READY'},conversationRevision:'1'},
    {created:true,turn:{id:newId,sequence:2,state:'QUEUED'},conversationRevision:'2'});
  f.client.getTurn=async(_conversation,id)=>{reads++;assert.equal(id,oldId);return gate.promise;};
  const c=create(f);await c.init();await c.select(f.a.id);
  const first=c.send('CHAT','Primero',{topicIds:[],sourceIds:[]});for(let i=0;i<12 && reads===0;i++)await Promise.resolve();
  assert.equal(reads,1);await c.send('CHAT','Segundo',{topicIds:[],sourceIds:[]});
  assert.equal(c.getState().activeTurn?.id,newId);const timer=f.timers.find(t=>!t.cleared);assert.ok(timer);
  gate.resolve({id:oldId,sequence:1,state:'READY',purpose:'CHAT',message:'Primero',answer:{title:'R',markdown:'Texto'}});await first;
  assert.equal(c.getState().activeTurn?.id,newId);assert.equal(timer.cleared,false);
  await c.send('CHAT','Tercero',{topicIds:[],sourceIds:[]});assert.equal(f.calls.filter(x=>x.name==='send').length,2);c.dispose();
});

test('stale running page cannot reactivate a turn already completed by polling',async()=>{
  const f=fixture(),pageGate=deferred(),pollGate=deferred(),old={id:randomUUID(),sequence:1,state:'READY'},older={id:randomUUID(),sequence:2,state:'READY'};
  f.client.listTurns=async(_id,page)=>page.afterSequence===0?{items:[old],nextAfterSequence:1}:pageGate.promise;
  f.client.getTurn=async()=>pollGate.promise;
  const c=create(f);await c.init();await c.select(f.a.id);await c.send('CHAT','Hola',{topicIds:[],sourceIds:[]});
  const polling=f.timers.at(-1).fn(), loading=c.loadMore();await Promise.resolve();
  pollGate.resolve({id:f.id,sequence:3,state:'READY',purpose:'CHAT',message:'Hola',answer:{title:'R',markdown:'Listo'}});await polling;
  pageGate.resolve({items:[older,{id:f.id,sequence:3,state:'RUNNING',answer:null}],nextAfterSequence:null});await loading;
  assert.equal(c.getState().turns.find(t=>t.id===f.id).state,'READY');assert.equal(c.getState().activeTurn,null);
  assert.equal(f.timers.filter(t=>!t.cleared).length,0);c.dispose();
});

test('two concurrent creates issue one mutation and preserve the selected conversation',async()=>{
  const f=fixture(),gate=deferred();let requests=0;
  f.client.createConversation=async input=>{requests++;return gate.promise;};
  const c=create(f);await c.init();const input={requestId:randomUUID(),title:'Nuevo',context:{kind:'GENERAL'}};
  const first=c.create(input),second=c.create(input);await Promise.resolve();assert.equal(requests,1);
  gate.resolve({created:true,conversation:f.a});await Promise.all([first,second]);assert.equal(c.getState().current.id,f.a.id);c.dispose();
});

test('multi-tab page transfers polling to newer running turn after older poll completes',async()=>{
  const f=fixture(),gate=deferred(),id4=randomUUID(),first={id:randomUUID(),sequence:1,state:'READY'},second={id:randomUUID(),sequence:2,state:'READY'};
  f.queue.push({created:true,turn:{id:f.id,sequence:3,state:'QUEUED'},conversationRevision:'3'});
  f.client.listTurns=async(_id,page)=>page.afterSequence===0?{items:[first],nextAfterSequence:1}
    :{items:[second,{id:f.id,sequence:3,state:'READY',answer:{title:'R',markdown:'Listo'}},{id:id4,sequence:4,state:'RUNNING',answer:null}],nextAfterSequence:null};
  let polls=0;f.client.getTurn=async(_id,turnId)=>{polls++;assert.equal(turnId,f.id);return gate.promise;};
  const c=create(f);await c.init();await c.select(f.a.id);await c.send('CHAT','Consulta',{topicIds:[],sourceIds:[]});
  const running=f.timers.at(-1).fn();await Promise.resolve();assert.equal(polls,1);await c.loadMore();
  gate.resolve({id:f.id,sequence:3,state:'READY',answer:{title:'R',markdown:'Listo'}});await running;
  assert.equal(c.getState().activeTurn?.id,id4);assert.equal(c.getState().activeTurn?.state,'RUNNING');
  assert.equal(f.timers.filter(t=>!t.cleared).length,1);assert.equal(f.timers.find(t=>!t.cleared).ms,2000);
  await c.send('CHAT','Otro',{topicIds:[],sourceIds:[]});assert.equal(f.calls.filter(x=>x.name==='send').length,1);c.dispose();
});

test('definitive INVALID_INPUT clears uncertain retry and permits corrected input',async()=>{
  const f=fixture(),c=create(f);await c.init();await c.select(f.a.id);
  f.queue.push(Object.assign(Error('invalid'),{code:'INVALID_INPUT',status:400}));
  await c.send('CHAT','Texto inválido',{topicIds:[],sourceIds:[]});
  assert.equal(c.getState().pending,null);assert.ok(c.getState().error);
  await c.retry();assert.equal(f.calls.filter(x=>x.name==='send').length,1);
  await c.send('CHAT','Texto corregido',{topicIds:[],sourceIds:[]});
  const sends=f.calls.filter(x=>x.name==='send');assert.equal(sends.length,2);assert.equal(sends[1].args[1].text,'Texto corregido');c.dispose();
});

test('a transient rate limit retries the same turn without a second send and clears the warning on success', async () => {
  const f = fixture(), c = create(f);
  let reads = 0;
  f.client.getTurn = async () => {
    if (++reads === 1) throw Object.assign(new Error('rate'), { code: 'RATE_LIMITED', status: 429 });
    return { id: f.id, sequence: 1, state: 'READY', purpose: 'CHAT', message: 'Hola' };
  };
  await c.init(); await c.select(f.a.id); await c.send('CHAT', 'Hola', { topicIds: [], sourceIds: [] });
  await f.timers.at(-1).fn();
  assert.ok(c.getState().pollError);
  assert.equal(c.getState().activeTurn.id, f.id);
  assert.ok(f.timers.at(-1).ms > 2000);
  assert.ok(!f.timers.at(-1).cleared);
  await f.timers.at(-1).fn();
  assert.equal(c.getState().activeTurn, null);
  assert.equal(c.getState().pollError, null);
  assert.equal(f.calls.filter(event => event.name === 'send').length, 1);
  c.dispose();
});
