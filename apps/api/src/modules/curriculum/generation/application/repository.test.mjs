import test from 'node:test';
import assert from 'node:assert/strict';
import { createClassroomGenerationPorts } from '../infrastructure/ai/service-repository.ts';

// Frozen SQL from the pre-migration service; no providers or real database are used.
const cases=[
  {
    "name": "findLatest",
    "sql": "SELECT * FROM classroom_curriculum_extractions\n        WHERE draft_id=$1::uuid AND file_id=$2::uuid AND source_digest=$3 AND schema_version=$4 AND prompt_version=$4\n        ORDER BY generation DESC LIMIT 1",
    "input": {
      "draftId": "draftId",
      "fileId": "fileId",
      "digest": "digest",
      "version": "version"
    },
    "args": [
      "draftId",
      "fileId",
      "digest",
      "version"
    ]
  },
  {
    "name": "findSuccessor",
    "sql": "SELECT * FROM classroom_curriculum_extractions WHERE retry_of=$1::uuid",
    "input": {
      "extractionId": "extractionId"
    },
    "args": [
      "extractionId"
    ]
  },
  {
    "name": "updateDraft",
    "sql": "UPDATE classroom_drafts SET payload=$2::jsonb,\n        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *",
    "input": {
      "draftId": "draftId",
      "payload": "payload"
    },
    "args": [
      "draftId",
      "payload"
    ]
  },
  {
    "name": "markApplied",
    "sql": "UPDATE classroom_curriculum_extractions SET state='APPLIED',\n        apply_request_id=$2::uuid,apply_input_hash=$3,applied_revision=$4::bigint,updated_at=clock_timestamp()\n        WHERE id=$1::uuid RETURNING *",
    "input": {
      "extractionId": "extractionId",
      "requestId": "requestId",
      "hash": "hash",
      "revision": "revision"
    },
    "args": [
      "extractionId",
      "requestId",
      "hash",
      "revision"
    ]
  },
  {
    "name": "insert",
    "sql": "INSERT INTO classroom_curriculum_extractions\n      (id,owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model,generation,retry_of,execution_profile)\n      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6::bigint,$7,$7,\n        COALESCE((SELECT active_profiles->'curriculum'->>'model' FROM ai_execution_policy WHERE singleton),$8),$9,$10::uuid,\n        (SELECT active_profiles->'curriculum' FROM ai_execution_policy WHERE singleton)) RETURNING *",
    "input": {
      "id": "id",
      "ownerId": "ownerId",
      "draftId": "draftId",
      "fileId": "fileId",
      "digest": "digest",
      "revision": "revision",
      "version": "version",
      "model": "model",
      "generation": 0,
      "previousId": null
    },
    "args": [
      "id",
      "ownerId",
      "draftId",
      "fileId",
      "digest",
      "revision",
      "version",
      "model",
      0,
      null
    ]
  }
];
for(const scenario of cases) test('curriculum '+scenario.name+' preserves SQL, profile and transaction',async()=>{
  const rows=[{id:'synthetic'}];
  const tx={query:async function(sql,...args){assert.equal(this,tx);assert.equal(sql,scenario.sql);assert.deepEqual(args,scenario.args);return rows;}};
  assert.equal(await createClassroomGenerationPorts()[scenario.name](tx,scenario.input),rows);
});
