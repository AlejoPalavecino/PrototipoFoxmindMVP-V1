import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

const config={backend:'gemini-developer',apiKey:'synthetic-not-secret',model:'synthetic-model',maxInputTokens:1000,maxOutputTokens:100,
  deadlineMs:12000,maxConcurrency:1,maxJobAgeMs:300000,dailyActorRequests:5,dailyGlobalRequests:20,inputUsdPerMillion:2,outputUsdPerMillion:3,dailyBudgetUsd:1,maxDispatches:1};

test('production factory constructs Gemini SDK with a single attempt and no network calls', async () => {
  const construction=[], calls=[];
  class GoogleGenAI { constructor(options) { construction.push(options); this.models={countTokens:async()=>{calls.push('count');return {totalTokens:1};},
    generateContent:async()=>{calls.push('generate');throw Error('unexpected');}}; } }
  const moduleMock=mock.module('@google/genai',{namedExports:{GoogleGenAI}});
  try {
    const api=await import("../foxy-adapter.ts"); assert.equal(typeof api.createGeminiFoxyTextAdapter,'function');
    const adapter=api.createGeminiFoxyTextAdapter(config);
    assert.equal(construction.length,1); assert.equal(construction[0].apiKey,config.apiKey); assert.equal(construction[0].vertexai,false);
    assert.equal(construction[0].httpOptions.timeout,config.deadlineMs); assert.equal(construction[0].httpOptions.retryOptions.attempts,1);
    assert.deepEqual(calls,[]); assert.equal(typeof adapter.countTokens,'function'); assert.equal(typeof adapter.generate,'function');
    const input={mode:'GENERAL',purpose:'CHAT',message:'Hola',curriculum:null,sources:[],documents:[],warnings:[],signal:new AbortController().signal};
    await adapter.countTokens(input); assert.deepEqual(calls,['count']);
  } finally { moduleMock.restore(); }
});
