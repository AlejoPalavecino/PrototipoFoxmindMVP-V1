import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/web/src/application/academic-client.ts';
test('editor transport is dedicated, memory-owned and does not change old call headers', async () => {
  const calls=[];
  const api=createClassroomClient({csrfToken:async()=> 'csrf',fetch:async(path,options)=> {calls.push({path,...options});return Response.json({});}});
  assert.equal(typeof api.attempt,'function');
  await api.attempt('/room/attempts/attempt/transfer',{revision:'2'});
  assert.equal(calls[0].headers['X-Attempt-Editor'],undefined);
  await api.attempt('/room/attempts/attempt/future',{revision:'3'},{token:'a'.repeat(43),epoch:'2'});
  assert.equal(calls[1].headers['X-Attempt-Editor'],'a'.repeat(43));
  assert.equal(calls[1].headers['X-Attempt-Epoch'],'2');
  assert.deepEqual(JSON.parse(calls[1].body),{revision:'3'});
  await api.call('/room/activities');
  assert.deepEqual(calls[2].headers,{});
  await api.call('/room/plan','POST',{revision:'1',operation:{action:'setTopicState',id:'11111111-1111-4111-8111-111111111111',status:'TAUGHT'}});
  assert.deepEqual(calls[3].headers,{'X-CSRF-Token':'csrf','Content-Type':'application/json'});
});
