import test from 'node:test';
import assert from 'node:assert/strict';
const png=Buffer.from([137,80,78,71,13,10,26,10,1,2,3]),jpeg=Buffer.from([255,216,255,224,0,2,255,217]);
const part=(bytes=png,mimeType='image/png')=>({inlineData:{mimeType,data:bytes.toString('base64')}});
const response=(parts=[part()],changes={})=>({candidates:[{finishReason:'STOP',content:{parts}}],...changes});
const parse=async value=>(await import("../foxy-image-response.ts")).parseGeminiFoxyImageResponse(value);
async function invalid(value){await assert.rejects(async()=>parse(value),e=>e?.code==='INVALID_AI_OUTPUT');}
test('one final PNG or JPEG succeeds, thought image and ancillary text are not surfaced',async()=>{
 for(const [bytes,mime] of [[png,'image/png'],[jpeg,'image/jpeg']]){
  const input=response([{text:'Ignored untrusted'}, {...part(),thought:true},part(bytes,mime)]),result=await parse(input);
  assert.equal(result.declaredMimeType,mime);assert.deepEqual(Buffer.from(result.bytes),bytes);assert.equal(result.usage,null);assert.deepEqual(Object.keys(result).sort(),['bytes','declaredMimeType','usage']);
  result.bytes[0]^=255;assert.equal((await parse(input)).bytes[0],bytes[0]);
 }
});
test('ambiguous candidates, safety refusals, tools, remote files and unsupported content fail closed',async()=>{
 const cases=[response([],{}),response([part(),part()]),{candidates:[]},{candidates:[response().candidates[0],response().candidates[0]]},
  {candidates:[{finishReason:'MAX_TOKENS',content:{parts:[part()]}}]},response([part()],{promptFeedback:{blockReason:'SAFETY'}}),
  response([{text:'Refusal'}]),response([{fileData:{mimeType:'image/png',fileUri:'https://invalid.example/image'}}]),
  response([part(),{functionCall:{name:'doSomething'}}]),response([{executableCode:{language:'PYTHON',code:'x'}}]),
  response([part(png,'image/svg+xml')]),response(Array.from({length:65},()=>({text:'x'}))),response([{text:'x'.repeat(65537)},part()])];
 for(const x of cases)await invalid(x);
});
test('only canonical standard base64 within bounds and matching raster signature is accepted',async()=>{
 for(const data of ['', 'a', 'AAAA_', 'AAAA-', ' iVBORw0KGgo=', 'iVBORw0KGgo=\n','data:image/png;base64,iVBORw0KGgo=', 'iVBORw0KGgo===','A'.repeat(13981020)])
  await invalid(response([{inlineData:{mimeType:'image/png',data}}]));
 await invalid(response([part(jpeg,'image/png')]));await invalid(response([part(png,'image/jpeg')]));
});
for(const size of [4194304,10485760])test(`canonical PNG payload of ${size} bytes parses without stack exhaustion`,async()=>{
 const bytes=Buffer.alloc(size);png.copy(bytes,0,0,8);const result=await parse(response([part(bytes)]));assert.equal(result.bytes.byteLength,size);assert.deepEqual(Buffer.from(result.bytes.subarray(0,8)),png.subarray(0,8));
});
test('malformed promptFeedback is rejected rather than silently ignored',async()=>{
 for(const promptFeedback of ['blocked',42,[],{blockReason:0}])await invalid(response([part()],{promptFeedback}));
});
test('usage counts total output including thoughts once; unreliable usage remains null',async()=>{
 const valid={promptTokenCount:10,candidatesTokenCount:5,thoughtsTokenCount:2,totalTokenCount:17};
 assert.deepEqual((await parse(response([part()],{usageMetadata:valid}))).usage,{inputTokens:10,outputTokens:7});
 for(const usageMetadata of [{promptTokenCount:10},{promptTokenCount:0,totalTokenCount:7},{promptTokenCount:10,totalTokenCount:10},
  {promptTokenCount:-1,totalTokenCount:4},{promptTokenCount:1,totalTokenCount:Number.MAX_SAFE_INTEGER+1},
  {...valid,candidatesTokenCount:99},{...valid,cachedContentTokenCount:1},{...valid,toolUsePromptTokenCount:1}])
  assert.equal((await parse(response([part()],{usageMetadata}))).usage,null);
});
