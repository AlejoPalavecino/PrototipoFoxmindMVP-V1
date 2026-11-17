import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityApplyPorts } from '../infrastructure/activity-ai/apply.ts';

// Frozen SQL from the pre-migration service; no providers or real database are used.
const cases=[
  {
    "name": "advanceRevision",
    "sql": "UPDATE classrooms SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING revision",
    "input": {
      "classroomId": "classroomId"
    },
    "args": [
      "classroomId"
    ]
  },
  {
    "name": "markApplied",
    "sql": "UPDATE activity_ai_generations SET state='APPLIED',proposal=$2::jsonb,apply_request_id=$3::uuid,\n    apply_input_hash=$4,applied_activity_id=$5::uuid,applied_revision=$6::bigint,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *",
    "input": {
      "id": "id",
      "proposal": "proposal",
      "requestId": "requestId",
      "hash": "hash",
      "activityId": "activityId",
      "revision": "revision"
    },
    "args": [
      "id",
      "proposal",
      "requestId",
      "hash",
      "activityId",
      "revision"
    ]
  }
];
for(const scenario of cases) test('activities '+scenario.name+' preserves SQL, profile and transaction',async()=>{
  const rows=[{id:'synthetic'}];
  const tx={query:async function(sql,...args){assert.equal(this,tx);assert.equal(sql,scenario.sql);assert.deepEqual(args,scenario.args);return rows;}};
  assert.equal(await createActivityApplyPorts()[scenario.name](tx,scenario.input),rows);
});
