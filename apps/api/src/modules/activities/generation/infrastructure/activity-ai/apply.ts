import type { ActivityApplyPorts } from '../../application/apply-ports.ts';
import type { ActivityAiOptions, JobRow } from '../../application/ai-contracts.ts';
import type { Actor, Transaction } from '../../../../classrooms/public.ts';
import type { ApplyActivityGeneration } from '../../../../../../../../src/core/domain/activities/activity-generation.ts';
import { applyProposal as apply } from '../../application/apply.ts';
import { createActivityDraftInTransaction } from '../activity-draft.ts';
import { replay, recordRequest } from './requests.ts';
import { revalidate } from './source.ts';
export { proposalConstraints, applied } from '../../application/apply.ts';

export function createActivityApplyPorts(): ActivityApplyPorts { return {
  replay, recordRequest, revalidate, createDraft: createActivityDraftInTransaction,
  async advanceRevision(tx,input) { return tx.query<{ revision: bigint }>('UPDATE classrooms SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING revision', input.classroomId); },
  async markApplied(tx,input) { return tx.query<JobRow>(`UPDATE activity_ai_generations SET state='APPLIED',proposal=$2::jsonb,apply_request_id=$3::uuid,
    apply_input_hash=$4,applied_activity_id=$5::uuid,applied_revision=$6::bigint,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *`, input.id, input.proposal, input.requestId, input.hash, input.activityId, input.revision); },
}; }

export function applyProposal(options: ActivityAiOptions, tx: Transaction, request: unknown, row: JobRow, actor: Actor, revision: bigint, body: ApplyActivityGeneration, hash: string) {
  return apply(createActivityApplyPorts(), options, tx, request, row, actor, revision, body, hash);
}
