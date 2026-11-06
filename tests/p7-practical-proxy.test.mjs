import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/lib/classroom-proxy.ts';
import { proxyFileRequest } from '../apps/web/src/lib/file-proxy.ts';
const id='a1111111-1111-4111-8111-111111111111',editor={'x-attempt-editor':'a'.repeat(43),'x-attempt-epoch':'2'};
test('strict TP proxies forward editor only at exact mutation/file ingress and preserve previous payloads',async()=>{
 const calls=[];const upstream=createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);calls.push({url:req.url,headers:req.headers,body:Buffer.concat(chunks).toString()});res.setHeader('content-type','application/json');res.end('{}');});await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const target=`http://127.0.0.1:${upstream.address().port}`;
 const web=createServer((req,res)=>void(req.url.startsWith('/api/v1/files')?proxyFileRequest:proxyClassroomRequest)(req,res,target));await new Promise(r=>web.listen(0,'127.0.0.1',r));
 const root=`http://127.0.0.1:${web.address().port}/api/v1`;
 const post=(path,body,h=editor)=>fetch(root+path,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':'csrf',...h},body:JSON.stringify(body)});
 try{
  for(const [leaf,body]of [['attachments-remove',{revision:'1',fileId:id}],['submit-practical',{revision:'1',confirm:true}],['practical-response',{revision:'1',text:'Respuesta\n😀'}]]){
   assert.equal((await post(`/classrooms/${id}/attempts/${id}/${leaf}`,body)).status,200);assert.equal(calls.at(-1).body,JSON.stringify(body));assert.equal(calls.at(-1).headers['x-attempt-editor'],editor['x-attempt-editor']);
  }
  const metadata={scope:{kind:'classroom',id},purpose:'attachment',targetId:id,name:'work.pdf',bytes:3};
  assert.equal((await post('/files',metadata)).status,200);assert.equal(calls.at(-1).body,JSON.stringify(metadata));assert.equal(calls.at(-1).headers['x-attempt-epoch'],'2');
  assert.equal((await fetch(root+`/files/${id}/content`,{method:'PUT',headers:{...editor,'content-type':'application/octet-stream'},body:Buffer.from('pdf')})).status,200);assert.equal(calls.at(-1).headers['x-attempt-editor'],editor['x-attempt-editor']);
  const count=calls.length;
  for(const [path,body,h]of [[`/classrooms/${id}/attempts/${id}/submit-practical`,{revision:'1',confirm:false}],
   [`/classrooms/${id}/attempts/${id}/submit-practical`,{revision:'1',confirm:true},{}],
   [`/classrooms/${id}/attempts/${id}/submit-practical`,{revision:'1',confirm:true},{...editor,'x-attempt-epoch':'bad'}],
   [`/classrooms/${id}/attempts/${id}/attachments-remove`,{revision:'1',fileId:'not-a-uuid'}],
   ['/files',{...metadata,purpose:'material'}],['/files?targetId=no',metadata]])assert.equal((await post(path,body,h)).status,400);
  assert.equal((await fetch(root+`/files/${id}`,{headers:editor})).status,400);
  assert.equal((await fetch(root+`/classrooms/${id}/attempts/${id}/receipt`,{headers:editor})).status,400);
  assert.equal(calls.length,count);
  const prior={scope:{kind:'classroom',id},purpose:'material',name:'old.pdf',bytes:3};assert.equal((await post('/files',prior,{})).status,200);assert.equal(calls.at(-1).body,JSON.stringify(prior));assert.equal(calls.at(-1).headers['x-attempt-editor'],undefined);
  assert.equal((await post(`/classrooms/${id}/plan`,{revision:'1',operation:{action:'setTopicState',id:'11111111-1111-4111-8111-111111111111',status:'TAUGHT'}},editor)).status,200);assert.equal(calls.at(-1).headers['x-attempt-editor'],undefined);
 }finally{web.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(r=>web.close(r)),new Promise(r=>upstream.close(r))]);}
});
