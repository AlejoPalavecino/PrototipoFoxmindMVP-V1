import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
const id='a1111111-1111-4111-8111-111111111111';
test('participation proxy forwards exact new bodies/capabilities only on new attempt route and preserves old transport',async()=>{
  const calls=[];
  const upstream=createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);calls.push({path:req.url,headers:req.headers,body:Buffer.concat(chunks).toString()});res.setHeader('content-type','application/json');res.end('{}');});
  await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
  const web=createServer((req,res)=>void proxyClassroomRequest(req,res,`http://127.0.0.1:${upstream.address().port}`));await new Promise(r=>web.listen(0,'127.0.0.1',r));
  const prefix=`http://127.0.0.1:${web.address().port}/api/v1/classrooms/${id}`;
  const post=(path,body,headers={})=>fetch(prefix+path,{method:'POST',headers:{'content-type':'application/json','x-csrf-token':'csrf',...headers},body:JSON.stringify(body)});
  try{
    assert.equal((await fetch(prefix+`/activities/${id}/session`)).status,200);
    assert.equal((await fetch(prefix+`/activities/${id}/eligibility`)).status,200);
    assert.equal((await post(`/activities/${id}/start`,{})).status,200);
    const body={revision:'1',studentId:id,deadline:{local:'2030-01-01T18:00',offsetMinutes:0}};
    assert.equal((await post(`/activities/${id}/authorize-first`,body)).status,200);assert.equal(calls.at(-1).body,JSON.stringify(body));
    const headers={'x-attempt-editor':'a'.repeat(43),'x-attempt-epoch':'2'};
    assert.equal((await post(`/attempts/${id}/transfer`,{revision:'1'},headers)).status,200);
    assert.equal(calls.at(-1).headers['x-attempt-editor'],headers['x-attempt-editor']);assert.equal(calls.at(-1).headers['x-attempt-epoch'],'2');
    const count=calls.length;
    for(const [path,data,extra]of [[`/activities/${id}/start`,{owner:id}],
      [`/activities/${id}/authorize-first`,{...body,deadline:{...body.deadline,zone:'UTC'}}],
      [`/attempts/${id}/transfer`,{revision:'1'},{'x-attempt-editor':'bad','x-attempt-epoch':'2'}],
      [`/attempts/${id}/transfer`,{revision:'1'},{'x-attempt-epoch':'2'}],
      [`/activities/${id}/start`,{},headers]])assert.equal((await post(path,data,extra)).status,400);
    assert.equal(calls.length,count);
    assert.equal((await post(`/attempts/${id}/unknown`,{})).status,404);
    assert.equal((await fetch(prefix+`/attempts/${id}/transfer`)).status,405);
    assert.equal((await post('/activities',{revision:'1',operation:{action:'create',type:'ASSIGNMENT'}},headers)).status,200);
    assert.equal(calls.at(-1).headers['x-attempt-editor'],undefined,'Old routes never gain editor headers');
    assert.equal(calls.at(-1).headers['x-csrf-token'],'csrf');
  }finally{web.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(r=>web.close(r)),new Promise(r=>upstream.close(r))]);}
});
