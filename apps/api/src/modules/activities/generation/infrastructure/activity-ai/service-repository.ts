import type { ActivityGenerationPorts } from '../../application/generation-ports.ts';
import type { JobRow } from '../../application/ai-contracts.ts';
import { randomUUID } from 'node:crypto';
import { authorized, job, view } from './database.ts';
import { curriculum, snapshots } from './source.ts';
import { inputHash, replay, recordRequest } from './requests.ts';
import { candidates } from './candidates.ts';
import { applyProposal } from './apply.ts';
import { currentView } from './current-view.ts';
import { requireUnknownAcknowledgement } from './unknown-start.ts';

export function createActivityGenerationPorts(): ActivityGenerationPorts { return {
  authorized, job, view, curriculum, snapshots, inputHash, replay, recordRequest, candidates, applyProposal, currentView, requireUnknownAcknowledgement, newId: randomUUID,
  async listJobs(tx, input) {
    return tx.query<JobRow>(`SELECT * FROM activity_ai_generations WHERE classroom_id=$1::uuid AND owner_id=$2::uuid
        ORDER BY created_at DESC,id DESC LIMIT 20`, input.classroomId, input.ownerId);
  },
  async insert(tx, input) {
    return tx.query<JobRow>(`INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,
      request_hash,input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model,generation,predecessor_id,execution_profile)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::"ActivityType",$6::bigint,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$11,
        COALESCE((SELECT active_profiles->'activities'->>'model' FROM ai_execution_policy WHERE singleton),$12),$13,$14::uuid,
        (SELECT active_profiles->'activities' FROM ai_execution_policy WHERE singleton)) RETURNING *`, input.id, input.ownerId, input.classroomId, input.unitId, input.type, input.revision, input.hash, input.body, input.curriculum, input.sources, input.version, input.model, input.generation, input.predecessorId);
  },
}; }
