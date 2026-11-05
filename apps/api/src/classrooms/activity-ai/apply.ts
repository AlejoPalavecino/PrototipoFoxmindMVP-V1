import { parseActivityProposal, type ActivityGenerationApplied, type ApplyActivityGeneration } from '../../../../../src/core/domain/index.ts';
import { createActivityDraftInTransaction } from '../public/index.ts';
import type { Actor, Transaction } from '../contracts.ts';
import { fail } from '../policy.ts';
import { replay, recordRequest } from './requests.ts';
import { revalidate } from './source.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';

export function proposalConstraints(row: JobRow) {
  return { type: row.type, counts: row.input_payload.counts, sourceIds: row.input_payload.sourceIds,
    context: row.input_payload.context, pdfPageCounts: Object.fromEntries(row.source_report.filter(s => s.pageCount !== null).map(s => [s.sourceId, s.pageCount!])) };
}
export function applied(row: JobRow): ActivityGenerationApplied {
  return { generationId: row.id, activityId: row.applied_activity_id!, revision: String(row.applied_revision) };
}
export async function applyProposal(options: ActivityAiOptions, tx: Transaction, request: unknown, row: JobRow,
  actor: Actor, revision: bigint, body: ApplyActivityGeneration, hash: string) {
  const repeated = await replay(tx, actor.id, body.requestId, hash);
  if (repeated) {
    if (repeated !== row.id || row.state !== 'APPLIED') return fail('CONFLICT');
    return applied(row);
  }
  if (row.state !== 'READY' || String(revision) !== body.revision || !await revalidate(options, tx, request, row)) return fail('CONFLICT');
  const proposal = parseActivityProposal(body.proposal, proposalConstraints(row));
  const instructions = [proposal.instructions,
    ...proposal.assignmentPrompts.map((p, i) => `${i + 1}. ${p}`)].filter(Boolean).join('\n\n');
  const activityId = await createActivityDraftInTransaction(tx, { classroomId: row.classroom_id, type: row.type, now: actor.now,
    payload: { title: proposal.title, unitId: row.unit_id, topicId: row.input_payload.topicIds[0]!, topicIds: row.input_payload.topicIds,
      objective: proposal.objective, teacherComment: null, instructions, attachmentRequired: false, instructionFileIds: [], materialIds: row.input_payload.sourceIds.filter(s => s.startsWith('material:')).map(s => s.slice(9)),
      questions: proposal.questions, deadline: null, allowLate: false, evaluationRubric: proposal.evaluationRubric ?? [] } });
  const [updated] = await tx.query<{ revision: bigint }>('UPDATE classrooms SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING revision', row.classroom_id);
  const [result] = await tx.query<JobRow>(`UPDATE activity_ai_generations SET state='APPLIED',proposal=$2::jsonb,apply_request_id=$3::uuid,
    apply_input_hash=$4,applied_activity_id=$5::uuid,applied_revision=$6::bigint,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *`,
    row.id, JSON.stringify(proposal), body.requestId, hash, activityId, String(updated!.revision));
  await recordRequest(tx, actor.id, body.requestId, 'apply', hash, row.id);
  return applied(result!);
}
