import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {hookView,deferred} from './agenda-ui-helpers.test.mjs';

const input={kind:'NOTE',message:'Mi indicación real',topicIds:['topic'],questionCount:5,difficulty:'MEDIUM'};
const job={...input,requestId:'restored-request',status:'PENDING'};
const folder={id:'folder'};
const withStatus=status=>({folder,conversations:[{id:'chat',turns:[{id:'turn',role:'user',text:input.message,generation:{...job,status}}]}],creations:[],practices:[]});
function load(){return componentWithPorts('apps/web/src/features/study/model/use-study-generation.ts',{}).useStudyGeneration;}

test('recarga PENDING consulta GET y termina de consultar cuando el recibo es COMPLETE',async()=>{
 const hook=load(),scheduled=new Map();let next=0,reloads=0;
 const oldSet=globalThis.setTimeout,oldClear=globalThis.clearTimeout;
 globalThis.setTimeout=callback=>{scheduled.set(++next,callback);return next;};globalThis.clearTimeout=id=>scheduled.delete(id);
 const view=hookView(()=>{const [detail,setDetail]=React.useState(withStatus('PENDING'));return hook({detail,current:detail.conversations[0],busy:false,active:true,run:async()=>assert.fail('poll must not mutate'),onConversation(){},onReload:async()=>{reloads++;setDetail(withStatus('COMPLETE'));}});},{});
 try{await view.flush();assert.equal(view.tree.blocked,true);assert.equal(scheduled.size,1);const callback=[...scheduled.values()][0];scheduled.clear();await callback();await view.flush();assert.equal(reloads,1);assert.equal(view.tree.blocked,false);assert.equal(scheduled.size,0);}finally{view.close();globalThis.setTimeout=oldSet;globalThis.clearTimeout=oldClear;}
});

test('envío duplicado se bloquea y transporte incierto reintenta con el mismo requestId y chat',async()=>{
 const hook=load(),first=deferred(),calls=[];let selected;
 const view=hookView(()=>hook({detail:{folder,conversations:[],creations:[],practices:[]},busy:false,active:true,onConversation:id=>{selected=id;},onReload:async()=>{},run:async(action,data,requestId)=>{calls.push({action,data,requestId});if(action==='NEW_CONVERSATION')return {result:{conversation:{id:'new-chat'}}};if(calls.filter(call=>call.action==='GENERATE').length===1)return first.promise;return {result:{creation:{id:'created'}}};}}),{});
 try{await view.flush();const sending=view.tree.submit(input);const duplicate=view.tree.submit(input);await view.flush();assert.equal(await duplicate,false);assert.equal(calls.filter(call=>call.action==='GENERATE').length,1);assert.equal(selected,'new-chat');first.reject(Object.assign(new Error('transporte'),{code:'SERVICE_UNAVAILABLE'}));assert.equal(await sending,false);await view.flush();assert.equal(view.tree.local.phase,'UNCERTAIN');await view.tree.retryLocal();await view.flush();const requests=calls.filter(call=>call.action==='GENERATE');assert.equal(requests.length,2);assert.equal(requests[0].requestId,requests[1].requestId);assert.equal(requests[1].data.conversationId,'new-chat');assert.equal(calls.filter(call=>call.action==='NEW_CONVERSATION').length,1);}finally{view.close();}
});

test('cancelación recuperada usa el requestId persistido; reintento terminal crea otra identidad',async()=>{
 const hook=load(),calls=[];let cancelled;
 const view=hookView(()=>{const [detail,setDetail]=React.useState(withStatus('PENDING'));return hook({detail,current:detail.conversations[0],busy:false,active:true,onConversation(){},onReload:async()=>setDetail(withStatus('CANCELLED')),cancelGeneration:async id=>{cancelled=id;return 'CANCELLED';},run:async(action,data,requestId)=>{calls.push({action,data,requestId});return {};}});},{});
 try{await view.flush();await view.tree.stop('restored-request');await view.flush();assert.equal(cancelled,'restored-request');assert.equal(view.tree.requests[0].status,'CANCELLED');await view.tree.retry(view.tree.requests[0]);await view.flush();assert.equal(calls[0].action,'GENERATE');assert.notEqual(calls[0].requestId,'restored-request');assert.equal(calls[0].data.message,input.message);assert.equal(calls[0].data.conversationId,'chat');}finally{view.close();}
});

test('el recibo CANCELLED de la solicitud original no se presenta como creación completa',async()=>{
 const hook=load();
 const view=hookView(()=>hook({detail:withStatus('COMPLETE'),current:withStatus('COMPLETE').conversations[0],busy:false,active:true,onConversation(){},onReload:async()=>{},run:async()=>({result:{status:'CANCELLED'}})}),{});
 try{await view.flush();assert.equal(await view.tree.submit(input),false);await view.flush();assert.equal(view.tree.local.phase,'CANCELLED');assert.equal(view.tree.local.data.message,input.message);}finally{view.close();}
});
