import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
const id='a1111111-1111-4111-8111-111111111111';
test('participation HTTP routes require exact paths/methods/bodies/header pairs and actual ingress admission',async()=>{
  const calls=[],admitted=[];
  const names=['activitySession','startActivity','activityEligibility','authorizeFirstSubmission','transferAttemptEditor','listActivities','activityDetail'];
  const service=Object.fromEntries(names.map(name=>[name,async(...args)=>{calls.push([name,...args.slice(1)]);return {ok:true};}]));
  const handler=createClassroomsHandler(service,{admit:async(req,write)=>{admitted.push(write);if(write&&req.headers['x-fixture-csrf']!=='valid')throw Error('Denied');}});
  const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const prefix=`http://127.0.0.1:${server.address().port}/classrooms/${id}`;
  const post=(path,body,headers={})=>fetch(prefix+path,{method:'POST',headers:{'content-type':'application/json','x-fixture-csrf':'valid',...headers},body:JSON.stringify(body)});
  try{
    for(const leaf of ['session','eligibility'])assert.equal((await fetch(prefix+`/activities/${id}/${leaf}`)).status,200);
    assert.equal((await post(`/activities/${id}/start`,{})).status,200);assert.equal(calls.at(-1)[0],'startActivity');
    const body={revision:'1',studentId:id,deadline:{local:'2030-01-01T18:00'}};
    assert.equal((await post(`/activities/${id}/authorize-first`,body)).status,200);
    assert.equal((await post(`/attempts/${id}/transfer`,{revision:'0'})).status,200);
    const count=calls.length;
    for(const [path,data,headers] of [[`/activities/${id}/start`,{owner:id}],
      [`/activities/${id}/authorize-first`,{...body,attemptCount:3}],
      [`/attempts/${id}/transfer`,{revision:'0',epoch:'1'}],
      [`/attempts/${id}/transfer`,{revision:'0'},{'x-attempt-editor':'bad','x-attempt-epoch':'1'}],
      [`/attempts/${id}/transfer`,{revision:'0'},{'x-attempt-editor':'a'.repeat(43)}],
      [`/activities/not-id/start`,{}]])assert.equal((await post(path,data,headers)).status,400);
    assert.equal((await post(`/activities/${id}/start`,{},{'x-fixture-csrf':'invalid'})).status,403);
    assert.equal((await fetch(prefix+`/activities/${id}/session?secret=no`)).status,400);
    assert.equal((await fetch(prefix+`/activities/${id}/session`,{headers:{'x-attempt-editor':'a'.repeat(43),'x-attempt-epoch':'1'}})).status,400);
    assert.equal(calls.length,count);
    assert.equal((await fetch(prefix+'/activities')).status,200);
    assert.ok(admitted.includes(true)&&admitted.includes(false));
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
