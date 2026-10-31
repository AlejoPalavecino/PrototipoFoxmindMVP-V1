import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from '../../../../tests/helpers/load-ts-module.mjs';

function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};}
function fixture(archived=false){
  const room=randomUUID(),topicIds=Array.from({length:101},()=>randomUUID()),cid=randomUUID(),tid=randomUUID(),calls=[];
  const conversation={id:cid,title:'Aula',context:{kind:'CLASSROOM',classroomId:room},revision:'0'};
  const curriculum={context:conversation.context,classroomRevision:'2',classroomTitle:'Biología',archived,canGenerate:!archived,
    units:[{id:randomUUID(),name:'Unidad',position:0,topics:topicIds.map((id,i)=>({id,name:`Tema ${i}`,position:i,status:['TAUGHT','NEXT','PENDING'][i%3]}))}]};
  const sources=Array.from({length:21},(_,i)=>({sourceId:`${i===0?'plan':i===1?'material':'activity'}:${randomUUID()}`,kind:i===0?'PLAN':i===1?'MATERIAL':'ACTIVITY',title:`Fuente ${i}`,
    available:i!==20,reason:i===20?'FILE_NOT_READY':null,documentCount:i<7?1:0,planVersion:i===0?1:null,currentPlan:i===0,extension:'pdf',sizeBytes:'10',unitId:null,topicIds:[],createdAt:'2026-01-01T00:00:00.000Z',publishedAt:null}));
  const client={capabilities:async()=>({textGeneration:{enabled:true},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}}),
    listConversations:async()=>({items:[conversation],next:null}),listTurns:async()=>({items:[],nextAfterSequence:null}),
    curriculum:async(id,signal)=>{calls.push(['curriculum',id,signal]);return curriculum;},
    sources:async(id,page,signal)=>{calls.push(['sources',id,page,signal]);return {context:conversation.context,items:sources.filter(s=>s.kind===page.kind),next:null};},
    citations:async(id,turn,signal)=>{calls.push(['citations',id,turn,signal]);return [{id:'c1',sourceKind:'PLAN',sourceTitle:'Plan',documentTitle:'plan.pdf',page:1,availability:'AVAILABLE',href:`/api/v1/foxy-ai/conversations/${cid}/turns/${tid}/citations/c1/file`}];},
    citationUrl:(id,turn,citation,mode)=>`/api/v1/foxy-ai/conversations/${id}/turns/${turn}/citations/${citation}/file?mode=${mode}`,
    sendMessage:async(...args)=>{calls.push(['send',...args]);return {created:true,turn:{id:tid,sequence:1,state:'QUEUED'},conversationRevision:'1'};}};
  const api=loadTsModule('apps/web/src/lib/foxy-chat-controller.ts'),controller=api.createFoxyChatController({client,onChange:()=>{},uuid:randomUUID,setTimeout:()=>1,clearTimeout:()=>{}});
  return {controller,client,calls,conversation,curriculum,sources,topicIds,cid,tid};
}

test('classroom context loads curriculum and source categories with explicit selection',async()=>{
  const f=fixture(),c=f.controller;await c.init();await c.select(f.cid);
  assert.deepEqual(c.getState().curriculum,f.curriculum);assert.deepEqual(c.getState().selection,{topicIds:[],sourceIds:[]});
  for(const kind of ['PLAN','MATERIAL','ACTIVITY'])await c.loadSources(kind);
  c.selectTopic(f.topicIds[1]);c.selectSource(f.sources[0].sourceId);c.selectSource(f.sources[1].sourceId);
  await c.send('SUMMARY','Resumen',c.getState().selection);const call=f.calls.find(x=>x[0]==='send');
  assert.deepEqual(call[2].selection,{topicIds:[f.topicIds[1]],sourceIds:[f.sources[0].sourceId,f.sources[1].sourceId]});c.dispose();
});

test('selection rejects unavailable sources and enforces 100 topics, 20 sources and six documents',async()=>{
  const f=fixture(),c=f.controller;await c.init();await c.select(f.cid);for(const kind of ['PLAN','MATERIAL','ACTIVITY'])await c.loadSources(kind);
  for(const id of f.topicIds)c.selectTopic(id);assert.equal(c.getState().selection.topicIds.length,100);
  for(const source of f.sources)c.selectSource(source.sourceId);
  const selected=c.getState().selection.sourceIds;assert.ok(selected.length<=20);assert.equal(selected.includes(f.sources[20].sourceId),false);
  assert.ok(f.sources.filter(s=>selected.includes(s.sourceId)).reduce((n,s)=>n+s.documentCount,0)<=6);c.dispose();
});

test('archived classroom cannot send, even when text capability is enabled',async()=>{
  const f=fixture(true),c=f.controller;await c.init();await c.select(f.cid);await c.send('CHAT','Hola',{topicIds:[],sourceIds:[]});
  assert.equal(f.calls.some(call=>call[0]==='send'),false);c.dispose();
});

test('citations load only on demand and late response cannot cross conversations',async()=>{
  const f=fixture(),c=f.controller,gate=deferred();f.client.citations=async(...args)=>{f.calls.push(['citations',...args]);return gate.promise;};
  await c.init();await c.select(f.cid);assert.equal(f.calls.some(x=>x[0]==='citations'),false);
  const loading=c.loadCitations(f.tid);await Promise.resolve();assert.equal(f.calls.filter(x=>x[0]==='citations').length,1);
  await c.select(randomUUID());gate.resolve([{id:'c1',availability:'AVAILABLE',href:'/private'}]);await loading;
  assert.equal(JSON.stringify(c.getState().citations??{}).includes('/private'),false);c.dispose();
});

test('general conversation sends no selected classroom context',async()=>{
  const f=fixture(),c=f.controller;f.conversation.context={kind:'GENERAL'};await c.init();await c.select(f.cid);
  await c.send('CHAT','Hola',{topicIds:[],sourceIds:[]});const sent=f.calls.find(x=>x[0]==='send');
  assert.deepEqual(sent[2].selection,{topicIds:[],sourceIds:[]});assert.equal(f.calls.some(x=>x[0]==='curriculum'||x[0]==='sources'),false);c.dispose();
});

test('stale classroom curriculum cannot cross a conversation change',async()=>{
  const f=fixture(),c=f.controller,gate=deferred();let signal;
  f.client.curriculum=async(_id,s)=>{signal=s;return gate.promise;};await c.init();const loading=c.select(f.cid);await Promise.resolve();
  await c.select(randomUUID());assert.equal(signal?.aborted,true);gate.resolve(f.curriculum);await loading;
  assert.notDeepEqual(c.getState().curriculum,f.curriculum);c.dispose();
});
