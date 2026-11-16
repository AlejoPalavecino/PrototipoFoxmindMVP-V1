import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const lease={turnId:randomUUID(),ownerId:randomUUID(),conversationId:randomUUID(),leaseNonce:randomUUID()};
const pair=i=>({user:`Pregunta ${i}`,assistant:{title:`Título ${i}`,markdown:`Respuesta ${i}`}});
const grounding={context:{kind:'GENERAL'},curriculum:null,sources:[],documents:[],referenceMap:[],warnings:[]};
const payload=(version='foxy-chat-v2',history=[pair(1),pair(2),pair(3)])=>({purpose:'CHAT',message:'Pregunta actual',history,metadata:{model:'synthetic',promptVersion:version,schemaVersion:'foxy-answer-v1'}});
function fixture({turn=payload(),count}={}) {
  const calls=[],scope={capability:{},snapshot:{},documents:[]};
  const options={turns:{loadClaimed:async(...args)=>{calls.push(['turn',...args]);return turn;}},authority:{open:async()=>scope,close:()=>calls.push(['close'])},
    loader:{load:async()=>grounding},provider:{countTokens:async input=>{calls.push(['count',input]);return count?count(input,calls.filter(x=>x[0]==='count').length):10;}},configuration:{model:'synthetic',maxInputTokens:100}};
  return {options,calls,scope};
}
async function prepare(f,signal=new AbortController().signal){const {createFoxyTurnPreparation}=await import("../turn-preparation.ts");return createFoxyTurnPreparation(f.options).prepare(lease,signal);}

test('projection includes only copied, allowed history fields and preserves source isolation',async()=>{
  const {projectFoxyTextInput}=await import("../provider-input.ts"),signal=new AbortController().signal,history=[{...pair(1),privateId:randomUUID(),assistant:{...pair(1).assistant,sourceId:randomUUID()}}];
  const result=projectFoxyTextInput({purpose:'CHAT',message:'Actual',grounding,history,signal});
  assert.deepEqual(result.history,[pair(1)]);assert.equal(result.signal,signal);assert.notEqual(result.history,history);
  assert.equal(JSON.stringify(result).includes(history[0].privateId),false);assert.equal(JSON.stringify(result).includes(history[0].assistant.sourceId),false);
});

test('preflight drops oldest complete pairs only for true token limits and keeps sources/query',async()=>{
  for(const byError of [false,true]){
    const f=fixture({count:(_input,n)=>{if(n<3){if(byError)throw Object.assign(Error('limit'),{code:'AI_INPUT_LIMIT'});return 101;}return 80;}});
    const signal=new AbortController().signal,result=await prepare(f,signal),counts=f.calls.filter(c=>c[0]==='count');
    assert.deepEqual(counts.map(c=>c[1].history.length),[3,2,1]);assert.deepEqual(result.input.history,[pair(3)]);
    assert.ok(counts.every(c=>c[1].message==='Pregunta actual'&&c[1].sources.length===0&&c[1].signal===signal));
    assert.equal(result.count,80);
  }
});

test('oversized base context is rejected after two counts, other failures never retry',async()=>{
  const f=fixture({turn:payload('foxy-chat-v2',Array.from({length:10},(_,i)=>pair(i))),count:()=>{throw Object.assign(Error('limit'),{code:'AI_INPUT_LIMIT'});}});
  await assert.rejects(prepare(f));assert.equal(f.calls.filter(x=>x[0]==='count').length,2);assert.ok(f.calls.some(x=>x[0]==='close'));
  for(const failure of [Object.assign(Error('failure'),{code:'AI_UNAVAILABLE'}),NaN,1.5]){
    const g=fixture({count:()=>{if(failure instanceof Error)throw failure;return failure;}});await assert.rejects(prepare(g));assert.equal(g.calls.filter(x=>x[0]==='count').length,1);
  }
});

test('v1 pending turn cannot dispatch and abort interrupts before further counts',async()=>{
  const old=fixture({turn:payload('foxy-chat-v1')});await assert.rejects(prepare(old));assert.equal(old.calls.filter(x=>x[0]==='count').length,0);
  const controller=new AbortController(), f=fixture({count:()=>{controller.abort();throw Object.assign(Error('limit'),{code:'AI_INPUT_LIMIT'});}});
  await assert.rejects(prepare(f,controller.signal));assert.equal(f.calls.filter(x=>x[0]==='count').length,1);
});

test('Gemini preflight includes history as untrusted continuity and binds it to generation',async()=>{
  const {GeminiFoxyTextAdapter}=await import("../providers/foxy-adapter.ts"),calls=[];
  const client={models:{countTokens:async request=>{calls.push(['count',request]);return {totalTokens:10};},generateContent:async request=>{calls.push(['generate',request]);return {text:JSON.stringify({schemaVersion:'foxy-text-response-v1',status:'READY',title:'R',markdown:'Texto',references:[],warnings:[],missingInformation:[]}),candidates:[{finishReason:'STOP'}]};}}};
  const adapter=new GeminiFoxyTextAdapter({client,configuration:{model:'synthetic',maxInputTokens:100,maxOutputTokens:100,deadlineMs:10000}});
  const input={mode:'GENERAL',purpose:'CHAT',message:'Actual',curriculum:null,sources:[],documents:[],warnings:[],history:[pair(1)],signal:new AbortController().signal};
  await adapter.countTokens(input);await adapter.generate(input);
  const counted=JSON.stringify(calls[0][1].contents),generated=JSON.stringify(calls[1][1].contents);
  assert.ok(counted.includes('Pregunta 1'));assert.ok(generated.includes('Pregunta 1'));
  assert.match(counted,/history|conversation/i);assert.match(counted,/untrusted/i);
  const mutated={...input,history:[pair(1)]};await adapter.countTokens(mutated);mutated.history[0].user='Alterado';
  await assert.rejects(adapter.generate(mutated));assert.equal(calls.filter(c=>c[0]==='generate').length,1);
});
