import { participationFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomClient } from '../apps/web/src/application/transport/classroom-client.ts';
import {loadTsModule} from './helpers/load-ts-module.mjs';
import {hookView,descendants} from './agenda-ui-helpers.test.mjs';
import {useState} from 'react';
const id='a1111111-1111-4111-8111-111111111111';
test('lost response and failed refresh retain local practical text and require recovered CAS before review',async()=>{
 const {PracticalAttempt}=loadTsModule('apps/web/src/features/participation/practical/PracticalAttempt.tsx');let tick,serverRevision=0,serverText='',refreshes=0,mutations=0;
 let data={activity:{id,title:'Campo',attachmentRequired:false,zone:'UTC'},attempt:{id,status:'DRAFT',epoch:'1',revision:'0',attachments:[],practicalResponse:''},canTransfer:true};
 const api={attempt:async(path,body)=>{assert.ok(path.endsWith('/practical-response'));if(body.revision!==String(serverRevision))throw Error('CONFLICT');serverRevision++;serverText=body.text;mutations++;if(mutations===1)throw Error('ACK lost');return {revision:String(serverRevision),text:serverText};}};
 const refresh=async()=>{if(++refreshes===1)throw Error('refresh failed');data={...data,attempt:{...data.attempt,revision:String(serverRevision),practicalResponse:serverText}};tick(n=>n+1);};
 const view=hookView(()=>{const[,setTick]=useState(0);tick=setTick;return PracticalAttempt(participationFixtureProps('PracticalAttempt', {api,classroomId:id,data,editor:{token:'a'.repeat(43),epoch:'1'},refresh}));},{});
 const button=name=>descendants(view.tree,n=>n.type==='button'&&n.props.children===name)[0];
 try{await view.flush();descendants(view.tree,n=>n.type==='textarea')[0].props.onChange({target:{value:'Texto local\n😀'}});await view.flush();
  button('Guardar borrador').props.onClick();await view.flush();assert.equal(descendants(view.tree,n=>n.type==='textarea')[0].props.value,'Texto local\n😀');assert.equal(descendants(view.tree,n=>n.type?.name==='Dialog').length,0);
  button('Guardar borrador').props.onClick();await view.flush();assert.equal(mutations,1);assert.equal(data.attempt.revision,'1');
  button('Guardar borrador').props.onClick();await view.flush();assert.equal(serverText,'Texto local\n😀');assert.equal(data.attempt.revision,'2');
  button('Revisar entrega').props.onClick();await view.flush();assert.equal(descendants(view.tree,n=>n.type?.name==='Dialog').length,1);assert.equal(mutations,2);
 }finally{view.close();}
});
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
