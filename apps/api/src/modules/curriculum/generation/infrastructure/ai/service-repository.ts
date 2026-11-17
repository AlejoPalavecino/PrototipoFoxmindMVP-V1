import type { ClassroomGenerationPorts } from '../../application/generation-ports.ts';
import type { JobRow, DraftRow } from '../../application/ai-contracts.ts';
import { randomUUID } from 'node:crypto';
import { authorized, job, draftView } from './database.ts';
import { snapshot, revalidate, view } from './source.ts';
import { inputHash, replay, recordRequest } from './requests.ts';

export function createClassroomGenerationPorts(): ClassroomGenerationPorts { return {
  authorized, job, draftView, snapshot, revalidate, view, inputHash, replay, recordRequest, newId: randomUUID,
  async findLatest(tx, input) {
    return tx.query<JobRow>(`SELECT * FROM classroom_curriculum_extractions
        WHERE draft_id=$1::uuid AND file_id=$2::uuid AND source_digest=$3 AND schema_version=$4 AND prompt_version=$4
        ORDER BY generation DESC LIMIT 1`, input.draftId, input.fileId, input.digest, input.version);
  },
  async findSuccessor(tx, input) {
    return tx.query<JobRow>('SELECT * FROM classroom_curriculum_extractions WHERE retry_of=$1::uuid', input.extractionId);
  },
  async updateDraft(tx, input) {
    return tx.query<DraftRow>(`UPDATE classroom_drafts SET payload=$2::jsonb,
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *`, input.draftId, input.payload);
  },
  async markApplied(tx, input) {
    return tx.query<JobRow>(`UPDATE classroom_curriculum_extractions SET state='APPLIED',
        apply_request_id=$2::uuid,apply_input_hash=$3,applied_revision=$4::bigint,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING *`, input.extractionId, input.requestId, input.hash, input.revision);
  },
  async insert(tx, input) {
    return tx.query<JobRow>(`INSERT INTO classroom_curriculum_extractions
      (id,owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model,generation,retry_of,execution_profile)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6::bigint,$7,$7,
        COALESCE((SELECT active_profiles->'curriculum'->>'model' FROM ai_execution_policy WHERE singleton),$8),$9,$10::uuid,
        (SELECT active_profiles->'curriculum' FROM ai_execution_policy WHERE singleton)) RETURNING *`, input.id, input.ownerId, input.draftId, input.fileId, input.digest, input.revision, input.version, input.model, input.generation, input.previousId);
  },
}; }
