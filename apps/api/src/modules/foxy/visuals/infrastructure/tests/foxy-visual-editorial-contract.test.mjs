import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';

test('editorial parser enforces revision, command identity and safe bounded text',async()=>{
 const {parseEditFoxyPrivateAsset}=await import('../../../../../../../../src/core/domain/foxy/asset-validation.ts');
 const input={expectedRevision:'0',requestId:randomUUID(),title:'Título',description:'Texto\neditable'};
 assert.equal(typeof parseEditFoxyPrivateAsset,'function');assert.deepEqual(parseEditFoxyPrivateAsset(input),input);
 for(const patch of [{title:''},{expectedRevision:'-1'},{expectedRevision:'01'},{requestId:'bad'},{title:'a\nb'},{title:'x'.repeat(201)},{description:'x'.repeat(12001)},{extra:1}])assert.throws(()=>parseEditFoxyPrivateAsset({...input,...patch}),e=>e.code==='INVALID_INPUT');
 assert.equal(parseEditFoxyPrivateAsset({...input,description:''}).description,'');
});
