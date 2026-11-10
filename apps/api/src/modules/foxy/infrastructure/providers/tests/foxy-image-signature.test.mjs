import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeminiFoxyImageResponse as parse } from "../foxy-image-response.ts";
const png=Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64');
const image={inlineData:{mimeType:'image/png',data:png}};
const response=parts=>({candidates:[{finishReason:'STOP',content:{parts}}]});
test('accepts opaque signatures above the former 64 KiB limit',()=>{
 for (const length of [65537,1024*1024]) {
  const result=parse(response([{...image,thoughtSignature:'A'.repeat(length)}]));
  assert.deepEqual([...result.bytes],[137,80,78,71,13,10,26,10,1]);
 }
});
test('rejects non-string and cumulative signatures above 16 MiB',()=>{
 assert.throws(()=>parse(response([{...image,thoughtSignature:42}])),e=>e.code==='INVALID_AI_OUTPUT' && e.diagnosticReason==='PART_SHAPE');
 assert.throws(()=>parse(response([{text:'a',thoughtSignature:'A'.repeat(9*1024*1024)},{...image,thoughtSignature:'A'.repeat(8*1024*1024)}])),e=>e.code==='INVALID_AI_OUTPUT' && e.diagnosticReason==='SIGNATURE_LIMIT');
});
