import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { requestPayload, replayedExtraction } from './request-policy.ts';
import { inputHash, replay } from '../infrastructure/ai/requests.ts';

test('persisted curriculum request serialization and SHA256 stay compatible', () => {
  const serialized="[\"retry\",\"draft\",\"job\",{\"revision\":\"2\",\"requestId\":\"request\"}]";
  assert.equal(requestPayload('retry','draft','job',{revision:'2',requestId:'request'}), serialized);
  assert.equal(inputHash('retry','draft','job',{revision:'2',requestId:'request'}),createHash('sha256').update(serialized).digest('hex'));
});
test('request identity rejects a changed payload and returns the original job only', () => {
  assert.equal(replayedExtraction(undefined,'hash'),null);
  assert.equal(replayedExtraction({input_hash:'hash',extraction_id:'job'},'hash'),'job');
  assert.throws(()=>replayedExtraction({input_hash:'other',extraction_id:'job'},'hash'),{code:'CONFLICT'});
});
test('curriculum replay preserves transaction and lock/query order', async () => {
  const calls=[];
  const tx={query: async function(sql,...args) {assert.equal(this,tx);calls.push({sql,args});return sql.includes('FROM ')?[{input_hash:'hash',extraction_id:'job'}]:[];}};
  assert.equal(await replay(tx,'owner','request','hash'),'job');
  assert.match(calls[0].sql,/pg_advisory_xact_lock/);assert.deepEqual(calls[0].args,['owner:request']);assert.match(calls[1].sql,/FROM classroom_ai_requests/);assert.deepEqual(calls[1].args,['owner','request']);
});
