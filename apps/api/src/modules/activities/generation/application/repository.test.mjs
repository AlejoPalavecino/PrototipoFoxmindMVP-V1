import test from 'node:test';
import assert from 'node:assert/strict';
import { createActivityGenerationPorts } from '../infrastructure/activity-ai/service-repository.ts';

// SQL contract for the repositories; no providers or real database are used.
const cases=[
  {
    "name": "listJobs",
    "sql": "SELECT * FROM activity_ai_generations WHERE classroom_id=$1::uuid AND owner_id=$2::uuid\n        ORDER BY created_at DESC,id DESC LIMIT 20",
    "input": {
      "classroomId": "classroomId",
      "ownerId": "ownerId"
    },
    "args": [
      "classroomId",
      "ownerId"
    ]
  },
  {
    "name": "insert",
    "sql": "INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,\n      request_hash,input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model,generation,predecessor_id,execution_profile)\n      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::\"ActivityType\",$6::bigint,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,\n        COALESCE((SELECT active_profiles->'activities'->>'promptVersion' FROM ai_execution_policy WHERE singleton),$15),\n        COALESCE((SELECT active_profiles->'activities'->>'model' FROM ai_execution_policy WHERE singleton),$12),$13,$14::uuid,\n        (SELECT active_profiles->'activities' FROM ai_execution_policy WHERE singleton)) RETURNING *",
    "input": {
      "id": "id",
      "ownerId": "ownerId",
      "classroomId": "classroomId",
      "unitId": "unitId",
      "type": "type",
      "revision": "revision",
      "hash": "hash",
      "body": "body",
      "curriculum": "curriculum",
      "sources": "sources",
      "version": "version",
      "model": "model",
      "generation": 0,
      "predecessorId": null
    },
    "args": [
      "id",
      "ownerId",
      "classroomId",
      "unitId",
      "type",
      "revision",
      "hash",
      "body",
      "curriculum",
      "sources",
      "version",
      "model",
      0,
      null,
      "activity-proposal-v3"
    ]
  }
];
for(const scenario of cases) test('activities '+scenario.name+' preserves SQL, profile and transaction',async()=>{
  const rows=[{id:'synthetic'}];
  const tx={query:async function(sql,...args){assert.equal(this,tx);assert.equal(sql,scenario.sql);assert.deepEqual(args,scenario.args);return rows;}};
  assert.equal(await createActivityGenerationPorts()[scenario.name](tx,scenario.input),rows);
});
