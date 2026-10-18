import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { submissionReceipt } from '../.build/api/apps/api/src/classrooms/submission-receipt.js';
import { createClassroomsHandler } from '../.build/api/apps/api/src/classrooms/http.js';
const id='a1111111-1111-4111-8111-111111111111';
test('TP HTTP waits for exact complete JSON/admission and restricts routes/editor pairs/receipts',async()=>{
 const calls=[];const service=Object.fromEntries(['removeAttemptAttachment','submitPracticalAttempt','assignmentSubmissions','assignmentSubmission'].map(name=>[name,async(...args)=>{calls.push([name,...args.slice(1)]);return {ok:true};}]));
 const handler=createClassroomsHandler(service,{admit:async(req,write)=>{if(write&&req.headers['x-fixture-csrf']!=='valid')throw Error('deny');}});
 const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const root=`http://127.0.0.1:${server.address().port}/classrooms/${id}`;
 const headers={'content-type':'application/json','x-fixture-csrf':'valid','x-attempt-editor':'a'.repeat(43),'x-attempt-epoch':'2'};
 const post=(leaf,body,h=headers)=>fetch(root+`/attempts/${id}/${leaf}`,{method:'POST',headers:h,body:JSON.stringify(body)});
 try{
  assert.equal((await post('attachments-remove',{revision:'1',fileId:id})).status,200);assert.equal(calls.at(-1)[0],'removeAttemptAttachment');
  assert.equal((await post('submit-practical',{revision:'2',confirm:true})).status,200);assert.deepEqual(calls.at(-1).at(-1),{revision:'2',confirm:true});
  for(const path of [`/activities/${id}/submissions`,`/attempts/${id}/receipt`])assert.equal((await fetch(root+path)).status,200);
  const count=calls.length;
  for(const [leaf,body,h]of [['attachments-remove',{revision:'1',fileId:id,owner:id}],['submit-practical',{revision:'1',confirm:true,submittedAt:'2020-01-01'}],
   ['submit-practical',{revision:'1',confirm:true},{...headers,'x-attempt-editor':'bad'}],['submit-practical',{revision:'1',confirm:true},{'content-type':'application/json','x-fixture-csrf':'valid'}]])
   assert.equal((await post(leaf,body,h)).status,400);
  assert.equal((await post('submit-practical',{revision:'1',confirm:true},{...headers,'x-fixture-csrf':'invalid'})).status,403);
  assert.equal((await fetch(root+`/attempts/${id}/receipt?editor=no`)).status,400);
  assert.equal((await fetch(root+`/attempts/${id}/receipt`,{headers})).status,400);
  assert.equal(calls.length,count);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});


test('HTTP receipt is server-only, captures complete body rather than request start and cannot be changed by header/body time',async()=>{
 const handler=createClassroomsHandler({submitPracticalAttempt:async(req,_room,_attempt,body)=>({receivedAt:+submissionReceipt(req),body})},{admit:async()=>{}});
 const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const start=Date.now();let completed;
  const response=new Promise((resolve,reject)=>{
   const req=httpRequest(`http://127.0.0.1:${server.address().port}/classrooms/${id}/attempts/${id}/submit-practical`,{method:'POST',headers:{'content-type':'application/json','x-attempt-editor':'a'.repeat(43),'x-attempt-epoch':'1','x-submitted-at':'2000-01-01T00:00:00Z'}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks))}));});
   req.on('error',reject);req.write('{"revision":"1",');setTimeout(()=>{completed=Date.now();req.end('"confirm":true}');},75);
  });
  const result=await response;assert.equal(result.status,200);assert.ok(result.body.receivedAt>=completed);assert.ok(result.body.receivedAt-start>=70);
  assert.deepEqual(result.body.body,{revision:'1',confirm:true});
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
