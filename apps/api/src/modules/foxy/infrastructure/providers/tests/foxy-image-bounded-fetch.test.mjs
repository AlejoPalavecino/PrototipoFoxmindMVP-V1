import test from 'node:test';
import assert from 'node:assert/strict';
import {GoogleGenAI} from '@google/genai';
const cap=16777216;
async function wrap(base){return (await import("../foxy-image-bounded-fetch.ts")).createFoxyImageBoundedFetch(base);}
function streaming(chunks,{headers={},status=200,holdOpen=false}={}){
 let index=0,cancelled=false;const body=new ReadableStream({pull(controller){if(index===chunks.length){if(!holdOpen)controller.close();}else controller.enqueue(chunks[index++]);},cancel(){cancelled=true;}});
 return {response:new Response(body,{status,headers}),cancelled:()=>cancelled};
}
test('preserves status and headers and returns exact bounded streamed body without retry',async()=>{
 let calls=0;const original=streaming([Buffer.from('uno'),Buffer.from(' dos')],{status:429,headers:{'retry-after':'4'}}),fetcher=await wrap(async()=>{calls++;return original.response;});
 const response=await fetcher('https://synthetic.invalid/');assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'4');assert.equal(await response.text(),'uno dos');assert.equal(calls,1);
});
test('redirects are not followed automatically',async()=>{
 let calls=0,redirect;const fetcher=await wrap(async(input,init)=>{calls++;redirect=init?.redirect??(input instanceof Request?input.redirect:undefined);return new Response(null,{status:302,headers:{location:'https://other.invalid/'}});});
 const response=await fetcher('https://synthetic.invalid/');assert.equal(response.status,302);assert.ok(['error','manual'].includes(redirect));assert.equal(calls,1);
});
test('reads actual byte count with absent, false and oversized content-length',async()=>{
 for(const headers of [{},{'content-length':'1'},{'content-length':String(cap+1)}]){
  const source=streaming([Buffer.alloc(cap),Buffer.of(1)],{headers,holdOpen:true});let calls=0;const fetcher=await wrap(async()=>{calls++;return source.response;});
  await assert.rejects(()=>fetcher('https://synthetic.invalid/'));assert.equal(calls,1);assert.equal(source.cancelled(),true);
 }
});
test('exact limit succeeds even when Content-Length understates it',async()=>{
 const source=streaming([Buffer.alloc(cap)],{headers:{'content-length':'1'}}),result=await (await wrap(async()=>source.response))('https://synthetic.invalid/');
 assert.equal((await result.arrayBuffer()).byteLength,cap);
});
test('aborting a stalled stream cancels it and rejects without a second request',async()=>{
 let calls=0,cancelled=false;const source=new ReadableStream({pull(){return new Promise(()=>{});},cancel(){cancelled=true;}}),controller=new AbortController(),fetcher=await wrap(async()=>{calls++;return new Response(source)});
 const pending=fetcher('https://synthetic.invalid/',{signal:controller.signal});await Promise.resolve();controller.abort();
 await assert.rejects(()=>pending);assert.equal(cancelled,true);assert.equal(calls,1);
});
test('pre-aborted request never invokes the underlying fetch',async()=>{
 let calls=0;const controller=new AbortController();controller.abort();const fetcher=await wrap(async()=>{calls++;return new Response('unexpected')});
 await assert.rejects(()=>fetcher('https://synthetic.invalid/',{signal:controller.signal}));assert.equal(calls,0);
});
test('installed SDK generateContent reaches the bounded synthetic fetch seam',async()=>{
 let calls=0;const payload=JSON.stringify({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:'synthetic'}]}}]});
 const fetcher=await wrap(async()=>{calls++;return new Response(payload,{headers:{'content-type':'application/json'}})});
 const sdk=new GoogleGenAI({apiKey:'synthetic-only',httpOptions:{fetch:fetcher,retryOptions:{attempts:1}}});
 const result=await sdk.models.generateContent({model:'synthetic-model',contents:'synthetic'});assert.equal(calls,1);assert.equal(result.candidates[0].finishReason,'STOP');
});
test('installed SDK cannot parse an oversized synthetic stream before the fetch cap',async()=>{
 let calls=0;const source=streaming([Buffer.alloc(cap),Buffer.of(1)],{holdOpen:true}),fetcher=await wrap(async()=>{calls++;return source.response});
 const sdk=new GoogleGenAI({apiKey:'synthetic-only',httpOptions:{fetch:fetcher,retryOptions:{attempts:1}}});
 await assert.rejects(()=>sdk.models.generateContent({model:'synthetic-model',contents:'synthetic'}));assert.equal(calls,1);assert.equal(source.cancelled(),true);
});
