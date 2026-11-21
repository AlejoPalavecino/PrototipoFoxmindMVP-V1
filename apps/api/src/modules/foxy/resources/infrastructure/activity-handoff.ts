import { createHash } from 'node:crypto';
import { parseFoxyActivityDraft, type FoxyActivityDraftReceipt } from '../../../../../../../src/core/domain/foxy/foxy-activity-draft.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { ActivityDraftWriterPort } from '../../../activities/public.ts';
import type { createFoxyResourceRepository } from './resource-repository.ts';
import type { FoxyActor } from '../../application/ports.ts';
import { foxyQuizActivityQuestions, foxyQuizFence, readFoxyQuiz } from '../../../../../../../src/core/domain/foxy/foxy-quiz.ts';
const fail = (code: string): never => { throw Object.assign(new Error(code), { code }); };

/** Owner lock from the Foxy UOW serializes resource edits and idempotent handoffs. */
export async function prepareFoxyActivity(tx: SqlTransaction, actor: FoxyActor, resourceId: string, input: unknown,
  resources: ReturnType<typeof createFoxyResourceRepository>, createActivityDraftInTransaction: ActivityDraftWriterPort) {
  let body: ReturnType<typeof parseFoxyActivityDraft>;
  try { body = parseFoxyActivityDraft(input); } catch { return fail('INVALID_INPUT'); }
  const source = await resources.get(tx, actor.id, resourceId);
  if (!source) return fail('NOT_FOUND');
  const [room] = await tx.query<{ revision: bigint; archived_at: Date | null }>(
    'SELECT revision,archived_at FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR UPDATE', body.classroomId, actor.id);
  if (!room) return fail('FORBIDDEN');
  if (room.archived_at) return fail('CONFLICT');
  const hash = createHash('sha256').update(JSON.stringify({ action: 'activity-draft', resourceId: source.id, ...body })).digest('hex');
  const [prior] = await tx.query<{ input_hash: string; result: FoxyActivityDraftReceipt }>(
    'SELECT input_hash,result FROM foxy_resource_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', actor.id, body.requestId);
  if (prior) { if (prior.input_hash !== hash) return fail('CONFLICT'); return prior.result; }
  if (source.revision !== body.resourceRevision || String(room.revision) !== body.classroomRevision) return fail('CONFLICT');
  const { activityKind, ...payload } = body.payload;
  const quiz = readFoxyQuiz(source.markdown);
  if ((activityKind === 'QUESTIONNAIRE') !== !!quiz || (!quiz && source.markdown.startsWith(foxyQuizFence))) return fail('INVALID_INPUT');
  const activityId = await createActivityDraftInTransaction(tx, { classroomId: body.classroomId, type: activityKind ?? 'ASSIGNMENT', now: actor.now,
    payload: { ...payload, topicId: payload.topicIds[0]!, attachmentRequired: false, instructionFileIds: [], materialIds: [],
      questions: quiz ? foxyQuizActivityQuestions(quiz) : [], deadline: null, allowLate: false } });
  const [updated] = await tx.query<{ revision: bigint }>('UPDATE classrooms SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING revision', body.classroomId);
  const result = { activityId, classroomId: body.classroomId, revision: String(updated!.revision) };
  await tx.query(`INSERT INTO foxy_resource_requests(owner_id,request_id,resource_id,input_hash,result)
    VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::jsonb)`, actor.id, body.requestId, source.id, hash, JSON.stringify(result));
  return result;
}
