import { randomUUID } from 'node:crypto';
import type { Transaction } from './contracts.ts';
import { activityPayload, type ActivityPayload, type ActivityType } from './activity-policy.ts';
import { replaceActivityContent } from './activity-content.ts';
import { validateActivityTopics, replaceActivityTopics } from './activity-topics.ts';
import { fail } from './policy.ts';

/** Caller owns the authorized classroom lock, revision and verified source access. */
export async function createActivityDraftInTransaction(tx: Transaction, input: {
  classroomId: string; type: ActivityType; payload: ActivityPayload; now: Date;
}) {
  const payload = activityPayload({ ...input.payload, title: input.payload.title ?? '',
    instructions: input.payload.instructions ?? '' }, input.type, false);
  // Generated proposals never attach arbitrary uploaded instructions or set delivery deadlines.
  if (payload.instructionFileIds.length || payload.deadline !== null) return fail('INVALID_INPUT');
  await validateActivityTopics(tx, input.classroomId, payload.unitId, payload.topicIds);
  const id = randomUUID();
  await tx.query(`INSERT INTO activities(id,updated_at,classroom_id,type,title,unit_id,topic_id,instructions_text,
    attachments_required,allow_late_submissions) VALUES($1::uuid,$2,$3::uuid,$4::"ActivityType",$5,$6::uuid,$7::uuid,$8,$9,$10) RETURNING id`,
    id, input.now, input.classroomId, input.type, payload.title, payload.unitId, payload.topicId,
    payload.instructions, payload.attachmentRequired, payload.allowLate);
  await replaceActivityTopics(tx, id, input.classroomId, payload.unitId, payload.topicIds);
  await replaceActivityContent(tx, { id, classroom_id: input.classroomId }, payload);
  return id;
}
