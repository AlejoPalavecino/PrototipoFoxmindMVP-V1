import type { StartActivityGeneration } from '../../../../../../../src/core/domain/index.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import { inputHash } from './requests.ts';

function logicalInput(input: StartActivityGeneration): string {
  const { requestId: _requestId, revision: _revision, ...body } = input;
  return inputHash('logical-generation', '', null, { ...body, unitId: body.unitId.toLowerCase(),
    topicIds: body.topicIds.map(id => id.toLowerCase()).sort(), sourceIds: body.sourceIds.map(id => id.toLowerCase()).sort(),
    acknowledgedWarnings: [...body.acknowledgedWarnings].sort(), objective: body.objective.trim(),
    groupLevel: body.groupLevel.trim(), context: body.context.trim() });
}
export async function requireUnknownAcknowledgement(tx: Transaction, ownerId: string, classroomId: string, body: StartActivityGeneration,
  acknowledgement?: { predecessorId: string; possibleCharge: boolean }) {
  const unresolved = await tx.query<{ id: string; input_payload: StartActivityGeneration }>(`SELECT g.id,g.input_payload FROM activity_ai_generations g
    WHERE g.owner_id=$1::uuid AND g.classroom_id=$2::uuid AND g.error_code='PROVIDER_OUTCOME_UNKNOWN'
      AND NOT EXISTS(SELECT 1 FROM activity_ai_generations successor WHERE successor.predecessor_id=g.id)`, ownerId, classroomId);
  const logical = logicalInput(body);
  const matching = unresolved.filter(row => logicalInput(row.input_payload) === logical);
  if (matching.length && !(acknowledgement?.possibleCharge && matching.some(row => row.id === acknowledgement.predecessorId)))
    throw Object.assign(new Error('PROVIDER_OUTCOME_UNKNOWN'), { code: 'PROVIDER_OUTCOME_UNKNOWN' });
}
