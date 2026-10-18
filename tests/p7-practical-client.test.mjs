import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/classrooms-ui/api.ts';
const id='a1111111-1111-4111-8111-111111111111';
test('attachment client uses actual reservation and binary transport with fresh CSRF and dedicated editor headers', async()=>{
 const calls=[];let csrf=0;
 const api=createClassroomClient({csrfToken:async()=>String(++csrf),fetch:async(path,options)=>{calls.push({path,...options});return Response.json({id,ready:calls.length===2});}});
 assert.equal(typeof api.uploadAttachment,'function');
 const editor={token:'a'.repeat(43),epoch:'1'},file=new File(['attachment'],'work.pdf');
 assert.equal((await api.uploadAttachment(id,id,file,editor)).ready,true);
 assert.deepEqual(JSON.parse(calls[0].body),{scope:{kind:'classroom',id},purpose:'attachment',targetId:id,name:file.name,bytes:file.size});
 assert.equal(calls[1].path,`/files/${id}/content`);assert.equal(calls[1].body,file);
 for(const call of calls){assert.equal(call.headers['X-Attempt-Editor'],editor.token);assert.equal(call.headers['X-Attempt-Epoch'],'1');assert.equal(call.credentials,'same-origin');}
 assert.notEqual(calls[0].headers['X-CSRF-Token'],calls[1].headers['X-CSRF-Token']);
 await api.call('/room/plan','POST',{revision:'1',operation:{action:'old'}});assert.equal(calls.at(-1).headers['X-Attempt-Editor'],undefined);
});
