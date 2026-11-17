import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { requestPayload, replayedGeneration } from './request-policy.ts';
import { inputHash, replay } from '../infrastructure/activity-ai/requests.ts';

test('persisted activities request serialization and SHA256 stay compatible', () => {
  const serialized="{\"body\":{\"a\":{\"x\":3,\"y\":2},\"list\":[{\"a\":5,\"z\":4}],\"z\":1},\"classroomId\":\"room\",\"id\":null,\"operation\":\"start\"}";
  assert.equal(requestPayload('start','room',null,{z:1,a:{y:2,x:3},list:[{z:4,a:5}]}), serialized);
  assert.equal(inputHash('start','room',null,{z:1,a:{y:2,x:3},list:[{z:4,a:5}]}),createHash('sha256').update(serialized).digest('hex'));
});
test('request identity rejects a changed payload and returns the original job only', () => {
  assert.equal(replayedGeneration(undefined,'hash'),null);
  assert.equal(replayedGeneration({input_hash:'hash',generation_id:'job'},'hash'),'job');
  assert.throws(()=>replayedGeneration({input_hash:'other',generation_id:'job'},'hash'),{code:'CONFLICT'});
});
test('activities replay preserves transaction and lock/query order', async () => {
  const calls=[];
  const tx={query: async function(sql,...args) {assert.equal(this,tx);calls.push({sql,args});return sql.includes('FROM ')?[{input_hash:'hash',generation_id:'job'}]:[];}};
  assert.equal(await replay(tx,'owner','request','hash'),'job');
  assert.equal(calls.length,1);assert.match(calls[0].sql,/FROM activity_ai_requests/);assert.deepEqual(calls[0].args,['owner','request']);
});
