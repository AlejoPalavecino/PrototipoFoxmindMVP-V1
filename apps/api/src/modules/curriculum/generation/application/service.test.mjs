import test from 'node:test';
import assert from 'node:assert/strict';

import { ClassroomAiService } from './service.ts';
test('curriculum start replays existing source before stale revision without insertion', async () => {
 const tx={sentinel:true}, current={revision:9n}, row={id:'old'};
 const options={configuration:{model:'synthetic'}};
 const calls=[];
 const port={
  authorized:async(_options,_request,_id,_write,operation)=>operation(tx,current),
  snapshot:async(...args)=>{assert.equal(args[1],tx);calls.push('snapshot');return {fileId:'f',digest:'d'};},
  findLatest:async(transaction,input)=>{assert.equal(transaction,tx);assert.equal(input.version,'study-plan-v1');calls.push('latest');return [row];},
  view:value=>value,
  insert:async()=>{throw Error('must not insert');}
 };
 const service=new ClassroomAiService(options,port);
 const result=await service.start({},'d',{revision:'0',planFileId:'11111111-1111-4111-8111-111111111111'});
 assert.deepEqual(result,{created:false,view:row});assert.deepEqual(calls,['snapshot','latest']);
});
