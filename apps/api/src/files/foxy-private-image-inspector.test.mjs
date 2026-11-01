import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {EventEmitter} from 'node:events';
import sharp from 'sharp';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const image=async(format='png',width=16,height=12)=>sharp({create:{width,height,channels:3,background:'#357a62'}})[format]().toBuffer();
async function inspector(options){const api=await import('./foxy-private-image-inspector.ts');assert.equal(typeof api.createFoxyPrivateImageInspector,'function');return api.createFoxyPrivateImageInspector(options);}
const inspect=async(bytes,options)=> (await inspector(options)).inspect(bytes,new AbortController().signal);
const rejected=async bytes=>assert.rejects(()=>inspect(bytes),e=>e?.code==='FILE_REJECTED');
function pngChunk(type,data){
 const name=Buffer.from(type),chunk=Buffer.alloc(12+data.length);chunk.writeUInt32BE(data.length,0);name.copy(chunk,4);data.copy(chunk,8);
 let crc=0xffffffff;for(const value of Buffer.concat([name,data])){crc^=value;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
 chunk.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);return chunk;
}
test('PNG and JPEG inspection derives MIME, dimensions, size and digest without exposing bytes',async()=>{
 for(const format of ['png','jpeg']){const input=await image(format),before=Buffer.from(input),result=await inspect(input);
  assert.equal(result.mimeType,`image/${format}`);assert.equal(result.width,16);assert.equal(result.height,12);assert.equal(result.sizeBytes,before.length);assert.equal(result.digest,sha(before));
  assert.deepEqual(Object.keys(result).sort(),['digest','height','mimeType','sizeBytes','width']);
 }
});
test('accepts real progressive JPEG and interlaced PNG with unchanged dimensions and digest',async()=>{
 for(const format of ['jpeg','png']){
  const source=sharp({create:{width:32,height:24,channels:3,background:'#614a90'}}),bytes=await source[format]({progressive:true}).toBuffer();
  const metadata=await sharp(bytes).metadata();assert.equal(metadata.isProgressive,true,`${format} fixture must be progressive`);
  const result=await inspect(bytes);assert.equal(result.mimeType,`image/${format}`);assert.equal(result.width,32);assert.equal(result.height,24);assert.equal(result.digest,sha(bytes));
 }
});
test('rejects malformed, unsupported, oversized and pixel-limit images',async()=>{
 for(const bytes of [Buffer.alloc(0),Buffer.alloc(10485761)])await assert.rejects(()=>inspect(bytes),e=>e?.code==='INVALID_INPUT');
 for(const bytes of [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),Buffer.from('GIF89a'),await image('png',2001,2000),await image('png',4097,1)])await rejected(bytes);
 const legal=await inspect(await image('png',2000,2000));assert.equal(legal.width*legal.height,4000000);
});
test('rejects APNG animation chunks even when a still frame can be decoded',async()=>{
 const png=await image(),actl=Buffer.alloc(8);actl.writeUInt32BE(2,0);
 await rejected(Buffer.concat([png.subarray(0,33),pngChunk('acTL',actl),png.subarray(33)]));
 await rejected(Buffer.concat([png,Buffer.from('trailing')]));await rejected(png.subarray(0,png.length-5));
});
test('rejects JPEG with another image or trailing data after EOI',async()=>{
 const jpeg=await image('jpeg');await rejected(Buffer.concat([jpeg,jpeg]));await rejected(Buffer.concat([jpeg,Buffer.from('trailing')]));
 const mpf=Buffer.from([0xff,0xe2,0x00,0x08,0x4d,0x50,0x46,0x00,0x00,0x00]);await rejected(Buffer.concat([jpeg.subarray(0,2),mpf,jpeg.subarray(2)]));
});
test('accepts a structurally valid PNG exactly at the byte limit, rejects one byte more',async()=>{
 const png=await image(),max=10485760,padding=Buffer.alloc(max-png.length-12),chunk=pngChunk('npAg',padding);
 const exact=Buffer.concat([png.subarray(0,png.length-12),chunk,png.subarray(png.length-12)]);assert.equal(exact.length,max);
 const facts=await inspect(exact);assert.equal(facts.sizeBytes,max);assert.equal(facts.digest,sha(exact));
 await assert.rejects(()=>inspect(Buffer.concat([exact,Buffer.of(0)])),e=>e?.code==='INVALID_INPUT');
});
test('worker metadata must agree with the original bytes even when digest and size match',async()=>{
 const bytes=await image();
 for(const changes of [{width:17},{height:13},{mimeType:'image/jpeg'}]){
  class FakeWorker extends EventEmitter{postMessage(){queueMicrotask(()=>this.emit('message',{ok:true,result:{mimeType:'image/png',width:16,height:12,sizeBytes:bytes.length,digest:sha(bytes),...changes}}))}terminate(){return Promise.resolve(0)}}
  const instance=await inspector({workerFactory:()=>new FakeWorker(),timeoutMs:1000});
  await assert.rejects(()=>instance.inspect(bytes,new AbortController().signal),e=>e?.code==='SERVICE_UNAVAILABLE');
 }
});
test('pre-aborted input never starts a worker and abort during inspection drains it',async()=>{
 let created=0,worker;class FakeWorker extends EventEmitter{postMessage(){} terminate(){this.stopped=true;return Promise.resolve(0);}}
 const instance=await inspector({workerFactory:()=>{created++;return worker=new FakeWorker()},timeoutMs:1000});const old=new AbortController();old.abort();
 await assert.rejects(()=>instance.inspect(Buffer.from([1]),old.signal));assert.equal(created,0);
 const controller=new AbortController(),reason=new Error('synthetic-abort'),pending=instance.inspect(await image(),controller.signal);await Promise.resolve();controller.abort(reason);await assert.rejects(()=>pending,e=>e===reason);assert.equal(worker.stopped,true);
});
test('caller mutation after inspect starts cannot change bytes dispatched to the worker',async()=>{
 let worker;class FakeWorker extends EventEmitter{postMessage(value){this.sent=structuredClone(value)}terminate(){return Promise.resolve(0)}}
 const instance=await inspector({workerFactory:()=>worker=new FakeWorker(),timeoutMs:1000}),source=await image(),expected=Buffer.from(source),controller=new AbortController();
 const pending=instance.inspect(source,controller.signal);source.fill(0);await Promise.resolve();
 assert.ok(worker?.sent);assert.deepEqual(Buffer.from(worker.sent.bytes),expected);controller.abort();await assert.rejects(()=>pending);
});
test('worker timeout, failures and malformed result are sanitized and drained',async()=>{
 const payload=await image();
 for(const cause of ['timeout','error','bad-result','factory','post','terminate']){
  let stopped=0;class FakeWorker extends EventEmitter {postMessage(){if(cause==='post')throw Error('private-native-detail');if(cause==='error')queueMicrotask(()=>this.emit('error',Error('private-native-detail')));if(cause==='bad-result')queueMicrotask(()=>this.emit('message',{ok:true,result:{mimeType:'image/png',width:16,height:12,digest:'forged'}}));}terminate(){stopped++;if(cause==='terminate')return Promise.reject(Error('private-native-detail'));return Promise.resolve(0);}}
  const instance=await inspector({timeoutMs:10,workerFactory:()=>{if(cause==='factory')throw Error('private-native-detail');return new FakeWorker();}});
  await assert.rejects(()=>instance.inspect(payload,new AbortController().signal),error=>error?.code==='SERVICE_UNAVAILABLE'&&!String(error).includes('private-native-detail'));
  assert.equal(stopped,cause==='factory'?0:1,cause);
 }
});
test('invalid timeout and malformed invocation are rejected',async()=>{
 for(const timeoutMs of [0,-1,15001,NaN,1.5])await assert.rejects(async()=>{const instance=await inspector({timeoutMs});await instance.inspect(await image(),new AbortController().signal)},e=>e?.code==='INVALID_INPUT');
 const instance=await inspector();await assert.rejects(()=>instance.inspect('not bytes',new AbortController().signal),e=>e?.code==='INVALID_INPUT');
 await assert.rejects(()=>instance.inspect(Buffer.from([1]),null),e=>e?.code==='INVALID_INPUT');
});
