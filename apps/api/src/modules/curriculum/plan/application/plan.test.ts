import test from 'node:test';
import assert from 'node:assert/strict';
import { PlanService } from './plan.ts';
import type { ClassroomAccess, Actor, Transaction, ClassroomRow } from '../../../classrooms/public.ts';
import type { TopicProgressRepository } from './ports.ts';
const roomId='11111111-1111-4111-8111-111111111111', topicId='22222222-2222-4222-8222-222222222222';
function fixture() {
 const tx={} as Transaction, actor={id:roomId} as Actor, events:string[]=[];
 const context: ClassroomAccess = {
  async run(_request,write,operation) { assert.equal(write,true); return operation(tx,actor); },
  async classroom(current, currentActor, id,write,teacher) { assert.equal(current,tx);assert.equal(currentActor,actor);assert.equal(id,roomId);assert.equal(write,true);assert.equal(teacher,true);events.push('authorize');return {revision:2n} as ClassroomRow & {revision:bigint}; },
  async advanceRevision(current,id,revision) { assert.equal(current,tx);assert.equal(id,roomId);assert.equal(revision,2n);events.push('revision');return {revision:'3'}; },
 };
 const topics:TopicProgressRepository={async lock(current,id,room) { assert.equal(current,tx);assert.equal(id,topicId);assert.equal(room,roomId);events.push('topic-lock');return true; },async resetNext(current) {assert.equal(current,tx);events.push('reset');},async set(current,_id,status) {assert.equal(current,tx);assert.equal(status,'NEXT');events.push('set');}};
 return {service:new PlanService(context,topics),events};
}
test('topic progress authorizes the classroom and updates the topic and revision in the received transaction',async()=>{
 const {service,events}=fixture();
 assert.deepEqual(await service.changePlan({},roomId,{revision:'2',operation:{action:'setTopicState',id:topicId,status:'NEXT'}}),{revision:'3'});
 assert.deepEqual(events,['authorize','topic-lock','reset','set','revision']);
});
test('stale classroom revision prevents topic locks and writes',async()=>{
 const {service,events}=fixture();
 await assert.rejects(service.changePlan({},roomId,{revision:'1',operation:{action:'setTopicState',id:topicId,status:'NEXT'}}),{code:'CONFLICT'});
 assert.deepEqual(events,['authorize']);
});
