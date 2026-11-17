import test from 'node:test';
import assert from 'node:assert/strict';

import { ActivityAiService } from './service.ts';
test('activity start checks replay before revision and persists no duplicate job', async () => {
 const tx={sentinel:true}, room={revision:9n}, actor={id:'actor'}, row={id:'old'};
 const calls=[];
 const port={
  authorized:async(_options,_request,_id,_write,operation)=>operation(tx,room,actor),
  inputHash:()=> 'hash',
  replay:async(transaction,owner,requestId,hash)=>{assert.equal(transaction,tx);assert.equal(owner,'actor');assert.equal(hash,'hash');calls.push('replay');return 'old';},
  job:async(transaction)=>{assert.equal(transaction,tx);return row;},
  currentView:async(_options,transaction,_request,value)=>{assert.equal(transaction,tx);return value;},
  insert:async()=>{throw Error('must not insert');}
 };
 const body={requestId:'11111111-1111-4111-8111-111111111111',revision:'0',type:'ASSIGNMENT',unitId:'22222222-2222-4222-8222-222222222222',topicIds:['33333333-3333-4333-8333-333333333333'],sourceIds:[],counts:{assignment:1,development:0,singleChoice:0,multipleChoice:0},difficulty:'BASIC',durationMinutes:40,objective:'goal',groupLevel:'level',context:'context',acknowledgedWarnings:[]};
 const result=await new ActivityAiService({},port).start({},'room',body);
 assert.deepEqual(result,{created:false,view:row});assert.deepEqual(calls,['replay']);
});
