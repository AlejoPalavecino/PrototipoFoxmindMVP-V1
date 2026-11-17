import type { ActivityApplyPorts } from './apply-ports.ts';
import { parseActivityProposal } from '../../../../../../../src/core/domain/activities/activity-proposal.ts';
import { type ActivityGenerationApplied, type ApplyActivityGeneration } from '../../../../../../../src/core/domain/activities/activity-generation.ts';
import type { Actor, Transaction } from '../../../classrooms/public.ts';
import { fail } from '../../../classrooms/public.ts';
import type { ActivityAiOptions, JobRow } from './ai-contracts.ts';

export function proposalConstraints(row: JobRow) {
  return { type: row.type, counts: row.input_payload.counts, sourceIds: row.input_payload.sourceIds,
    context: row.input_payload.context.trim() ? row.input_payload.context : row.input_payload.teacherBrief ?? '', pdfPageCounts: Object.fromEntries(row.source_report.filter(s => s.pageCount !== null).map(s => [s.sourceId, s.pageCount!])) };
}
export function applied(row: JobRow): ActivityGenerationApplied {
  return { generationId: row.id, activityId: row.applied_activity_id!, revision: String(row.applied_revision) };
}
export async function applyProposal(ports: ActivityApplyPorts, options: ActivityAiOptions, tx: Transaction, request: unknown, row: JobRow,
  actor: Actor, revision: bigint, body: ApplyActivityGeneration, hash: string) {
  const repeated = await ports.replay(tx, actor.id, body.requestId, hash);
  if (repeated) {
    if (repeated !== row.id || row.state !== 'APPLIED') return fail('CONFLICT');
    return applied(row);
  }
  if (row.state !== 'READY' || String(revision) !== body.revision
    || (row.input_payload.teacherBrief !== undefined && String(row.base_revision) !== body.revision) || !await ports.revalidate(options, tx, request, row)) return fail('CONFLICT');
  const proposal = parseActivityProposal(body.proposal, proposalConstraints(row));
  const instructions = [proposal.instructions,
    ...proposal.assignmentPrompts.map((p, i) => `${i + 1}. ${p}`)].filter(Boolean).join('\n\n');
  const topicIds = row.curriculum_snapshot.units ? row.curriculum_snapshot.topics.map(topic => topic.id) : row.input_payload.topicIds;
  const activityId = await ports.createDraft(tx, {
    classroomId: row.classroom_id,
    type: row.type,
    now: actor.now,
    payload: { title: proposal.title, unitId: row.unit_id, topicId: topicIds[0]!, topicIds, ...(row.curriculum_snapshot.units ? { unitIds: [] } : {}),
      teacherBrief: row.input_payload.teacherBrief ?? null,
      objective: proposal.objective, teacherComment: null, instructions, attachmentRequired: false, instructionFileIds: [], materialIds: row.input_payload.sourceIds.filter(s => s.startsWith('material:')).map(s => s.slice(9)),
      questions: proposal.questions, deadline: null, allowLate: false, evaluationRubric: proposal.evaluationRubric ?? [] }
  });
  const [updated] = await ports.advanceRevision(tx, { classroomId: row.classroom_id });
  const [result] = await ports.markApplied(tx, {
    id: row.id,
    proposal: JSON.stringify(proposal),
    requestId: body.requestId,
    hash: hash,
    activityId: activityId,
    revision: String(updated!.revision)
  });
  await ports.recordRequest(tx, actor.id, body.requestId, 'apply', hash, row.id);
  return applied(result!);
}
