import test from 'node:test';
import assert from 'node:assert/strict';
const ai={backend:'gemini-developer',model:'synthetic-model',apiKey:'synthetic-secret',dailyActorRequests:4,dailyGlobalRequests:8,maxInputTokens:70000,maxOutputTokens:5000,dailyBudgetUsd:2,inputUsdPerMillion:0.25,outputUsdPerMillion:1.5,deadlineMs:40000,maxConcurrency:3,maxDispatches:1,maxJobAgeMs:300000};
const env={FOXY_PRIVATE_ASSET_QUOTA_BYTES:'9007199254740993',AI_IMAGE_MAX_INPUT_TOKENS:'65536',AI_IMAGE_MAX_OUTPUT_TOKENS:'4096',AI_IMAGE_INPUT_USD_PER_MILLION:'0.25',AI_IMAGE_TEXT_OUTPUT_USD_PER_MILLION:'1.5',AI_IMAGE_OUTPUT_USD_PER_MILLION:'30',AI_INPUT_USD_PER_MILLION:'0.25',AI_OUTPUT_USD_PER_MILLION:'1.5'};
async function parser(){return (await import("../visual-configuration.ts")).readFoxyVisualConfiguration;}
test('visual host defaults off, rejects malformed flags, and requires enabled AI',async()=>{const read=await parser();assert.equal(read({},null),null);assert.equal(read({AI_IMAGE_ENABLED:'false',AI_DIAGRAM_ENABLED:'false'},ai),null);
 for(const values of [{AI_IMAGE_ENABLED:'1'},{AI_DIAGRAM_ENABLED:'TRUE'},{...env,AI_IMAGE_ENABLED:'true'}])assert.throws(()=>read(values,null));
});
test('image and diagram flags independently build frozen profiles and exact bigint quota',async()=>{const read=await parser();for(const kind of ['IMAGE','DIAGRAM']){const v=read({...env,[`AI_${kind}_ENABLED`]:'true'},ai),c=v.configuration;
 assert.equal(c.enabled[kind],true);assert.equal(c.enabled[kind==='IMAGE'?'DIAGRAM':'IMAGE'],false);assert.equal(c.privateQuotaBytes,9007199254740993n);assert.equal(c.maxConcurrency,3);assert.equal(c.maxJobAgeMs,300000);assert.equal(c.deadlineMs,180000);assert.equal(v.providerDeadlineMs,30000);assert.equal(c.profiles[kind==='IMAGE'?'DIAGRAM':'IMAGE'],null);
 const p=c.profiles[kind];assert.equal(p.maxInputTokens,65536);assert.equal(p.maxOutputTokens,4096);assert.equal(p.profileVersion,kind==='IMAGE'?'foxy-gemini-image-v5':'foxy-diagram-provider-v3');assert.equal(p.outputUsdPerMillion,kind==='IMAGE'?'30':'1.5');assert.ok(!JSON.stringify(v,(_k,value)=>typeof value==='bigint'?value.toString():value).includes('synthetic-secret'));
 }});
test('image inherits its own finite provider deadline and diagrams keep the shorter deadline',async()=>{
 const read=await parser(), enabled={...env,AI_IMAGE_ENABLED:'true',AI_DIAGRAM_ENABLED:'true'};
 for(const [requested,expected] of [[9000,9000],[60000,60000],[90000,90000],[120000,90000]]){
  const result=read(enabled,{...ai,deadlineMs:requested});
  assert.equal(result.imageProviderDeadlineMs,expected);
  assert.equal(result.providerDeadlineMs,Math.min(requested,30000));
  assert.equal(result.configuration.deadlineMs,180000);
 }
});
test('partial opt-in and invalid quota, caps or price fail closed without exposing values',async()=>{const read=await parser();const enabled={...env,AI_IMAGE_ENABLED:'true'};
 for(const bad of [{FOXY_PRIVATE_ASSET_QUOTA_BYTES:''},{FOXY_PRIVATE_ASSET_QUOTA_BYTES:'10485759'},{FOXY_PRIVATE_ASSET_QUOTA_BYTES:'9223372036854775808'},{AI_IMAGE_MAX_INPUT_TOKENS:'65537'},{AI_IMAGE_MAX_OUTPUT_TOKENS:'0'},{AI_IMAGE_OUTPUT_USD_PER_MILLION:''},{AI_IMAGE_OUTPUT_USD_PER_MILLION:'1e3'},{AI_IMAGE_INPUT_USD_PER_MILLION:'1.1234567'}])assert.throws(()=>read({...enabled,...bad},ai),e=>!String(e.message).includes('synthetic-secret'));
 assert.throws(()=>read(enabled,{...ai,maxJobAgeMs:179999}));
});
