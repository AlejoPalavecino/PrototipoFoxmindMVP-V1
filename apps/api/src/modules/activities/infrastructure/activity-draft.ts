import { randomUUID } from 'node:crypto';
import type { Transaction } from '../../classrooms/public.ts';
import { activityPayload, type ActivityPayload, type ActivityType } from '../domain/activity-policy.ts';
import { replaceActivityContent } from './activity-content.ts';
import { resolveActivityTopics, replaceActivityTopics } from './activity-topics.ts';
import { fail } from '../../classrooms/public.ts';

/** Caller owns the authorized classroom lock, revision and verified source access. */
export async function createActivityDraftInTransaction(tx: Transaction, input: {
  classroomId: string; type: ActivityType; payload: ActivityPayload; now: Date;
}) {
  const payload = activityPayload({ ...input.payload, title: input.payload.title ?? '',
    instructions: input.payload.instructions ?? '' }, input.type, false);
  // Generated proposals never attach arbitrary uploaded instructions or set delivery deadlines.
  if (payload.instructionFileIds.length || payload.deadline !== null) return fail('INVALID_INPUT');
  const scope = await resolveActivityTopics(tx, input.classroomId, payload, false);
  const id = randomUUID();
  await tx.query(`INSERT INTO activities(id,updated_at,classroom_id,type,title,unit_id,topic_id,instructions_text,
    attachments_required,allow_late_submissions,evaluation_rubric,objective,teacher_comment,teacher_brief) VALUES($1::uuid,$2,$3::uuid,$4::"ActivityType",$5,$6::uuid,$7::uuid,$8,$9,$10,$11::jsonb,$12,$13,$14) RETURNING id`,
    id, input.now, input.classroomId, input.type, payload.title, scope.unitId, scope.topics[0]?.id ?? null,
    payload.instructions, payload.attachmentRequired, payload.allowLate, JSON.stringify(payload.evaluationRubric ?? []), payload.objective ?? null, payload.teacherComment ?? null, payload.teacherBrief ?? null);
  await replaceActivityTopics(tx, id, input.classroomId, scope.topics);
  await replaceActivityContent(tx, { id, classroom_id: input.classroomId }, payload);
  return id;
}
