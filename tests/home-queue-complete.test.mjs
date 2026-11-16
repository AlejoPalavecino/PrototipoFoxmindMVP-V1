import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsModule} from './helpers/load-ts-module.mjs';
const {completeHomeQueue}=loadTsModule('apps/web/src/features/home/model/home-queue.ts');
const page=(ids,nextCursor=null)=>({status:'ready',items:ids.map(id=>({id})),nextCursor,totalItems:3});
test('Home completes all queue pages without a new pagination control',async()=>{
 const calls=[];const client={page:async q=>{calls.push(q);return{subjectId:'owner',module:'review',page:page(['b','c'])};}};
 const result=await completeHomeQueue(client,'review',page(['a','b'],'next'),'owner','UTC','asc');
 assert.deepEqual(result.items.map(i=>i.id),['a','b','c']);assert.equal(result.nextCursor,null);assert.equal(calls[0].cursor,'next');
});
test('Home never accepts queue pages from another subject or hides a failed remaining page',async()=>{
 await assert.rejects(completeHomeQueue({page:async()=>({subjectId:'other',module:'review',page:page(['x'])})},'review',page(['a'],'next'),'owner','UTC','asc'),{code:'FORBIDDEN'});
 await assert.rejects(completeHomeQueue({page:async()=>{throw Error('offline');}},'review',page(['a'],'next'),'owner','UTC','asc'),/offline/);
});
