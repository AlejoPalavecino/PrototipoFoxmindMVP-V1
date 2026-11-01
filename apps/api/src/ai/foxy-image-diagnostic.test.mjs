import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGeminiFoxyImageResponse as parse } from './foxy-image-response.ts';
const png=Buffer.from([137,80,78,71,13,10,26,10,1]).toString('base64');
const image={inlineData:{mimeType:'image/png',data:png}};
const response=parts=>({candidates:[{finishReason:'STOP',content:{parts}}]});
test('rejections expose only an allowlisted diagnostic reason and public code',()=>{
 const cases=[[null,'RESPONSE_SHAPE'],[{candidates:[]},'CANDIDATE_COUNT'],[response([{text:'private hostile text'}]),'MISSING_FINAL_IMAGE'],[response([image,image]),'MULTIPLE_FINAL_IMAGES'],[response([{inlineData:{mimeType:'image/svg+xml',data:png}}]),'MIME'],[response([{inlineData:{mimeType:'image/png',data:'malicious'}}]),'BASE64'],[response([{text:'secret',unknownPrivateField:'secret'}]),'PART_FIELDS']];
 for(const [value,reason] of cases){assert.throws(()=>parse(value),e=>{assert.equal(e.code,'INVALID_AI_OUTPUT');assert.equal(e.diagnosticReason,reason);assert.ok(!JSON.stringify(e).includes('secret'));return true;});}
});
test('valid response accepts missing usage and does not carry diagnostic details',()=>{const value=parse(response([image]));assert.equal(value.usage,null);assert.equal('diagnosticReason' in value,false);});
